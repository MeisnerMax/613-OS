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
- Tasks: PostgreSQL is the new operative source of truth after one-time migration from `Task_Overview_613Group`.
- Asset/financial and Development sources remain read-only Google Sheets during transition.
- Drive: document storage by reference.
- Calendar: actual meetings, inspections, deadlines and milestones; long project timelines stay in Gantt.
- Authentication: Google Workspace OAuth with server-side token handling.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os` via Git integration.

## Source-of-truth rules

- Asset/financial: `Asset_Overview_v4` remains transition source of truth.
- Tasks: PostgreSQL is the operative target source. `Task_Overview_613Group` is frozen historical migration input only and receives no writeback.
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
- Safe authenticated reversible write verifier available at `/verify/task-db-write` and POST `/api/verify/task-db-write`; it requires the write gate, refuses to run unless the active task baseline is exactly 75, creates only a temporary WEBAPP test task, verifies create/update/comment/audit, removes the test task and its test audit data, and requires the final active task count to return to 75.

## Verification status

Passed on Vercel Preview and Production code builds:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- Next.js 16.3 compilation
- TypeScript
- route generation for `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/updates`, `/api/verify/task-db`, `/api/verify/task-db-write`, `/verify/task-db-write`

Database verification passed:

- 75 total tasks
- 44 DATA / 31 ARCHIVE
- 75 distinct IDs
- 0 missing IDs across TSK-0001..TSK-0075
- normalized DB checksum equals source snapshot checksum
- 43 legacy task updates
- 75 legacy audit events
- migration status completed
- authenticated Production `/api/verify/task-db` returned `ok=true` with 75/75 and migration completed 75/75

## Current activation status

PostgreSQL reads are active and fully verified in Production. The user explicitly approved task writes on 07.08.2026 and changed the Production Vercel variable `OPS_TASK_DB_WRITES_ENABLED` from `false` to `true`. A fresh Production deployment is being triggered so the runtime can consume that value. The first write must be the reversible authenticated write verifier; no real legacy task should be used for the activation test.

Expected Production values after the fresh deployment:

```env
DATABASE_URL=<server-side Neon connection>
GOOGLE_WORKSPACE_ALLOWED_DOMAIN=613investmentgroup.com
OPS_TASK_SOURCE=postgres
OPS_TASK_DB_APPROVED=true
OPS_TASK_DB_WRITES_ENABLED=true
```

Do not commit `DATABASE_URL` or any database credential. Set it only as a server-side Vercel environment variable/integration value.

## Handoff

1. Read the persistent Drive architecture document fully.
2. Inspect current GitHub `main` before changes.
3. Existing production Sheets remain read-only and must not be modified.
4. PostgreSQL contains the verified 75-task legacy migration and is the Task source of truth.
5. PostgreSQL task code, independent write gate, safe read verifier and reversible write verifier are on `main` and have passed Vercel builds.
6. Authenticated Production read verification is complete: 75/75 tasks and migration completed 75/75.
7. User explicitly approved writes and set `OPS_TASK_DB_WRITES_ENABLED=true` for Production.
8. After the activation deployment is READY, verify `/api/auth/status` shows `taskDatabaseWritesEnabled=true`.
9. Then, from an authenticated 613 Workspace browser, open `/verify/task-db-write` and run exactly one reversible write verification. Require create/update/comment/audit/cleanup all true and baselineCount=finalCount=75.
10. After that succeeds, task writes are operationally approved. Then remove obsolete Google Sheets task scope/path from OAuth while retaining Sheets adapters only for Assets/Development where still needed.
