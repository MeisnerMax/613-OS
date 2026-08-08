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
- Tasks: PostgreSQL is the operative source of truth after one-time migration from `Task_Overview_613Group`.
- Asset/financial and Development sources remain read-only Google Sheets during transition until each PostgreSQL migration is separately verified and approved.
- Drive: document storage by reference.
- Calendar: actual meetings, inspections, deadlines and milestones; long project timelines stay in Gantt.
- Authentication: Google Workspace OAuth with server-side token handling.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os` via Git integration.

## Source-of-truth rules

- Asset/financial: `Asset_Overview_v4` remains transition source of truth until the Asset migration is explicitly activated.
- Tasks: PostgreSQL is the operative source. `Task_Overview_613Group` is frozen historical migration input only and receives no writeback.
- Development: `Development_Projects_DE` remains transition source of truth until each Development project migration is explicitly activated.
- No 613 OS transition adapter may write back to existing production Sheets.

## Task migration milestone · 07.08.2026

- One-time source snapshot checked: 44 DATA tasks + 31 ARCHIVE tasks = 75 unique IDs.
- IDs are complete from `TSK-0001` through `TSK-0075`, with no gaps and no duplicates.
- Neon PostgreSQL project created for 613 OS; database credentials are not committed to GitHub.
- Production database schema created with tasks, task_updates, activity_events and migration_runs.
- All 75 legacy tasks imported into PostgreSQL.
- DATA/ARCHIVE counts after import: 44 / 31.
- Full normalized field checksum matched the external migration snapshot exactly.
- 43 legacy progress values were migrated into task update history.
- 75 legacy import audit events were written.
- Migration record reports 75 imported and status completed.
- One malformed legacy cell on TSK-0071 contained action text in the date-only `Next step by` column; it was losslessly normalized into `Next step` and `Next step by` remains empty.
- Existing Task Sheet was not modified.

## PostgreSQL task application layer

- PostgreSQL task reader/writer implemented and verified.
- PostgreSQL activation is fail-closed. It requires `OPS_TASK_SOURCE=postgres`, `OPS_TASK_DB_APPROVED=true`, `DATABASE_URL`, an authenticated Workspace session and an exact allowed Workspace domain match.
- Task writes are independently fail-closed and additionally require `OPS_TASK_DB_WRITES_ENABLED=true`.
- Without every read gate, the app falls back to the isolated mock source.
- Task create/update APIs validate a whitelist of supported fields.
- Task writes produce activity audit events.
- Task updates/comments are stored separately in `task_updates`.
- Real task values and database credentials are never committed to the public repository.
- Safe authenticated runtime verifier available at `/api/verify/task-db`; it returns counts/ID coverage/migration status but no task content or credentials.
- Safe authenticated reversible write verifier available at `/verify/task-db-write` and POST `/api/verify/task-db-write`.
- Task ID allocation is concurrency-safe without changing legacy IDs: insert attempts use the primary-key conflict as the arbiter and retry with a bounded limit instead of allowing duplicate IDs under concurrent creates.
- Session-derived auth status and Task API responses explicitly use `Cache-Control: no-store`.
- Task edits use optimistic concurrency through the existing database `version` field. The UI sends the loaded version; stale writes return HTTP 409 rather than silently overwriting another user's change. Unsaved local edits remain visible until the user explicitly reloads the newer server version.

## Productive Task CRUD UI

- `/tasks` keeps the existing status views and table while adding a productive `New task` action.
- New Tasks can set title, property/project, category, status, priority, owner, support, deadline, next step, next-step date, waiting dependency/date, info and description/progress.
- Existing Tasks can edit the same operational fields directly in the Task drawer.
- Updates/comments can be added from the drawer and are persisted in `task_updates` with audit events.
- Saved and newly created Tasks update the visible client table without a full page reload.
- Unsaved drawer changes require confirmation before closing.
- Updates/comments are blocked while field edits are unsaved so an activity refresh cannot discard draft changes.
- UI handles concurrent field edits explicitly through the 409 conflict path and requires an explicit `Reload latest` before editing the newer version.
- Intentionally clearing a description remains cleared; it does not fall back to legacy progress text.
- CRUD-specific CSS is scoped to the Tasks route; global application styling was not broadly rewritten.
- No Delete function was added; completion remains represented by Task status `Done`.

## Asset + Development PostgreSQL pilot · 07.08.2026

- Pilot development is isolated on GitHub branch `feature/asset-development-postgres-pilot` and Neon branch `br-old-mud-a6ify2sw` (`asset-development-pilot-2026-08-07`). Neon Production main remains unchanged.
- Source files were read/exported only. `Asset_Overview_v4` and `Development_Projects_DE` were not modified.
- Full `Asset_Master` pilot snapshot contains 19 unique Assets: 9 Active, 8 Under examination and 2 Sold.
- Hotel 57 is the first Development pilot: `PRJ-0001` links to Asset `A004`; project start 12.07.2026, planned completion 15.04.2028, source status `Planung`, source stand 07.08.2026.
- Hotel 57 contains 72 unique work packages in source order 1–72: 4 `Erledigt`, 6 `In Bearbeitung`, 62 `Nicht begonnen`.
- Full-field database parity passed on the isolated Neon branch. Canonical MD5 values are Asset Master `211bebe45157b6156666f6e4ad3e4a58`, Hotel 57 project header `9c8149173037a1744dcd026586686c20`, and all work packages `761af437cedbc4db126223967480af84`.
- Two isolated migration records report completed counts 19/19 and 72/72. Existing Task data on the same temporary branch remains 75 total / 75 distinct IDs.
- Additive schema introduces only `assets`, `development_projects`, `development_work_packages`, their constraints/FKs and indexes. Schema diff shows no modification to existing Task tables, views, functions, roles, permissions, triggers, policies or extensions.
- Runtime Asset/Development store is read-only during the pilot. Build verification rejects `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` in this runtime store.
- Asset and Development activation are independent and fail-closed: `OPS_ASSET_SOURCE=postgres` + `OPS_ASSET_DB_APPROVED=true`, and `OPS_DEVELOPMENT_SOURCE=postgres` + `OPS_DEVELOPMENT_DB_APPROVED=true`, in addition to configured database and verified 613 Workspace session/domain.
- `/assets` can use the 19-Asset PostgreSQL snapshot and `/assets/[id]` exposes physical and financial Asset Master detail read-only. The UI labels task counts `Direct open tasks` because 12 current Tasks use the generic `Hotels` bucket and must not be guessed onto individual Assets.
- The Asset project count is labeled `Migrated projects` during staged rollout. Only Hotel 57 is currently in the Development pilot.
- `/projects/PRJ-0001` exposes the complete Hotel 57 project header, current focus and all 72 work packages when the Development gate is approved. Other Development projects remain on the current transition view until separately migrated and verified.
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK` is part of every build alongside all existing Task verification scripts.
- Production schema/data and Vercel Asset/Development gates have NOT been changed yet. Production migration requires explicit approval after the final Preview build.

