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

- Persistent Drive architecture document exists and is maintained.
- GitHub repository: `MeisnerMax/613-OS`, default branch `main`.
- Repository is public; real `.env`, `.env.local` and `.env.*.local` files are excluded by `.gitignore` and must never be committed.
- Vercel project: `613-os`; Production URL: `https://613-os.vercel.app`.
- `vercel.json` explicitly sets the `nextjs` framework preset.
- Current production app slice: Home, My Work, Tasks, Assets and Projects.
- Exact Sheet source contracts are documented in `SOURCE_CONTRACTS.md`.
- Transition adapters expose read methods only; no production Sheet write method exists.
- Google Sheets REST client uses HTTP GET only and requires `https://www.googleapis.com/auth/spreadsheets.readonly`.
- Google Workspace OAuth uses Authorization Code + PKCE, short-lived access only (`access_type=online`), HTTP-only cookies and no persisted refresh token.
- Granted OAuth scopes are validated; `spreadsheets.readonly` is required and broader Sheets permission is rejected.
- Google identity requires `sub`, `email_verified=true` and, when configured, an exact Google Workspace hosted-domain (`hd`) match.
- OAuth transient state/PKCE cookies are cleared on completed/error callback paths.
- `/api/auth/status` exposes only safe connection/gate status and never tokens or secrets.
- Task live provider remains protected by source, display, parity and authenticated-session gates.
- Task source parity baseline remains: 44 populated `DATA` records; 32 active Max-owned tasks; `MY TASKS` contains the same 32 IDs.
- `My Work` filters by configured owner and excludes `Done` tasks.

## OAuth runtime status

- Real Google OAuth Web client exists; credentials are stored only in Vercel Environment Variables, not in source control.
- Production runtime now reports both OAuth variables present and `oauthConfigured=true`.
- OAuth start endpoint returns the expected Google authorization redirect with PKCE/S256 and `spreadsheets.readonly`.
- The previously incorrect Client-ID placeholder was corrected; Google now receives the actual OAuth Client ID rather than the secret.
- Production redirect URI used by the app is exactly `https://613-os.vercel.app/api/auth/google/callback`.
- The user has added that exact URI under Google Cloud `Authorized redirect URIs`; Google notes propagation can take from minutes to several hours.
- Interactive OAuth sign-in is not yet marked complete. The last observed Google result before adding the URI was `400 redirect_uri_mismatch`; retry after propagation is required.

## Feature branch: read-only Assets + Hotel 57

Branch: `feature/read-only-assets-hotel57`

Implemented without changing any production Sheet:

- `GoogleSheetsAssetReader` reads `Asset_Overview_v4` → `Asset_Master` using the existing read-only Sheets client.
- `GoogleSheetsDevelopmentWorkPackageReader` reads the Hotel 57 pilot tab `004_Hotel_57` only for `PRJ-0001`; unknown project IDs do not trigger a Sheet request.
- New tokenless verification fixture covers the live source shapes for `Asset_Master` and Hotel 57, including header-row normalization, German priorities, duration, calendar flag and plan offset.
- New live parity commands are prepared for post-login use:
  - `npm run verify:asset-parity`
  - `npm run verify:hotel57-parity`
- Both parity commands require only a short-lived `GOOGLE_SHEETS_ACCESS_TOKEN` carrying `spreadsheets.readonly`.
- The feature-branch build now runs `npm run verify:read-only` before `next build`.
- No Asset or Development live data has been wired into Production UI yet; no new live-display gate has been enabled.

## Source observations checked read-only on 2026-08-07

- `Asset_Master` header row is 3 and currently exposes 19 populated asset rows in the checked range.
- Current status distribution observed in `Asset_Master`: 9 Active, 8 Under examination, 2 Sold.
- Hotel 57 development tab header row is 9 and the checked live rows match the documented 15-column contract.
- Current Hotel 57 rows include active work packages such as ID 7 `3D-Aufmaß des Bestands`, ID 8 `Fotos und Raumbuch`, and ID 9 `Denkmal-Bestand bewerten`.
- These observations were read only through the connected Google Drive/Sheets interface; no source values were edited.

## Verification status

Production/OAuth checks already passed:

- Vercel Production build and routing are healthy.
- `https://613-os.vercel.app` returns HTTP 200.
- Production `/api/auth/status` reports `oauthConfigured=true`, `clientIdConfigured=true`, `clientSecretConfigured=true`.
- OAuth start endpoint returns HTTP 307 to Google with the correct Client ID, redirect URI, PKCE challenge and `spreadsheets.readonly` scope.

Feature-branch Preview commit `44edc905933927148bc78adfc29e1c310e5fe737` passed before the later parity-script-only additions:

- `READ_ONLY_ADAPTER_VERIFICATION_OK`
- `GOOGLE_SHEETS_READONLY_READER_VERIFICATION_OK`
- `GOOGLE_SHEETS_OPERATIONAL_READERS_VERIFICATION_OK`
- `PROVIDER_SELECTOR_AND_AUTH_VERIFICATION_OK`
- `GOOGLE_OAUTH_VALIDATION_OK`
- `MY_WORK_OWNER_FILTER_VERIFICATION_OK`
- Next.js compilation passed.
- TypeScript passed.
- Static/dynamic routes generated successfully.
- Vercel Preview reached `READY` with no alias error.

The latest branch commits adding the live Asset/Hotel57 parity scripts must also finish their automatic Preview build before merge consideration.

## Live activation status

Task live display remains deliberately locked unless all existing gates are explicitly enabled after successful interactive auth + parity:

```env
OPS_TASK_SOURCE=mock-read-only
OPS_ALLOW_LIVE_TASK_DISPLAY=false
OPS_TASK_PARITY_APPROVED=false
```

Do not enable live Assets or Development merely because their readers compile. First complete authenticated live parity and decide the Asset task/project-count join strategy before exposing Asset rows in the UI.

## Handoff

When continuing in a new chat:

1. Read the persistent Drive architecture document fully.
2. Inspect the full current 613 OS code before changing anything.
3. Verify current implementation state.
4. Produce a checked plan before each work step.
5. Keep all production sources read-only unless Max explicitly authorizes a specific write.
6. Production source is GitHub `MeisnerMax/613-OS` on `main`; current isolated work is on `feature/read-only-assets-hotel57`.
7. Production URL: `https://613-os.vercel.app`.
8. OAuth credentials are present in Vercel and OAuth request generation is correct. The exact Google redirect URI has been added; retry interactive sign-in after propagation.
9. After successful sign-in, run Task parity with a short-lived read-only token. Do not enable live Task display before that passes.
10. Then run `verify:asset-parity` and `verify:hotel57-parity` on the feature branch using the same class of short-lived read-only token.
11. Before exposing live Assets, define and verify task/project count joins so the UI does not replace current counts with zeros.
12. Before merging the feature branch, require the latest Vercel Preview to be `READY` with the read-only suite and TypeScript passing.
13. After safe read-only integration, continue with the Hotel 57 Gantt/dependency pilot.
