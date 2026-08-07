# 613 OS · Google Workspace OAuth setup

## Purpose

This phase uses Google OAuth only to obtain a short-lived access token for **read-only Google Sheets access**. The application does not request offline access and does not store a refresh token.

## Google Cloud configuration

1. In Google Cloud, create or select the project that should own the 613 OS OAuth client.
2. Configure the OAuth consent screen for the intended 613 OS users.
3. Create an OAuth 2.0 Client ID of type **Web application**.
4. Add the exact redirect URI for every runtime that will be used:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Preview/production: `https://<613-os-host>/api/auth/google/callback`
5. The application requests only:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
6. Put the client values in the runtime environment. Never commit them:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_WORKSPACE_ALLOWED_DOMAIN=
```

`GOOGLE_WORKSPACE_ALLOWED_DOMAIN` is optional. When set, 613 OS validates Google's Workspace hosted-domain (`hd`) claim exactly. Matching only the email suffix is deliberately not accepted.

## Safe activation sequence

Keep these values unchanged at first:

```env
OPS_TASK_SOURCE=mock-read-only
OPS_ALLOW_LIVE_TASK_DISPLAY=false
OPS_TASK_PARITY_APPROVED=false
```

Then:

1. Start 613 OS.
2. Open `/api/auth/status` and verify `oauthConfigured: true`.
3. Open `/tasks` and choose **Connect Google Workspace**.
4. Complete Google sign-in.
5. Re-open `/api/auth/status` and verify `authenticated: true`.
6. Run `npm run verify:task-parity` with a short-lived token in `GOOGLE_SHEETS_ACCESS_TOKEN`.
7. Only after the parity report is reviewed may the runtime be changed deliberately to:

```env
OPS_TASK_SOURCE=google-sheets-read-only
OPS_TASK_PARITY_APPROVED=true
OPS_ALLOW_LIVE_TASK_DISPLAY=true
```

## Security invariants

- Production transition adapters expose no Sheet write method.
- The Sheets REST client uses HTTP `GET` only.
- A broader Google Sheets permission is rejected even if Google returns it.
- No refresh token is requested or persisted in this phase.
- Access token cookies are HTTP-only and `Secure` in production.
- OAuth `state` and PKCE are required.
- Workspace restriction uses Google's `hd` claim.
