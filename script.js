// script-improved.js - Versão melhorada com segurança aprimorada

document.addEventListener('DOMContentLoaded', () => {
    // --- VERIFICAR SE CONFIG FOI CARREGADO ---
    if (!window.CanellaConfig) {
        console.error('❌ Configuração não carregada! Certifique-se de incluir config.js antes deste script.');
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
        LOGIN_TIMESTAMP: 'hubLoginTimestamp'
    };

    // --- ELEMENTOS DA PÁGINA ---
    const elements = {
        loginContainer: document.getElementById('login-container'),
        hubContent: document.getElementById('hub-content'),
        loginForm: document.getElementById('login-form'),
        loginError: document.getElementById('login-error'),
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        welcomeMessage: document.getElementById('welcome-message'),
        contaskLink: document.getElementById('contask-link')
    };

    // --- VALIDAR ELEMENTOS ---
    const missingElements = Object.entries(elements)
        .filter(([_, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        logger.error('Elementos HTML ausentes:', missingElements);
    }

    // --- FUNÇÕES DE VALIDAÇÃO ---

    /**
     * Verifica se o token SSO ainda é válido (não expirou)
     */
    function isSsoTokenExpired() {
        const loginTimestamp = storage.get(STORAGE_KEYS.LOGIN_TIMESTAMP);
        if (!loginTimestamp) return true;

        const now = Date.now();
        const elapsedMinutes = (now - parseInt(loginTimestamp)) / (1000 * 60);

        return elapsedMinutes > security.ssoTokenExpirationMinutes;
    }

    /**
     * Valida se a sessão atual é válida
     */
    function isValidSession() {
        const isAuth = storage.get(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
        const hasToken = !!storage.get(STORAGE_KEYS.SSO_TOKEN);
        const tokenValid = !isSsoTokenExpired();

        return isAuth && hasToken && tokenValid;
    }

    // --- FUNÇÕES DE UI ---

    /**
     * Exibe mensagem de erro
     */
    function showError(message, duration = ui.errorMessageDuration) {
        if (!elements.loginError) return;

        elements.loginError.textContent = message;
        elements.loginError.style.display = 'block';

        // Auto-ocultar após duração especificada
        if (duration > 0) {
            setTimeout(() => {
                elements.loginError.textContent = '';
                elements.loginError.style.display = 'none';
            }, duration);
        }
    }

    /**
     * Limpa mensagens de erro
     */
    function clearError() {
        if (!elements.loginError) return;
        elements.loginError.textContent = '';
        elements.loginError.style.display = 'none';
    }

    /**
     * Exibe o hub de aplicações
     */
    function showHub() {
        const userName = storage.get(STORAGE_KEYS.USER_NAME);

        if (userName && elements.welcomeMessage) {
            elements.welcomeMessage.textContent = `Bem-vindo, ${userName}!`;
        }

        if (elements.loginContainer) {
            elements.loginContainer.style.display = 'none';
        }

        if (elements.hubContent) {
            elements.hubContent.style.display = 'block';
        }

        updateContaskLink();

        // Substituir feather.replace() por código mais seguro
        if (typeof feather !== 'undefined' && feather.replace) {
            feather.replace();
        }

        animateCards();
    }

    /**
     * Atualiza o link do Contask com o token SSO
     */
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

            // Se o token expirou, limpar a sessão
            if (ssoToken && isSsoTokenExpired()) {
                logger.warn('Token SSO expirado. Limpando sessão...');
                clearSession();
            }
        }
    }

    /**
     * Exibe o formulário de login
     */
    function showLogin() {
        if (elements.loginContainer) {
            elements.loginContainer.style.display = 'block';
        }

        if (elements.hubContent) {
            elements.hubContent.style.display = 'none';
        }

        clearError();

        if (typeof feather !== 'undefined' && feather.replace) {
            feather.replace();
        }
    }

    /**
     * Limpa a sessão do usuário
     */
    function clearSession() {
        Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
        showLogin();
    }

    // --- LÓGICA DE AUTENTICAÇÃO ---

    /**
     * Realiza o login no hub
     */
    async function handleLogin(email, password) {
        logger.log('Tentando fazer login...');

        // Validações básicas
        if (!email || !password) {
            showError('Por favor, preencha email e senha.');
            return false;
        }

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Email inválido.');
            return false;
        }

        try {
            // Adicionar timeout à requisição
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), security.loginTimeout);

            const response = await fetch(getApiUrl('hubLogin'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
                // Validar token recebido
                if (!isValidSsoToken(data.ssoToken)) {
                    showError('Token de autenticação inválido.');
                    return false;
                }

                // Salvar dados da sessão
                storage.set(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
                storage.set(STORAGE_KEYS.USER_NAME, data.userName);
                storage.set(STORAGE_KEYS.SSO_TOKEN, data.ssoToken);
                storage.set(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString());

                logger.log('Login realizado com sucesso!');
                showHub();
                return true;
            } else {
                showError(data.mensagem || 'Credenciais inválidas.');
                return false;
            }
        } catch (error) {
            logger.error('Erro ao fazer login:', error);

            if (error.name === 'AbortError') {
                showError('Tempo limite de conexão excedido. Tente novamente.');
            } else if (error.message.includes('Failed to fetch')) {
                showError('Não foi possível conectar ao servidor. Verifique sua conexão.');
            } else {
                showError('Erro inesperado ao fazer login. Tente novamente.');
            }

            return false;
        }
    }

    /**
     * Realiza o logout
     */
    function handleLogout() {
        logger.log('Fazendo logout...');
        clearSession();
    }

    // --- EVENT LISTENERS ---

    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;

            // Desabilitar botão e mostrar loading
            if (elements.loginButton) {
                elements.loginButton.classList.add('loading');
                elements.loginButton.disabled = true;
            }

            await handleLogin(email, password);

            // Reabilitar botão
            if (elements.loginButton) {
                elements.loginButton.classList.remove('loading');
                elements.loginButton.disabled = false;
            }
        });
    }

    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

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

    // Verificar se existe sessão válida
    if (isValidSession()) {
        logger.log('Sessão válida encontrada. Mostrando hub...');
        showHub();
    } else {
        logger.log('Nenhuma sessão válida. Mostrando login...');

        // Limpar dados de sessão expirada
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
    }, 60 * 1000); // 1 minuto

    logger.log('Canellahub inicializado com sucesso!');
});
