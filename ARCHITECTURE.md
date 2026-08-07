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
- Asset/financial and Development sources remain read-only Google Sheets during transition.
- Drive: document storage by reference.
- Calendar: actual meetings, inspections, deadlines and milestones; long project timelines stay in Gantt.
- Authentication: Google Workspace OAuth with server-side token handling.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os` via Git integration.

## Source-of-truth rules

- Asset/financial: `Asset_Overview_v4` remains transition source of truth.
- Tasks: PostgreSQL is the operative source. `Task_Overview_613Group` is frozen historical migration input only and receives no writeback.
- Development: `Development_Projects_DE` remains transition source of truth.
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

## Verification status

Passed on Vercel Preview and Production:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- optimistic version input validation and HTTP 409 mapping
- Next.js 16.3 compilation
- TypeScript
- route generation for `/tasks`, `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/updates`, `/api/verify/task-db`, `/api/verify/task-db-write`, `/verify/task-db-write`

Database/runtime verification passed:

- 75 total tasks
- 44 DATA / 31 ARCHIVE
- 75 distinct IDs
- 0 missing IDs across TSK-0001..TSK-0075
- normalized DB checksum equals source snapshot checksum
- 43 legacy task updates
- 75 legacy audit events
- migration status completed 75/75
- authenticated Production `/api/verify/task-db` returned `ok=true`
- Production runtime reports `taskDatabaseWritesEnabled=true`
- reversible write probe used temporary `TSK-0076` and passed create/update/taskUpdate/auditTrail/cleanup
- write probe baselineCount=75 and finalCount=75
- direct Neon post-test check confirmed zero test residue
- after production hardening and CRUD deployment, direct Neon checks remained 75 total / 75 distinct / 0 active WEBAPP tasks
- unauthenticated Production `/api/tasks` returns HTTP 401 `AUTH_REQUIRED` with `Cache-Control: no-store`

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

Production hardening and productive Task CRUD are both on `main`. Commit `bb6fe97b774c11eadb66203f4017e38e32cabb5e` deployed successfully to Vercel Production and is READY. Deployment itself changed no Task rows: direct Neon verification after rollout remained 75 tasks / 75 distinct IDs / 0 WEBAPP tasks. The next major product block is Asset/Development transition work; their existing Sheets remain read-only until their own checked migrations are approved.

## Handoff

1. Read the persistent Drive architecture document fully.
2. Inspect current GitHub `main` before changes.
3. Existing production Sheets remain read-only and must not be modified.
4. PostgreSQL contains the verified 75-task legacy migration and is the operative Task source of truth.
5. Authenticated Production read and reversible write verification are complete; write gate is enabled.
6. Production hardening is complete: concurrency-safe Task IDs and explicit `no-store` for session/Task API responses.
7. Productive Task CRUD is live on `/tasks`: create/edit operational fields and add updates/comments against PostgreSQL.
8. Optimistic concurrency is active through Task version checks; stale edits return HTTP 409 and local drafts are not automatically discarded.
9. Latest post-deploy database verification is 75 total / 75 distinct / 0 WEBAPP tasks, so the rollout itself changed no Task data.
10. Next checked engineering block: continue Asset/Development integration separately. Do not reintroduce Task Sheet synchronization or writeback.