## Verification status

Passed on Vercel Preview and Production for Tasks:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- optimistic version input validation and HTTP 409 mapping
- Next.js 16.3 compilation
- TypeScript
- route generation for `/tasks`, `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/updates`, `/api/verify/task-db`, `/api/verify/task-db-write`, `/verify/task-db-write`

Asset/Development pilot verification:

- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- first complete pilot Preview passed all Task checks, the portfolio pilot check, TypeScript and Next.js with dynamic `/projects/[id]`
- isolated Neon parity: 19/19 Assets and 72/72 Hotel 57 work packages with exact full-field MD5 matches
- schema diff is additive only
- latest Asset-detail Preview must pass before Production migration approval

Database/runtime verification passed:

- 75 total tasks
- 44 DATA / 31 ARCHIVE
- 75 distinct Task IDs
- migration status completed 75/75
- authenticated Production Task read/write verification complete
- after Task CRUD deployment, direct Neon checks remained 75 total / 75 distinct / 0 active WEBAPP tasks
- Asset/Development temporary branch retained those 75 Tasks unchanged while adding the isolated 19/1/72 pilot dataset

## Current activation status

PostgreSQL Task reads and writes are production-verified and operationally approved. Production uses:

```env
DATABASE_URL=<server-side Neon connection>
GOOGLE_WORKSPACE_ALLOWED_DOMAIN=613investmentgroup.com
OPS_TASK_SOURCE=postgres
OPS_TASK_DB_APPROVED=true
OPS_TASK_DB_WRITES_ENABLED=true
```

The original Task Sheet remains historical/read-only migration input and receives no writeback. Do not commit `DATABASE_URL` or any database credential.

Asset and Development PostgreSQL sources remain intentionally NOT activated in Production. Their existing Sheets remain authoritative transition sources until the additive Production schema, 19 Asset records and Hotel 57 pilot are explicitly approved, migrated, parity-checked again, and the independent Vercel gates are enabled.

## Handoff

1. Read the persistent Drive architecture document fully.
2. Inspect current GitHub `main` and `feature/asset-development-postgres-pilot` before changes.
3. Existing production Sheets remain read-only and must not be modified.
4. Tasks remain fully production-operative in PostgreSQL with verified 75-task migration and CRUD.
5. Asset/Development pilot is isolated on Neon `br-old-mud-a6ify2sw`; Production Neon main has not received the new tables or data.
6. Isolated pilot parity is complete: 19 Assets, 1 Hotel 57 Development project, 72 work packages; exact full-field MD5 checks match source snapshots.
7. Task data on the isolated branch remains unchanged at 75/75.
8. Asset/Development runtime code is fail-closed and read-only, with separate approval gates. Shared `Hotels` Tasks are deliberately not guessed onto individual Assets.
9. Before Production migration: require final Feature Preview to pass all Task checks, `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`, TypeScript, Next.js, `/assets/[id]` and `/projects/[id]` route generation.
10. After final Preview, obtain explicit approval before applying the additive schema/data to Neon Production main. Then re-run 19/19 + 72/72 full-field parity before enabling Vercel Asset/Development gates. Do not reintroduce Sheet writeback.
