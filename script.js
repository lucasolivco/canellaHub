document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO DE AMBIENTE ---
    const isProduction = window.location.hostname.includes('canellahub.com.br');

    const API_BASE_URL = isProduction 
        ? 'https://contask.canellahub.com.br/api' 
        : 'http://localhost:3001/api';

    const CONTASK_APP_URL = isProduction
        ? 'https://contask.canellahub.com.br'
        : 'http://localhost:5173';

    const HUB_LOGIN_API_URL = `${API_BASE_URL}/auth/hub-login`;

    // --- 2. ELEMENTOS DA PÁGINA ---
    const loginContainer = document.getElementById('login-container');
    const hubContent = document.getElementById('hub-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const welcomeMessage = document.getElementById('welcome-message');

    // --- 3. FUNÇÕES DE CONTROLE DE UI ---
    function showHub() {
        const userName = sessionStorage.getItem('hubUserName');
        if (userName) {
            welcomeMessage.textContent = `Bem-vindo, ${userName}!`;
        }

        loginContainer.style.display = 'none';
        hubContent.style.display = 'block';

        // ✅ ATUALIZA O LINK DO CONTASK COM O TOKEN SSO
        const ssoToken = sessionStorage.getItem('hubSsoToken');
        const contaskLink = document.getElementById('contask-link'); // ✅ USA O ID QUE ADICIONAMOS
        
        if (contaskLink && ssoToken) {
            contaskLink.href = `${CONTASK_APP_URL}/sso-login?token=${ssoToken}`;
        } else if (contaskLink) {
            contaskLink.href = '#';
            contaskLink.style.opacity = '0.5';
            contaskLink.style.cursor = 'not-allowed';
            contaskLink.title = 'Faça login novamente para gerar um token de acesso.';
        }

        feather.replace();
        animateCards();
    }

    // --- 4. LÓGICA DE AUTENTICAÇÃO ---
    if (sessionStorage.getItem('isHubAuthenticated') === 'true') {
        showHub();
    } else {
        feather.replace();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        loginError.textContent = '';
        loginButton.classList.add('loading');
        loginButton.disabled = true;

        try {
            const response = await fetch(HUB_LOGIN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (response.ok && data.autenticado && data.ssoToken) {
                sessionStorage.setItem('isHubAuthenticated', 'true');
                sessionStorage.setItem('hubUserName', data.userName);
                sessionStorage.setItem('hubSsoToken', data.ssoToken);
                showHub();
            } else {
                loginError.textContent = data.mensagem || 'Credenciais inválidas.';
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            loginError.textContent = 'Não foi possível conectar ao servidor de autenticação.';
        } finally {
            loginButton.classList.remove('loading');
            loginButton.disabled = false;
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isHubAuthenticated');
            sessionStorage.removeItem('hubUserName');
            sessionStorage.removeItem('hubSsoToken');
            location.reload();
        });
    }

    // --- 5. ANIMAÇÕES (sem alterações) ---
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
});
