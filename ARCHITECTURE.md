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

- PostgreSQL task reader/writer implemented and verified on `feature/postgres-task-store`.
- PostgreSQL activation is fail-closed. It requires `OPS_TASK_SOURCE=postgres`, `OPS_TASK_DB_APPROVED=true`, `DATABASE_URL`, an authenticated Workspace session and an exact allowed Workspace domain match.
- Without every gate, the app falls back to the isolated mock source.
- Task create/update APIs validate a whitelist of supported fields.
- Task writes produce activity audit events.
- Task updates/comments are stored separately in `task_updates`.
- Real task values and database credentials are never committed to the public repository.

## Verification status

Passed on Vercel Preview for the PostgreSQL branch:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- Next.js 16.3 compilation
- TypeScript
- route generation for `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/updates`
- Preview deployment READY

Database verification passed:

- 75 total tasks
- 44 DATA / 31 ARCHIVE
- 75 distinct IDs
- 0 missing IDs across TSK-0001..TSK-0075
- normalized DB checksum equals source snapshot checksum
- 43 legacy task updates
- 75 legacy audit events
- migration status completed

## Current activation status

The database is populated and verified, but Production remains fail-closed until runtime configuration is connected and tested. Required runtime gates:

```env
DATABASE_URL=<server-side Neon connection>
GOOGLE_WORKSPACE_ALLOWED_DOMAIN=613investmentgroup.com
OPS_TASK_SOURCE=postgres
OPS_TASK_DB_APPROVED=true
```

Do not commit `DATABASE_URL` or any database credential. Set it only as a server-side Vercel environment variable/integration value.

## Handoff

1. Read the persistent Drive architecture document fully.
2. Inspect current GitHub `main` before changes.
3. Existing production Sheets remain read-only and must not be modified.
4. PostgreSQL contains the verified 75-task legacy migration and is the intended Task source of truth.
5. PostgreSQL task code passed Preview verification and may be fast-forwarded to `main`; runtime stays mock until all DB gates are configured.
6. After merge, connect `DATABASE_URL` in Vercel without exposing it, configure `GOOGLE_WORKSPACE_ALLOWED_DOMAIN=613investmentgroup.com`, request `OPS_TASK_SOURCE=postgres`, and explicitly set `OPS_TASK_DB_APPROVED=true` only for the runtime test.
7. Redeploy, sign in with the 613 Workspace account, verify the Tasks UI reads PostgreSQL, and test one controlled task write with audit verification before declaring the Sheet transition complete.
8. After PostgreSQL task activation is proven, remove the obsolete Google Sheets task scope/path from OAuth and retain Sheets adapters only for Assets/Development where still needed.
