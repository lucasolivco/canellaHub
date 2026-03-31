# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canellahub is a static SSO (Single Sign-On) authentication portal for Canella & Santos internal applications. It authenticates users against the Contask backend API, sets a shared session cookie (`canellahub_session`) for all subdomains, and provides access to multiple internal apps.

**Tech stack:** Pure vanilla HTML5, CSS3, and JavaScript — no frameworks, no bundler, no package.json.

## Development

There is no build step. Serve the static files locally:

```bash
# Option A: Python
python -m http.server 5500

# Option B: Node
npx http-server -p 5500
```

The backend (Contask) must be running at `http://localhost:3001` for login to work locally.

No test framework or linter is configured.

## Deployment

Deployed as a static site on **Vercel** (auto-deploy from GitHub). No build command needed. Security headers are configured in `vercel.json`.

## Architecture

### Script Loading Order (Critical)

In `index.html`, scripts must load in this order (all use `defer`):
1. **feather-icons** (CDN) — SVG icon library
2. **config.js** — must load before script.js
3. **script.js** — depends on `window.CanellaConfig`, `window.CanellaLogger`, `window.CanellaStorage`, `window.CanellaUtils`

### config.js — Configuration & Utilities

Exports everything to `window.*` globals (no ES modules):
- `window.CanellaConfig` (`CONFIG`) — environment detection (hostname-based), API URLs, app URLs, security settings, UI settings, endpoints
- `window.CanellaLogger` (`logger`) — conditional logging (debug logs only in development)
- `window.CanellaStorage` (`storage`) — abstraction over localStorage with error handling (configurable via `useSessionStorage` flag)
- `window.CanellaUtils` — `getApiUrl(endpoint)`, `isValidSsoToken(token)`

Environment is auto-detected: production if hostname contains `canellahub.com.br` or `vercel.app`, otherwise development.

#### API Endpoints (config.js)

```javascript
endpoints: {
    hubLogin: '/auth/hub-login',
    hubLogout: '/auth/hub-logout',
    requestPasswordReset: '/auth/request-password-reset',
    findUsername: '/auth/find-username',
    register: '/auth/register',
    health: '/health'
}
```

#### Session & Token Expiration

Two independent timers control authentication:
- **SSO Token** (`ssoTokenExpirationMinutes: 5`) — short-lived token used only to redirect the user into Contask via `/sso-login?token=xxx`. Once expired, the Contask link is disabled but the hub session stays active.
- **Hub Session** (`hubSessionDurationMinutes: 600`) — 10-hour session that keeps the user logged into the portal. Uses `localStorage` so it persists across tabs and browser restarts (expires by time, not by closing the tab).

### script.js — Application Logic

Runs inside a single `DOMContentLoaded` listener. Handles:
- **Session management**: validates auth state via storage keys (`isHubAuthenticated`, `hubUserName`, `hubSsoToken`, `hubLoginTimestamp`, `hubRedirectUrl`)
- **Login flow**: POST to `/api/auth/hub-login` with `credentials: 'include'` → receives `ssoToken` + session cookie → stores in localStorage → shows hub
- **SSO cookie**: Login sets `canellahub_session` cookie (httpOnly, shared via `Domain=.canellahub.com.br`). Used by Nginx `auth_request` to protect all subdomains.
- **Redirect handling**: Captures `?redirect=URL` from query params. After login, validates URL is `*.canellahub.com.br` and redirects back.
- **Hub display**: shows app cards, updates Contask link with SSO token as URL param (`/sso-login?token=xxx`)
- **Dual expiration check**: every 60 seconds checks hub session validity; SSO token expiration only disables the Contask link (does not force logout)
- **Logout**: Calls `/api/auth/hub-logout` with `credentials: 'include'` to clear session cookie, then clears localStorage
- **Password recovery**: POST to `/api/auth/request-password-reset` with email
- **Username recovery**: POST to `/api/auth/find-username` with email
- **User registration**: POST to `/api/auth/register` with name, email, password, registrationCode, role (EMPLOYEE or MANAGER)
- **Card animations**: IntersectionObserver-based staggered fade-in

### Five UI States

The page toggles between five `<div>` containers:
1. `#login-container` — email/password form + recovery/register links
2. `#hub-content` — grid of application cards (Contask uses SSO token; other apps link externally)
3. `#forgot-password-container` — email form for password reset
4. `#forgot-username-container` — email form for username recovery
5. `#register-container` — registration form with name, email, password, registration code, and role selector

### Hub Application Cards

| App | URL | Status | Icon |
|-----|-----|--------|------|
| Clientes Data Base | `#` (disabled) | Em breve | briefcase |
| Contask | Dynamic SSO link | Ativo | bar-chart-2 |
| Treinamentos | moodle.canellahub.com.br | Ativo | award |
| Gerador de Atas | ata.canellahub.com.br | Ativo | file-text |
| Arvore de Decisao | tree.canellahub.com.br | Ativo | share-2 |
| Gerador de Contratos | contratos.canellahub.com.br | Ativo | code |
| Gestao de Vendas | gestaovendas.canellahub.com.br | Ativo | shopping-cart |
| Gestao de Fluxo | gestaovendas.canellahub.com.br/fluxos.html | Ativo | activity |
| Onboarding | gestaovendas.canellahub.com.br/onboarding.html | Ativo | user-check |
| Sucesso do Cliente | gestaovendas.canellahub.com.br/cs.html | Ativo | heart |

### SSO Flow (Nginx auth_request)

```
User visits subdomain → Nginx sends auth_request to /_validate_session
  → Backend validates canellahub_session cookie
    ├── 200 (valid) → Nginx serves content normally
    ├── 401 (invalid/missing) → Nginx redirects to canellahub.com.br?redirect=ORIGINAL_URL
    └── 502/503 (backend down) → Nginx shows maintenance page
```

Protected subdomains: contask (frontend only), ata, tree, contratos, gestaovendas.
Excluded from SSO: moodle (has its own login system).

### style.css — UI & Responsiveness

- **Theme**: Dark mode with glassmorphism, CSS variables for colors/spacing
- **Auth containers**: `width: 92%; max-width: 480px` (login, register, recovery screens)
- **Dashboard container**: `max-width: 1100px`
- **Grid**: `repeat(auto-fit, minmax(280px, 1fr))` for auto-responsive card layout
- **Card hover**: `translateY(-4px)` + cyan glow shadow + cyan border
- **Badge system**: `.badge-active` (green), `.badge-soon` (gray), `.badge-dev` (blue) — pill-shaped semantic labels
- **Icons**: 40x40px Feather icons in cards
- **Breakpoints**: Tablet (768px), Mobile (600px)

## Conventions

- **Language**: UI text and code comments are in Portuguese (pt-BR)
- **CSS**: Uses CSS variables for theming (dark theme with glassmorphism), Poppins font
- **Icons**: Feather Icons via `data-feather` attributes; call `feather.replace()` after DOM changes
- **Naming**: CSS classes/HTML IDs use kebab-case; JS uses camelCase
- **Storage keys**: Defined as `STORAGE_KEYS` object in script.js — prefixed with `hub`
- **Fetch calls**: All API calls use `credentials: 'include'` to send/receive cookies cross-origin
- **Security**: Redirect URLs validated against `*.canellahub.com.br` to prevent open redirect attacks
- **Error messages**: Generic messages for recovery endpoints (don't reveal if email exists)
- **Storage**: Uses localStorage by default (persists across tabs); configurable via `useSessionStorage` flag in config.js
