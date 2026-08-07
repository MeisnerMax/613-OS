# 613 OS

Internal operations workspace for 613 Investment Group.

## Safety

The current production Google Sheets, Drive files and calendars remain **read-only**. This prototype is isolated and contains no production write adapter.

## MVP slice

- App shell and primary navigation
- Home dashboard
- My Work
- Tasks with filters and a detail drawer
- Assets overview
- Projects overview
- Mock data modeled on the current 613 structures
- Read-only adapter contracts for Tasks, Assets and Development
- Typed mappings from the existing Sheet column structures into 613 OS domain models
- Google Workspace OAuth with PKCE for short-lived read-only Sheet sessions
- Auth/provider status endpoint at `/api/auth/status`

## Local development

```bash
npm install
npm run dev
```

The current ChatGPT runtime cannot install the project dependencies because its internal npm registry does not provide the required public packages. A dependency-free `static-preview/` remains included for UI inspection.

## Verification

```bash
npm run typecheck
npm run verify:read-only
npm run verify:task-parity
```

`verify:task-parity` requires a short-lived `GOOGLE_SHEETS_ACCESS_TOKEN` with `spreadsheets.readonly` scope.

## Transition data layer

The UI does not import production Sheet rows directly. Server pages request a `PortfolioSnapshot` through read-only source contracts. The live Task provider is guarded behind four conditions: explicit Google-Sheets source selection, explicit parity approval, explicit live-display approval and an authenticated Google Workspace session. Otherwise it falls back to the isolated mock source.

## Google OAuth

See `OAUTH_SETUP.md`. The app requests no offline access and stores no refresh token. If a Workspace domain restriction is configured, Google's hosted-domain (`hd`) claim must match exactly. A broader Sheets permission than `spreadsheets.readonly` is rejected.
