# 🔐 Canellahub - Portal de Autenticação SSO

Hub central de autenticação para acesso às aplicações Canella, utilizando o sistema de usuários do Contask.

## 📋 Sobre o Projeto

O Canellahub é uma página estática que serve como portal de entrada para todas as aplicações da Canella. Ele utiliza o sistema de autenticação do Contask (SSO - Single Sign-On) para validar usuários e permitir acesso às aplicações conectadas.

### ✨ Características

- 🔐 **Autenticação SSO**: Login único usando credenciais do Contask
- 🎯 **Token de uso único**: Tokens SSO válidos por 5 minutos e de uso único
- 🔒 **Segurança**: Validações, rate limiting e logs de segurança
- 🌐 **Multi-ambiente**: Suporte para desenvolvimento e produção
- ⚡ **Leve**: Página estática HTML/CSS/JS puro
- 🎨 **Responsivo**: Interface adaptável para todos os dispositivos

---

## 🏗️ Arquitetura

### Fluxo de Autenticação SSO

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │         │              │         │             │
│  Canellahub │ ──(1)──>│   Contask    │<───(2)──│   User      │
│   (Static)  │         │    (API)     │         │ (Database)  │
│             │<──(3)───│              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │
       └──────────(4)────────────────┐
                                     │
                              ┌──────▼──────┐
                              │   Contask   │
                              │  Frontend   │
                              └─────────────┘
```

**Passos:**
1. Usuário faz login no Canellahub com email/senha
2. Canellahub envia credenciais para `/api/auth/hub-login`
3. Backend valida usuário e retorna `ssoToken` (válido por 5 min)
4. Canellahub armazena token e redireciona para `/sso-login?token=xxx`
5. Contask valida token e cria sessão de usuário

---

## 🚀 Deploy

### Pré-requisitos

- Contask backend rodando e acessível
- Domínio configurado (canellahub.com.br)
- Conta na Vercel (ou outro host para páginas estáticas)

### Deploy na Vercel (Recomendado)

#### 1. Instalar Vercel CLI (opcional)

```bash
npm install -g vercel
```

#### 2. Deploy via CLI

```bash
cd canellahub
vercel --prod
```

#### 3. Deploy via GitHub (Recomendado)

1. Push do código para GitHub
2. Conectar repositório na Vercel
3. Configurar:
   - **Build Command**: (deixar em branco)
   - **Output Directory**: (deixar em branco ou `.`)
   - **Install Command**: (deixar em branco)

4. Deploy automático acontecerá

#### 4. Configurar Domínio

Na Vercel Dashboard:
1. Vá em **Settings** → **Domains**
2. Adicione `canellahub.com.br`
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

---

## ⚙️ Configuração

### Backend (Contask)

O backend já está configurado para aceitar requisições do Canellahub. Certifique-se de que:

#### 1. CORS está habilitado para o domínio do Canellahub

No arquivo [backend/src/server.ts](../backend/src/server.ts):

```typescript
const allowedOrigins = isProduction
  ? [
      process.env.FRONTEND_URL,
      'https://canellahub.com.br',
      'https://www.canellahub.com.br'
    ]
  : [
      'http://localhost:5173',
      'http://localhost:5500'
    ]
```

#### 2. Rate Limiting está configurado

As seguintes rotas têm rate limiting específico:
- `/api/auth/hub-login`: 20 tentativas / 15 min
- `/api/auth/sso-login`: 10 tentativas / 5 min

#### 3. Variáveis de Ambiente (Production)

```env
NODE_ENV=production
FRONTEND_URL=https://contask.canellahub.com.br
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### Frontend (Canellahub)

A configuração é automática baseada no hostname. O arquivo [config.js](./config.js) detecta o ambiente:

```javascript
const isProduction = window.location.hostname.includes('canellahub.com.br');

const API_BASE_URL = isProduction
    ? 'https://contask.canellahub.com.br/api'
    : 'http://localhost:3001/api';
```

#### Customização (Opcional)

Para alterar URLs ou configurações, edite [config.js](./config.js):

```javascript
const CONFIG = {
    api: {
        baseURL: 'https://sua-api.com/api'
    },
    apps: {
        contask: 'https://seu-contask.com'
    }
};
```

---

## 🧪 Testando Localmente

### 1. Backend (Contask)

```bash
cd backend
npm run dev
# Roda em http://localhost:3001
```

### 2. Frontend (Canellahub)

Opção A: **Live Server (VSCode)**
1. Instale a extensão "Live Server"
2. Clique com botão direito em `index-improved.html`
3. Selecione "Open with Live Server"
4. Acesse `http://localhost:5500`

Opção B: **Python HTTP Server**
```bash
cd canellahub
python -m http.server 5500
# Acesse http://localhost:5500
```

Opção C: **Node HTTP Server**
```bash
cd canellahub
npx http-server -p 5500
```

### 3. Testar Fluxo Completo

