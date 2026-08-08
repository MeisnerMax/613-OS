# 613 OS · Architecture & Handoff

## Immutable rules

- Existing production source files are READ ONLY unless the user later gives an explicit file-specific write instruction.
- Do not modify `Task_Overview_613Group`, `Development_Projects_DE`, `Asset_Overview_v4`, existing production calendars, or other current production source files from 613 OS transition code.
- New development happens only in isolated 613 OS resources/branches until verified.
- Before every work step: checked plan. After every work step: verification.
- Keep this file and the persistent Drive document `613 OS · Architecture & Handoff` current.
- Never commit credentials, OAuth secrets, database URLs, or real task payloads to the public repository.

## Product goal

613 OS is the internal operations application for Asset Management, Development, Tasks, Issues, Documents, Approvals, Team/Workload and management reporting.

## Technical architecture

- Frontend: Next.js App Router + React + TypeScript.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os`.
- Database: Neon PostgreSQL project `613 OS Production` (`restless-tree-08180513`).
- Authentication: Google Workspace OAuth with server-side token handling and exact allowed-domain gate.
- Google Drive remains document storage by reference.
- Google Calendar remains the home for real appointments, inspections, deadlines and milestones; project timelines belong in the application/Gantt layer.
- Legacy Google Sheets are migration/read-only sources during transition. 613 OS must not write back to them.

## Source-of-truth status · 08.08.2026

### Tasks

PostgreSQL is the operative production source of truth.

- One-time legacy migration: 44 DATA + 31 ARCHIVE = 75 unique Tasks.
- IDs `TSK-0001` through `TSK-0075` are complete.
- Full normalized field parity passed.
- Task read/write runtime is production verified.
- Task updates/comments and activity audit events are persisted in PostgreSQL.
- Task creation uses concurrency-safe ID allocation.
- Task edits use optimistic concurrency through `version`; stale updates return HTTP 409.
- `Task_Overview_613Group` is historical read-only migration input only and receives no writeback.

Production gates:

```env
OPS_TASK_SOURCE=postgres
OPS_TASK_DB_APPROVED=true
OPS_TASK_DB_WRITES_ENABLED=true
```

### Assets

PostgreSQL is now the approved production runtime source for the migrated Asset Master snapshot.

- 19/19 unique Assets migrated and verified.
- Status distribution: 9 Active / 8 Under examination / 2 Sold.
- Full-field Asset Master checksum matched the approved source snapshot before cutover.
- `/assets` is request-time dynamic so the Workspace session gate is evaluated per request.
- `/assets/[id]` exposes the approved read-only PostgreSQL snapshot, including physical and financial fields.
- Task counts are deliberately labeled `Direct open tasks`; generic `Hotels` Tasks are not guessed onto individual Assets.
- `Asset_Overview_v4` remains a read-only legacy/reference source and receives no writeback.

Production gates:

```env
OPS_ASSET_SOURCE=postgres
OPS_ASSET_DB_APPROVED=true
```

### Development

Development is migrated project-by-project. Only explicitly migrated projects may use PostgreSQL detail data.

Current production pilot:

- `PRJ-0001` → Asset `A004` (Hotel 57).
- 72/72 work packages migrated in source order 1–72.
- Status distribution: 4 Erledigt / 6 In Bearbeitung / 62 Nicht begonnen.
- Full-field project header and work-package parity passed before cutover.
- `/projects/PRJ-0001` exposes the migrated project when the Workspace/database gates pass.
- Other Development projects remain transition/mock summaries until separately migrated and verified.
- `Development_Projects_DE` remains read-only and receives no writeback.

Production gates:

```env
OPS_DEVELOPMENT_SOURCE=postgres
OPS_DEVELOPMENT_DB_APPROVED=true
```

## Runtime security model

Task, Asset and Development database access is fail-closed.

Database-backed reads require:

1. configured `DATABASE_URL`,
2. the relevant `OPS_*_SOURCE=postgres` request mode,
3. the relevant `OPS_*_DB_APPROVED=true` approval gate,
4. an authenticated Google Workspace session,
5. exact hosted-domain match against `GOOGLE_WORKSPACE_ALLOWED_DOMAIN`.

Task writes additionally require `OPS_TASK_DB_WRITES_ENABLED=true`.

Asset/Development runtime store remains read-only. Build verification rejects `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` in that runtime store.

## Production verification · 08.08.2026

Production `main` commit:

`201682f99b067e08d20346b02a9535294add508c`

Vercel Production deployment:

`dpl_2CKZZXaWLWRb3kX3yxZdCvSo61JP` — READY

Build checks passed:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- TypeScript
- Next.js 16.3.0

Authenticated production `/api/verify/portfolio-db` returned `ok=true` with:

- Tasks: 75 total / 75 distinct
- Assets: 19 total / 19 distinct / 9 Active / 8 Under examination / 2 Sold
- Hotel 57: one `PRJ-0001` project linked to `A004`
- Work packages: 72 total / 72 distinct / order 1–72 / 4 done / 6 in progress / 62 not started
- both Asset and Hotel-57 migration markers `completed` with expected/imported counts equal

Unauthenticated `/api/verify/portfolio-db` remains protected with HTTP 401 `AUTH_REQUIRED`.

No Vercel runtime errors were found after the cutover.

## Important implementation detail

A final pre-production review caught that `/assets` had been statically prerendered. That would have evaluated the Workspace provider gate at build time rather than per request. `/assets` is now `force-dynamic`, and the portfolio build verifier asserts this requirement so the issue cannot silently regress.

## Phase 2 Development migration strategy

New Development projects must be migrated individually and must not be bulk-activated without verification.

For each next project:

1. Read the corresponding `Development_Projects_DE` source tab only.
2. Record source `modifiedTime` immediately before snapshot/import.
3. Normalize header whitespace and source priority values consistently with the existing Hotel-57 importer/model.
4. Build the project header + ordered work-package snapshot outside the public repository when it contains real operational content.
5. Verify unique project ID, Asset link, unique work-package IDs/order and required fields.
6. Import first on an isolated Neon branch cloned from current Production.
7. Run full-field parity/checksum and verify the existing 75 Tasks, 19 Assets and already migrated Development data are unchanged.
8. Update code only where needed for generic multi-project rendering; do not duplicate project-specific logic.
9. Require green Vercel Preview: all existing Task checks, portfolio checks, TypeScript, Next.js and relevant routes.
10. Only then consider Production data import/activation. Production schema/data changes require explicit approval when they are not already covered by a prior specific approval.

## Current development branch

`feature/development-migration-phase-2`

Purpose: begin the next separately verified Development project migration while keeping Production unchanged until validation is complete.

## Handoff

1. Production Tasks are PostgreSQL read/write and verified at 75/75.
2. Production Assets are PostgreSQL read-only runtime and verified at 19/19.
3. Production Development currently contains only the fully verified Hotel 57 pilot (`PRJ-0001` → `A004`, 72/72 work packages).
4. Production portfolio gates are active and authenticated `/api/verify/portfolio-db` is `ok=true`.
5. Existing Google Sheets remain read-only legacy/reference sources; do not write back.
6. Continue Development migrations one project at a time from `feature/development-migration-phase-2`.
7. Before selecting/importing the next project, inspect `Development_Projects_DE` read-only and choose the next source tab based on actual available/complete source data rather than hard-coded mock order.
8. Keep Production untouched until the isolated snapshot, Neon parity and Vercel Preview for the next project are all green.
