# 613 OS · Architecture & Handoff

## Immutable rules

- Existing production files are READ ONLY unless the user later gives an explicit file-specific write instruction.
- Do not modify `Task_Overview_613Group`, `Development_Projects_DE`, `Asset_Overview_v4`, existing production calendars, or other current production files.
- New development happens only in isolated 613 OS resources.
- Before every work step: checked plan. After every work step: verification.
- Keep this file and the persistent Drive document `613 OS · Architecture & Handoff` current.
- Before a context handoff, update the Handoff section.

## Product goal

613 OS is a vertically tailored internal operations application for Asset Management, Development, Tasks, Issues, Documents, Approvals, Team/Workload and management reporting.

## Target architecture

- Frontend: Next.js App Router + React + TypeScript.
- Phase 1 backend: server-side read-only adapters for current Sheets plus isolated storage for new write features.
- Phase 2 backend: PostgreSQL for operational data; Sheets remain for financial models and specialist calculations.
- Drive: document storage by reference.
- Calendar: actual meetings, inspections, deadlines and milestones; long project timelines stay in Gantt.
- Authentication: Google Workspace OAuth with server-side token handling.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os` via Git integration.

## Transition sources of truth

- Asset/financial: `Asset_Overview_v4`
- Tasks: `Task_Overview_613Group`
- Development: `Development_Projects_DE`

No 613 OS transition adapter may write back to these sources.

## Core entities

`Asset`, `Project`, `Task`, `Issue`, `DocumentRequirement`, `Approval`, `User`, `TaskUpdate`, `ActivityEvent`.

## MVP sequence

1. App shell
2. Home
3. My Work
4. Tasks + Task Drawer
5. Assets
6. Projects
7. Read-only adapters
8. Hotel 57 pilot
9. Gantt + dependencies
10. Notifications/search

## Current implementation status

- New Drive folder `613 OS`: created.
- Persistent Drive architecture document: created and maintained.
- Dedicated GitHub repository: `MeisnerMax/613-OS`, default branch `main`.
- GitHub repository is public; real `.env`, `.env.local` and `.env.*.local` files are excluded by `.gitignore` and must never be committed.
- Vercel project: `613-os`, Git integration connected to `MeisnerMax/613-OS` branch `main`.
- Production URL: `https://613-os.vercel.app`.
- `vercel.json` explicitly sets the `nextjs` framework preset; this replaced the stale Vercel `public` output-directory behavior from the initially empty project.
- Current app slice: Home, My Work, Tasks, Assets and Projects routed through read-only contracts.
- Exact Sheet source contracts are documented in `SOURCE_CONTRACTS.md`.
- Transition adapter API exposes read methods only; no production Sheet write method exists.
- Real Google Sheets REST task reader uses HTTP GET only and requires `https://www.googleapis.com/auth/spreadsheets.readonly`.
- Google Workspace OAuth uses Authorization Code + PKCE, short-lived access only (`access_type=online`), HTTP-only cookies and no persisted refresh token.
- v0.5 hardening: granted OAuth scopes are validated; `spreadsheets.readonly` is required and a broader Sheets scope is explicitly rejected.
- v0.5 hardening: Google identity requires `sub`, `email_verified=true` and, when configured, an exact Google Workspace hosted-domain (`hd`) match. Email-domain suffix matching is not used as the Workspace trust decision.
- Stable Google `sub`, email and hosted domain are stored in short-lived HTTP-only session cookies alongside the access token.
- OAuth transient state/PKCE cookies are cleared on completed/error callback paths.
- `/api/auth/status` exposes only safe connection/gate status and never the access token or OAuth client secret.
- `/tasks` shows Google Workspace connection state and keeps the live source visibly locked until all gates pass.
- Server-side live Task provider requires all of: `OPS_TASK_SOURCE=google-sheets-read-only`, `OPS_ALLOW_LIVE_TASK_DISPLAY=true`, `OPS_TASK_PARITY_APPROVED=true`, authenticated Google Workspace session. Otherwise it falls back to `mock-read-only`.
- Task source parity remains: 44 populated `DATA` records; 32 active Max-owned tasks; `MY TASKS` contains the same 32 IDs.
- `My Work` filters by configured owner and excludes `Done` tasks.
- OAuth setup and safe activation instructions are in `OAUTH_SETUP.md`.
- A real Google OAuth Web client has been created by the user. Its values are intentionally not stored in GitHub or the persistent snapshot. They must be stored only as runtime environment variables.

