// script.js - CanellaHub com SSO, recuperação de senha e nome de usuário

document.addEventListener('DOMContentLoaded', () => {
    // --- VERIFICAR SE CONFIG FOI CARREGADO ---
    if (!window.CanellaConfig) {
        console.error('Configuração não carregada! Certifique-se de incluir config.js antes deste script.');
        return;
    }

    const { api, apps, security, ui } = window.CanellaConfig;
    const logger = window.CanellaLogger;
    const storage = window.CanellaStorage;
    const { getApiUrl, isValidSsoToken } = window.CanellaUtils;

    // --- CONSTANTES ---
    const STORAGE_KEYS = {
        IS_AUTHENTICATED: 'isHubAuthenticated',
        USER_NAME: 'hubUserName',
        SSO_TOKEN: 'hubSsoToken',
        LOGIN_TIMESTAMP: 'hubLoginTimestamp',
        REDIRECT_URL: 'hubRedirectUrl'
    };

    // --- ELEMENTOS DA PÁGINA ---
    const elements = {
        // Login
        loginContainer: document.getElementById('login-container'),
        hubContent: document.getElementById('hub-content'),
        loginForm: document.getElementById('login-form'),
        loginError: document.getElementById('login-error'),
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        welcomeMessage: document.getElementById('welcome-message'),
        contaskLink: document.getElementById('contask-link'),
        loginPasswordToggle: document.getElementById('login-password-toggle'),
        // Recovery links
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        forgotUsernameLink: document.getElementById('forgot-username-link'),
        // Forgot password
        forgotPasswordContainer: document.getElementById('forgot-password-container'),
        forgotPasswordForm: document.getElementById('forgot-password-form'),
        recoveryEmail: document.getElementById('recovery-email'),
        recoveryButton: document.getElementById('recovery-button'),
        recoveryError: document.getElementById('recovery-error'),
        recoverySuccess: document.getElementById('recovery-success'),
        backToLoginFromPassword: document.getElementById('back-to-login-from-password'),
        // Forgot username
        forgotUsernameContainer: document.getElementById('forgot-username-container'),
        forgotUsernameForm: document.getElementById('forgot-username-form'),
        usernameRecoveryEmail: document.getElementById('username-recovery-email'),
        usernameRecoveryButton: document.getElementById('username-recovery-button'),
        usernameRecoveryError: document.getElementById('username-recovery-error'),
        usernameRecoverySuccess: document.getElementById('username-recovery-success'),
        backToLoginFromUsername: document.getElementById('back-to-login-from-username'),
        // Register
        registerContainer: document.getElementById('register-container'),
        registerForm: document.getElementById('register-form'),
        registerName: document.getElementById('register-name'),
        registerEmail: document.getElementById('register-email'),
        registerPassword: document.getElementById('register-password'),
        registerCode: document.getElementById('register-code'),
        registerButton: document.getElementById('register-button'),
        registerError: document.getElementById('register-error'),
        registerSuccess: document.getElementById('register-success'),
        registerLink: document.getElementById('register-link'),
        backToLoginFromRegister: document.getElementById('back-to-login-from-register'),
        registerPasswordToggle: document.getElementById('register-password-toggle')
    };

    // --- VALIDAR ELEMENTOS ---
    const missingElements = Object.entries(elements)
        .filter(([_, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        logger.warn('Elementos HTML ausentes:', missingElements);
    }

    // --- CAPTURAR REDIRECT URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    if (redirectUrl) {
        storage.set(STORAGE_KEYS.REDIRECT_URL, redirectUrl);
        // Limpar URL sem recarregar
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // --- FLOATING LABELS HELPER ---
    function initFloatingLabels() {
        document.querySelectorAll('.input-group').forEach(group => {
            group.querySelectorAll('input').forEach(input => {
                function updateState() {
                    group.classList.toggle('has-value', input.value.trim() !== '');
                }
                input.addEventListener('focus', () => group.classList.add('is-focused'));
                input.addEventListener('blur', () => {
                    group.classList.remove('is-focused');
                    updateState();
                });
                input.addEventListener('input', updateState);
                updateState();
            });
        });
    }

    // --- FUNÇÕES DE VALIDAÇÃO ---

    function isSsoTokenExpired() {
        const loginTimestamp = storage.get(STORAGE_KEYS.LOGIN_TIMESTAMP);
        if (!loginTimestamp) return true;

        const now = Date.now();
        const elapsedMinutes = (now - parseInt(loginTimestamp)) / (1000 * 60);

        return elapsedMinutes > security.ssoTokenExpirationMinutes;
    }

    function isHubSessionExpired() {
        const loginTimestamp = storage.get(STORAGE_KEYS.LOGIN_TIMESTAMP);
        if (!loginTimestamp) return true;

        const now = Date.now();
        const elapsedMinutes = (now - parseInt(loginTimestamp)) / (1000 * 60);

        return elapsedMinutes > security.hubSessionDurationMinutes;
    }

    function isValidSession() {
        const isAuth = storage.get(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
        const hasToken = !!storage.get(STORAGE_KEYS.SSO_TOKEN);
        const sessionValid = !isHubSessionExpired();

        return isAuth && hasToken && sessionValid;
    }

    // --- FUNÇÕES DE UI ---

    function hideAllContainers() {
        if (elements.loginContainer) elements.loginContainer.style.display = 'none';
        if (elements.hubContent) elements.hubContent.style.display = 'none';
        if (elements.forgotPasswordContainer) elements.forgotPasswordContainer.style.display = 'none';
        if (elements.forgotUsernameContainer) elements.forgotUsernameContainer.style.display = 'none';
        if (elements.registerContainer) elements.registerContainer.style.display = 'none';
    }

    function showError(element, message, duration = ui.errorMessageDuration) {
        if (!element) return;
        element.textContent = message;
        element.style.display = 'block';

        if (duration > 0) {
            setTimeout(() => {
                element.textContent = '';
                element.style.display = 'none';
            }, duration);
        }
    }

    function showSuccess(element, message) {
        if (!element) return;
        element.textContent = message;
        element.style.display = 'block';
    }

    function clearMessages(...messageElements) {
        messageElements.forEach(el => {
            if (el) {
                el.textContent = '';
                el.style.display = 'none';
            }
        });
    }

    function showHub() {
        const userName = storage.get(STORAGE_KEYS.USER_NAME);

        if (userName && elements.welcomeMessage) {
            elements.welcomeMessage.textContent = `Bem-vindo, ${userName}!`;
        }

        hideAllContainers();
        if (elements.hubContent) elements.hubContent.style.display = 'block';

        updateContaskLink();

        if (typeof feather !== 'undefined' && feather.replace) {
            feather.replace();
        }

        animateCards();
    }

    function updateContaskLink() {
        if (!elements.contaskLink) return;

        const ssoToken = storage.get(STORAGE_KEYS.SSO_TOKEN);

        if (ssoToken && isValidSsoToken(ssoToken) && !isSsoTokenExpired()) {
            elements.contaskLink.href = `${apps.contask}/sso-login?token=${ssoToken}`;
            elements.contaskLink.style.opacity = '1';
            elements.contaskLink.style.cursor = 'pointer';
            elements.contaskLink.title = 'Clique para acessar o Contask';
        } else {
            elements.contaskLink.href = '#';
            elements.contaskLink.style.opacity = '0.5';
            elements.contaskLink.style.cursor = 'not-allowed';
            elements.contaskLink.title = 'Token expirado. Faça login novamente.';

            if (ssoToken && isSsoTokenExpired()) {
                logger.warn('Token SSO expirado. Link do Contask desabilitado (sessão do hub ainda ativa).');
            }
        }
    }

    function showLogin() {
        hideAllContainers();
        if (elements.loginContainer) elements.loginContainer.style.display = 'block';
        clearMessages(elements.loginError);

        if (typeof feather !== 'undefined' && feather.replace) {
            feather.replace();
        }

        initFloatingLabels();
    }

    function showForgotPassword() {
        hideAllContainers();
        if (elements.forgotPasswordContainer) elements.forgotPasswordContainer.style.display = 'block';
        clearMessages(elements.recoveryError, elements.recoverySuccess);
    }

    function showForgotUsername() {
        hideAllContainers();
        if (elements.forgotUsernameContainer) elements.forgotUsernameContainer.style.display = 'block';
        clearMessages(elements.usernameRecoveryError, elements.usernameRecoverySuccess);
    }

    function showRegister() {
        hideAllContainers();
        if (elements.registerContainer) elements.registerContainer.style.display = 'block';
        clearMessages(elements.registerError, elements.registerSuccess);

        if (typeof feather !== 'undefined' && feather.replace) {
            feather.replace();
        }
    }

    function clearSession() {
        Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
        showLogin();
    }

    // --- REDIRECT HANDLING ---

    function handleRedirectAfterLogin() {
        const storedRedirect = storage.get(STORAGE_KEYS.REDIRECT_URL);
        if (storedRedirect) {
            storage.remove(STORAGE_KEYS.REDIRECT_URL);
            try {
                const url = new URL(storedRedirect);
                if (url.hostname.endsWith('.canellahub.com.br') || url.hostname === 'canellahub.com.br') {
                    logger.log('Redirecionando para:', storedRedirect);
                    window.location.href = storedRedirect;
                    return true;
                }
            } catch (e) {
                logger.warn('URL de redirect inválida:', storedRedirect);
            }
        }
        return false;
    }

    // --- LÓGICA DE AUTENTICAÇÃO ---

    async function handleLogin(email, password) {
        logger.log('Tentando fazer login...');

        if (!email || !password) {
            showError(elements.loginError, 'Por favor, preencha email e senha.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(elements.loginError, 'Email inválido.');
            return false;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), security.loginTimeout);

            const response = await fetch(getApiUrl('hubLogin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json();
            logger.log('Resposta do servidor:', { status: response.status, autenticado: data.autenticado });

            if (response.ok && data.autenticado && data.ssoToken) {
                if (!isValidSsoToken(data.ssoToken)) {
                    showError(elements.loginError, 'Token de autenticação inválido.');
                    return false;
                }

                storage.set(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
                storage.set(STORAGE_KEYS.USER_NAME, data.userName);
                storage.set(STORAGE_KEYS.SSO_TOKEN, data.ssoToken);
                storage.set(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString());

                logger.log('Login realizado com sucesso!');

                // Verificar se há redirect pendente
                if (handleRedirectAfterLogin()) {
                    return true;
                }

                showHub();
                return true;
            } else {
                showError(elements.loginError, data.mensagem || 'Credenciais inválidas.');
                return false;
            }
        } catch (error) {
            logger.error('Erro ao fazer login:', error);

            if (error.name === 'AbortError') {
                showError(elements.loginError, 'Tempo limite de conexão excedido. Tente novamente.');
            } else if (error.message.includes('Failed to fetch')) {
                showError(elements.loginError, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
            } else {
                showError(elements.loginError, 'Erro inesperado ao fazer login. Tente novamente.');
            }

            return false;
        }
    }

    async function handleLogout() {
        logger.log('Fazendo logout...');
        try {
            await fetch(getApiUrl('hubLogout'), {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            logger.warn('Erro ao fazer logout no servidor:', e);
        }
        clearSession();
    }

    // --- RECUPERAÇÃO DE SENHA ---

    async function handleForgotPassword(email) {
        if (!email) {
            showError(elements.recoveryError, 'Por favor, digite seu email.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(elements.recoveryError, 'Email inválido.');
            return;
        }

        try {
            const response = await fetch(getApiUrl('requestPasswordReset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });

            const data = await response.json();

            if (response.ok) {
                clearMessages(elements.recoveryError);
                showSuccess(elements.recoverySuccess, data.message || 'Se o email existir, você receberá instruções de recuperação.');
            } else {
                showError(elements.recoveryError, data.error || 'Erro ao solicitar recuperação.');
            }
        } catch (error) {
            logger.error('Erro ao solicitar recuperação de senha:', error);
            showError(elements.recoveryError, 'Não foi possível conectar ao servidor.');
        }
    }

    // --- RECUPERAÇÃO DE NOME DE USUÁRIO ---

    async function handleFindUsername(email) {
        if (!email) {
            showError(elements.usernameRecoveryError, 'Por favor, digite seu email.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(elements.usernameRecoveryError, 'Email inválido.');
            return;
        }

        try {
            const response = await fetch(getApiUrl('findUsername'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });

            const data = await response.json();

            if (response.ok) {
                clearMessages(elements.usernameRecoveryError);
                showSuccess(elements.usernameRecoverySuccess, data.message || 'Se o email existir, você receberá as informações.');
            } else {
                showError(elements.usernameRecoveryError, data.error || 'Erro ao solicitar recuperação.');
            }
        } catch (error) {
            logger.error('Erro ao recuperar nome de usuário:', error);
            showError(elements.usernameRecoveryError, 'Não foi possível conectar ao servidor.');
        }
    }

    // --- CADASTRO ---

    async function handleRegister() {
        const name = elements.registerName?.value?.trim();
        const email = elements.registerEmail?.value?.trim()?.toLowerCase();
        const password = elements.registerPassword?.value;
        const registrationCode = elements.registerCode?.value?.trim();
        const role = document.querySelector('input[name="register-role"]:checked')?.value || 'EMPLOYEE';

        // Validação client-side
        if (!name || name.length < 2) {
            showError(elements.registerError, 'Nome deve ter pelo menos 2 caracteres.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showError(elements.registerError, 'Email inválido.');
            return;
        }

        if (!password || password.length < 6) {
            showError(elements.registerError, 'Senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (!registrationCode) {
            showError(elements.registerError, 'Código de registro é obrigatório.');
            return;
        }

        try {
            const response = await fetch(getApiUrl('register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, registrationCode, role })
            });

            const data = await response.json();

            if (response.status === 201) {
                clearMessages(elements.registerError);
                showSuccess(
                    elements.registerSuccess,
                    `Conta criada com sucesso! Um email de verificação foi enviado para ${email}. Verifique sua caixa de entrada para ativar sua conta.`
                );

                // Desabilitar formulário após sucesso
                if (elements.registerForm) {
                    Array.from(elements.registerForm.elements).forEach(el => el.disabled = true);
                }

                // Voltar ao login após 5 segundos
                setTimeout(() => {
                    if (elements.registerForm) {
                        elements.registerForm.reset();
                        Array.from(elements.registerForm.elements).forEach(el => el.disabled = false);
                    }
                    showLogin();
                }, 5000);
            } else {
                showError(elements.registerError, data.error || 'Erro ao criar conta. Tente novamente.', 0);
            }
        } catch (error) {
            logger.error('Erro ao registrar:', error);
            showError(elements.registerError, 'Não foi possível conectar ao servidor. Tente novamente.');
        }
    }

    // --- EVENT LISTENERS ---

    // Login form
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages(elements.loginError);

            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;

            if (elements.loginButton) {
                elements.loginButton.classList.add('loading');
                elements.loginButton.disabled = true;
            }

            await handleLogin(email, password);

            if (elements.loginButton) {
                elements.loginButton.classList.remove('loading');
                elements.loginButton.disabled = false;
            }
        });
    }

    // Logout
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Navigation to recovery screens
    if (elements.forgotPasswordLink) {
        elements.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPassword();
        });
    }

    if (elements.forgotUsernameLink) {
        elements.forgotUsernameLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotUsername();
        });
    }

    // Back to login links
    if (elements.backToLoginFromPassword) {
        elements.backToLoginFromPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showLogin();
        });
    }

    if (elements.backToLoginFromUsername) {
        elements.backToLoginFromUsername.addEventListener('click', (e) => {
            e.preventDefault();
            showLogin();
        });
    }

    // Forgot password form
    if (elements.forgotPasswordForm) {
        elements.forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages(elements.recoveryError, elements.recoverySuccess);

            const email = elements.recoveryEmail?.value;

            if (elements.recoveryButton) {
                elements.recoveryButton.classList.add('loading');
                elements.recoveryButton.disabled = true;
            }

            await handleForgotPassword(email);

            if (elements.recoveryButton) {
                elements.recoveryButton.classList.remove('loading');
                elements.recoveryButton.disabled = false;
            }
        });
    }

    // Forgot username form
    if (elements.forgotUsernameForm) {
        elements.forgotUsernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages(elements.usernameRecoveryError, elements.usernameRecoverySuccess);

            const email = elements.usernameRecoveryEmail?.value;

            if (elements.usernameRecoveryButton) {
                elements.usernameRecoveryButton.classList.add('loading');
                elements.usernameRecoveryButton.disabled = true;
            }

            await handleFindUsername(email);

            if (elements.usernameRecoveryButton) {
                elements.usernameRecoveryButton.classList.remove('loading');
                elements.usernameRecoveryButton.disabled = false;
            }
        });
    }

    // Register link
    if (elements.registerLink) {
        elements.registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegister();
        });
    }

    // Back to login from register
    if (elements.backToLoginFromRegister) {
        elements.backToLoginFromRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showLogin();
        });
    }

    // Register form
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages(elements.registerError, elements.registerSuccess);

            if (elements.registerButton) {
                elements.registerButton.classList.add('loading');
                elements.registerButton.disabled = true;
            }

            await handleRegister();

            if (elements.registerButton) {
                elements.registerButton.classList.remove('loading');
                elements.registerButton.disabled = false;
            }
        });
    }

    // Password toggles
    function setupPasswordToggle(toggleElement, inputElement) {
        if (!toggleElement || !inputElement) return;
        toggleElement.addEventListener('click', () => {
            const isPassword = inputElement.type === 'password';
            inputElement.type = isPassword ? 'text' : 'password';
            toggleElement.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');

            const icon = toggleElement.querySelector('svg') || toggleElement.querySelector('i');
            if (icon) {
                icon.setAttribute('data-feather', isPassword ? 'eye-off' : 'eye');
                if (typeof feather !== 'undefined' && feather.replace) {
                    feather.replace();
                }
            }
        });
    }

    setupPasswordToggle(elements.loginPasswordToggle, document.getElementById('password'));
    setupPasswordToggle(elements.registerPasswordToggle, elements.registerPassword);

    // --- ANIMAÇÕES ---

    function animateCards() {
        const projectGrid = document.querySelector('.project-grid');
        if (!projectGrid) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const cards = entry.target.querySelectorAll('.project-card');
                    cards.forEach((card, index) => {
                        const delay = index * 100;
                        card.style.transitionDelay = `${delay}ms`;
                        card.classList.add('in-view');

                        const animationDuration = 300;
                        setTimeout(() => {
                            card.style.transitionDelay = '0ms';
                        }, delay + animationDuration);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(projectGrid);
    }

    // --- INICIALIZAÇÃO ---

    logger.log('Inicializando Canellahub...');

    if (isValidSession()) {
        logger.log('Sessão válida encontrada. Mostrando hub...');
        showHub();
    } else {
        logger.log('Nenhuma sessão válida. Mostrando login...');

        if (storage.get(STORAGE_KEYS.IS_AUTHENTICATED) === 'true') {
            clearSession();
        }

        showLogin();
    }

    // Verificar token periodicamente (a cada minuto)
    setInterval(() => {
        if (isValidSession()) {
            updateContaskLink();
        } else if (storage.get(STORAGE_KEYS.IS_AUTHENTICATED) === 'true') {
            logger.warn('Sessão expirada detectada.');
            clearSession();
        }
    }, 60 * 1000);

    logger.log('Canellahub inicializado com sucesso!');
});
