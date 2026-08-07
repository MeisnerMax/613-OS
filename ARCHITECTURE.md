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
- Safe authenticated reversible write verifier available at `/verify/task-db-write` and POST `/api/verify/task-db-write`; it requires the write gate, refuses to run unless the active task baseline is exactly 75, creates only a temporary WEBAPP test task, verifies create/update/comment/audit, removes the test task and its test audit data, and requires the final active task count to return to 75.

## Verification status

Passed on Vercel Preview and Production code builds:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- Next.js 16.3 compilation
- TypeScript
- route generation for `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/updates`, `/api/verify/task-db`, `/api/verify/task-db-write`, `/verify/task-db-write`

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
- direct Neon post-test check: TSK-0076 task rows=0, task_updates=0, activity_events=0, active WEBAPP test tasks=0

## Current activation status

PostgreSQL Task reads and writes are now production-verified and operationally approved. Production uses:

```env
DATABASE_URL=<server-side Neon connection>
GOOGLE_WORKSPACE_ALLOWED_DOMAIN=613investmentgroup.com
OPS_TASK_SOURCE=postgres
OPS_TASK_DB_APPROVED=true
OPS_TASK_DB_WRITES_ENABLED=true
```

The original Task Sheet remains historical/read-only migration input and receives no writeback. Do not commit `DATABASE_URL` or any database credential.

Before broad user-facing CRUD rollout, address two hardening items already identified during review: make Task ID allocation concurrency-safe instead of relying on `MAX(id)+1`, and make session-derived status responses explicitly `Cache-Control: no-store`. Then wire create/edit/update UX against the verified PostgreSQL APIs.

## Handoff

1. Read the persistent Drive architecture document fully.
2. Inspect current GitHub `main` before changes.
3. Existing production Sheets remain read-only and must not be modified.
4. PostgreSQL contains the verified 75-task legacy migration and is the operative Task source of truth.
5. Authenticated Production read verification is complete: 75/75 tasks and migration completed 75/75.
6. User explicitly approved writes; Production runtime has `OPS_TASK_DB_WRITES_ENABLED=true`.
7. Reversible Production write verification passed completely using temporary TSK-0076, and direct Neon verification confirmed zero test residue and final task count 75.
8. Task read/write backend is production-verified. Do not revert to Sheets synchronization or writeback.
9. Next checked engineering step: concurrency-safe Task ID allocation plus `no-store` hardening for session-derived status responses, tested on a feature branch before main.
10. After that, wire the user-facing Task CRUD UI (create/edit/status/owner/deadline/waiting/next step/update history) to the verified APIs, then continue Asset/Development transition work separately.
