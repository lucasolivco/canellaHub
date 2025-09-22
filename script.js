document.addEventListener('DOMContentLoaded', () => {
    // Elementos da página
    const loginContainer = document.getElementById('login-container');
    const hubContent = document.getElementById('hub-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const welcomeMessage = document.getElementById('welcome-message');

    // URL da sua API de backend
    const API_URL = 'http://localhost:3001/api/auth/hub-login';

    function showHub() {
        const userName = sessionStorage.getItem('hubUserName');
        if (userName) {
            welcomeMessage.textContent = `Bem-vindo(a), ${userName}!`;
        }

        loginContainer.style.display = 'none';
        hubContent.style.display = 'block';
        feather.replace();
        animateCards();
    }

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
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (response.ok && data.autenticado) {
                sessionStorage.setItem('isHubAuthenticated', 'true');
                sessionStorage.setItem('hubUserName', data.userName);
                showHub();
            } else {
                loginError.textContent = data.mensagem || 'Credenciais inválidas.';
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            loginError.textContent = 'Não foi possível conectar ao servidor.';
        } finally {
            loginButton.classList.remove('loading');
            loginButton.disabled = false;
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isHubAuthenticated');
            sessionStorage.removeItem('hubUserName');
            location.reload();
        });
    }

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

                        // CORREÇÃO: Remove o delay após a animação para que o hover seja instantâneo
                        const animationDuration = 300; // Duração da animação definida no CSS (transition-slow)
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