## Verification status v0.5 + deployment

Passed:

- `NO_WRITE_METHODS_FOUND`
- `TYPESCRIPT_PARSE_OK files=37`
- `READ_ONLY_ADAPTER_VERIFICATION_OK`
- `GOOGLE_SHEETS_READONLY_READER_VERIFICATION_OK`
- `PROVIDER_SELECTOR_AND_AUTH_VERIFICATION_OK`
- `GOOGLE_OAUTH_VALIDATION_OK`
- `MY_WORK_OWNER_FILTER_VERIFICATION_OK`
- Static preview JavaScript syntax check passed.
- GitHub readback confirms application source is present on `main` and `.env.local` is absent.
- Vercel production build for commit `f065ab6f91db9272ee9d85786b0450fe32b259d1` passed dependency installation, Next.js compilation, TypeScript, page-data collection and route generation.
- Vercel generated the expected dynamic OAuth/API routes and static application routes.
- Production deployment reached `READY` with no alias error.
- `https://613-os.vercel.app` returns HTTP 200 with the 613 OS application.
- `https://613-os.vercel.app/api/auth/status` returns HTTP 200 and currently reports `oauthConfigured=false`, `authenticated=false`, `taskSourceRequested=mock-read-only`, `taskParityApproved=false`, `liveTaskDisplayEnabled=false`.

Still to verify:

- Vercel runtime OAuth configuration: `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` must be entered in Vercel Environment Variables. The current connector exposes no environment-variable write action, so this cannot be set programmatically from the current session.
- Google Cloud must authorize the exact production redirect URI `https://613-os.vercel.app/api/auth/google/callback`.
- Google OAuth end-to-end sign-in must then be completed interactively by an allowed Google user.
- After login, Task live parity must be run with a short-lived `spreadsheets.readonly` token before any live display gate is enabled.

## Live activation status

Live Task display remains deliberately locked:

```env
OPS_TASK_SOURCE=mock-read-only
OPS_ALLOW_LIVE_TASK_DISPLAY=false
OPS_TASK_PARITY_APPROVED=false
```

Do not change those values merely because source-level parity or the production build passed. First complete the OAuth/runtime checks in `OAUTH_SETUP.md`.

## Handoff

When continuing in a new chat:

1. Read the persistent Drive architecture document fully.
2. Inspect the full current 613 OS code before changing anything.
3. Verify current implementation state.
4. Produce a checked plan for the next work step.
5. Keep all current production sources untouched unless Max explicitly authorizes a specific write.
6. Run available checks and update architecture after structural changes.
7. Current code snapshot: `613-os-v0.5.zip`; deployed source is additionally persisted in GitHub `MeisnerMax/613-OS` on `main`.
8. Current production URL: `https://613-os.vercel.app`.
9. Immediate next step: set the real Google OAuth client ID/secret as Vercel runtime environment variables, authorize `https://613-os.vercel.app/api/auth/google/callback` in Google Cloud, redeploy, and verify `/api/auth/status` reports `oauthConfigured=true`.
10. Then complete Google sign-in interactively and run `verify:task-parity` with the authenticated read-only token.
11. Only after that passes may Task live display be deliberately enabled.
12. After Task live activation is approved, implement equivalent read-only live readers/parity for Assets and Development, beginning with Hotel 57, then continue to Gantt/dependencies.