1. Acesse o Canellahub: `http://localhost:5500/index-improved.html`
2. Faça login com um usuário do Contask
3. Clique em "Contask" no hub
4. Você será redirecionado e autenticado automaticamente

---

## 🔒 Segurança

### Medidas Implementadas

#### Backend
- ✅ Rate limiting específico por rota
- ✅ Tokens SSO de uso único (expiram após uso)
- ✅ Tokens SSO com TTL de 5 minutos
- ✅ Logs detalhados de tentativas de login
- ✅ CORS restritivo
- ✅ Validação de email verificado

#### Frontend
- ✅ Validação de token SSO antes de usar
- ✅ SessionStorage (mais seguro que localStorage)
- ✅ Verificação automática de expiração de token
- ✅ Limpeza automática de sessões expiradas
- ✅ Timeout para requisições (10s)
- ✅ Headers de segurança via meta tags

### Boas Práticas

**NUNCA**:
- ❌ Commit de tokens ou credenciais
- ❌ Desabilitar CORS em produção
- ❌ Aumentar TTL do SSO token além de 5 minutos
- ❌ Remover rate limiting

**SEMPRE**:
- ✅ Use HTTPS em produção
- ✅ Monitore logs de segurança
- ✅ Revise tentativas de login falhadas
- ✅ Mantenha o backend atualizado

---

## 📁 Estrutura de Arquivos

```
canellahub/
├── index-improved.html      # HTML principal (use este!)
├── script-improved.js        # JavaScript melhorado (use este!)
├── config.js                 # Configuração de ambiente
├── style.css                 # Estilos
├── vercel.json               # Configuração Vercel
├── .vercelignore             # Arquivos ignorados no deploy
├── README.md                 # Esta documentação
├── logo/
│   └── logo_canella.png      # Logo da empresa
├── index.html                # ⚠️ Arquivo antigo (não usar)
└── script.js                 # ⚠️ Arquivo antigo (não usar)
```

### Arquivos para Deploy

**Usar** (arquivos melhorados):
- ✅ `index-improved.html`
- ✅ `script-improved.js`
- ✅ `config.js`
- ✅ `style.css`
- ✅ `vercel.json`
- ✅ `logo/`

**Ignorar** (arquivos antigos):
- ❌ `index.html`
- ❌ `script.js`

---

## 🐛 Troubleshooting

### Erro: "Bloqueado pelo CORS"

**Causa**: Backend não está aceitando requisições do domínio do Canellahub

**Solução**:
1. Verifique os `allowedOrigins` em `backend/src/server.ts`
2. Adicione o domínio do Canellahub
3. Reinicie o backend

### Erro: "Token SSO inválido ou expirado"

**Causas possíveis**:
- Token expirou (5 minutos)
- Token já foi usado
- Horário do servidor/cliente dessincronizado

**Solução**:
1. Faça login novamente no hub
2. Clique imediatamente em "Contask"
3. Verifique logs do backend para mais detalhes

### Erro: "Muitas tentativas de login"

**Causa**: Rate limiting atingido

**Solução**:
1. Aguarde 15 minutos
2. Verifique se não há script fazendo requisições automáticas
3. Em desenvolvimento, reinicie o backend para limpar rate limit

### Canellahub não detecta produção corretamente

**Causa**: Hostname não contém "canellahub.com.br"

**Solução**:
Edite `config.js`:
```javascript
function detectEnvironment() {
    const hostname = window.location.hostname;
    if (hostname === 'seu-dominio-temporario.vercel.app') {
        return 'production';
    }
    return 'development';
}
```

---

## 🔄 Atualizações Futuras

### Próximos Passos

- [ ] Adicionar mais aplicações ao hub
- [ ] Implementar refresh token para sessões longas
- [ ] Adicionar autenticação 2FA
- [ ] Dashboard de estatísticas de uso
- [ ] Logs de auditoria centralizados
- [ ] Suporte a múltiplos idiomas

---

## 📞 Suporte

### Logs e Monitoramento

**Backend (Contask)**:
```bash
# Ver logs de autenticação
tail -f backend/logs/auth.log | grep "Hub-login"

# Ver logs gerais
tail -f backend/logs/app.log
```

**Vercel (Canellahub)**:
1. Acesse Vercel Dashboard
2. Vá em **Deployments**
3. Clique no deployment
4. Veja **Function Logs** (se aplicável)

### Contato

- **GitHub**: [lucasolivco](https://github.com/lucasolivco)
- **Email**: lukazcosta03@gmail.com

---

## 📝 Changelog

### v1.0.0 (2025-01-22)

- ✅ Implementação inicial do SSO
- ✅ Integração com Contask
- ✅ Sistema de tokens de uso único
- ✅ Rate limiting e logs de segurança
- ✅ Suporte a múltiplos ambientes
- ✅ Deploy na Vercel

---

<div align="center">

**🔐 Desenvolvido com segurança em mente**

Made with ❤️ by Canella Team

</div>
