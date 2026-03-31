// config.js - Configuração de ambiente para o Canellahub

/**
 * Detecta o ambiente baseado no hostname
 * @returns {'production' | 'development'}
 */
function detectEnvironment() {
    const hostname = window.location.hostname;

    // Produção: qualquer domínio que contenha canellahub.com.br
    if (hostname.includes('canellahub.com.br') || hostname.includes('vercel.app')) {
        return 'production';
    }

    // Desenvolvimento: localhost ou 127.0.0.1
    return 'development';
}

/**
 * Configuração do ambiente
 */
const ENV = detectEnvironment();
const IS_PRODUCTION = ENV === 'production';

/**
 * URLs da API e aplicações
 */
const CONFIG = {
    // Ambiente atual
    environment: ENV,
    isProduction: IS_PRODUCTION,

    // URLs do backend (API do Contask)
    api: {
        baseURL: IS_PRODUCTION
            ? 'https://contask.canellahub.com.br/api'
            : 'http://localhost:3001/api',

        endpoints: {
            hubLogin: '/auth/hub-login',
            hubLogout: '/auth/hub-logout',
            requestPasswordReset: '/auth/request-password-reset',
            findUsername: '/auth/find-username',
            health: '/health'
        }
    },

    // URLs das aplicações
    apps: {
        contask: IS_PRODUCTION
            ? 'https://contask.canellahub.com.br'
            : 'http://localhost:5173',

        // Adicione outras aplicações aqui conforme necessário
        // exemplo: {
        //     name: 'Exemplo App',
        //     url: IS_PRODUCTION ? 'https://exemplo.canellahub.com.br' : 'http://localhost:3000'
        // }
    },

    // Configurações de segurança
    security: {
        // Token SSO expira em 5 minutos no backend
        ssoTokenExpirationMinutes: 5,

        // Tempo máximo para tentativa de login (em ms)
        loginTimeout: 10000,

        // Usar sessionStorage ao invés de localStorage para maior segurança
        useSessionStorage: true
    },

    // Configurações de UI
    ui: {
        // Tempo de exibição de mensagens de erro (em ms)
        errorMessageDuration: 5000,

        // Habilitar logs de debug (apenas em desenvolvimento)
        enableDebugLogs: !IS_PRODUCTION
    }
};

/**
 * Logger condicional (só loga em desenvolvimento)
 */
const logger = {
    log: (...args) => {
        if (CONFIG.ui.enableDebugLogs) {
            console.log('[Canellahub]', ...args);
        }
    },

    error: (...args) => {
        console.error('[Canellahub ERROR]', ...args);
    },

    warn: (...args) => {
        if (CONFIG.ui.enableDebugLogs) {
            console.warn('[Canellahub WARN]', ...args);
        }
    }
};

/**
 * Função auxiliar para construir URL completa da API
 */
function getApiUrl(endpoint) {
    const baseURL = CONFIG.api.baseURL;
    const endpointPath = CONFIG.api.endpoints[endpoint] || endpoint;
    return `${baseURL}${endpointPath}`;
}

/**
 * Validação de token SSO
 */
function isValidSsoToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    // Token deve ter pelo menos 32 caracteres (formato esperado do backend)
    if (token.length < 32) {
        return false;
    }

    // Verificar se contém apenas caracteres hexadecimais
    return /^[a-f0-9]+$/i.test(token);
}

/**
 * Storage abstraction (permite trocar entre session e localStorage facilmente)
 */
const storage = {
    get: (key) => {
        try {
            const store = CONFIG.security.useSessionStorage ? sessionStorage : localStorage;
            return store.getItem(key);
        } catch (error) {
            logger.error('Erro ao ler storage:', error);
            return null;
        }
    },

    set: (key, value) => {
        try {
            const store = CONFIG.security.useSessionStorage ? sessionStorage : localStorage;
            store.setItem(key, value);
            return true;
        } catch (error) {
            logger.error('Erro ao escrever no storage:', error);
            return false;
        }
    },

    remove: (key) => {
        try {
            const store = CONFIG.security.useSessionStorage ? sessionStorage : localStorage;
            store.removeItem(key);
            return true;
        } catch (error) {
            logger.error('Erro ao remover do storage:', error);
            return false;
        }
    },

    clear: () => {
        try {
            const store = CONFIG.security.useSessionStorage ? sessionStorage : localStorage;
            store.clear();
            return true;
        } catch (error) {
            logger.error('Erro ao limpar storage:', error);
            return false;
        }
    }
};

// Exportar configurações e utilitários
window.CanellaConfig = CONFIG;
window.CanellaLogger = logger;
window.CanellaStorage = storage;
window.CanellaUtils = {
    getApiUrl,
    isValidSsoToken
};

// Log inicial apenas em desenvolvimento
logger.log('Configuração carregada:', {
    environment: CONFIG.environment,
    apiBaseURL: CONFIG.api.baseURL,
    contaskURL: CONFIG.apps.contask
});
