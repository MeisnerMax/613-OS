# 613 OS · Architecture & Handoff

## Immutable rules

- Existing production source files are READ ONLY unless the user gives an explicit file-specific write instruction.
- Do not modify `Task_Overview_613Group`, `Development_Projects_DE`, `Asset_Overview_v4`, existing production calendars, or other legacy production sources from 613 OS transition code.
- New Development migrations are staged on isolated Neon/Git branches and verified before any Production data change.
- Before every work step: checked plan. After every work step: verification.
- Keep this file and the persistent Drive document `613 OS · Architecture & Handoff` current.
- Never commit credentials, OAuth secrets, database URLs, or real operational payloads to the public repository.

## Product / technical architecture

613 OS is the internal operations application for Asset Management, Development, Tasks, Issues, Documents, Approvals, Team/Workload and management reporting.

- Frontend: Next.js App Router + React + TypeScript.
- Deployment: GitHub `MeisnerMax/613-OS` → Vercel project `613-os`.
- Database: Neon PostgreSQL project `613 OS Production` (`restless-tree-08180513`).
- Authentication: Google Workspace OAuth with server-side token handling and exact allowed-domain gate.
- Google Drive remains document storage by reference.
- Google Calendar remains the home for real appointments, inspections, deadlines and milestones; project timelines belong in the application/Gantt layer.
- Legacy Google Sheets are migration/read-only sources during transition. 613 OS must not write back to them.

## Production source-of-truth status · 08.08.2026

### Tasks

PostgreSQL is the operative Production source of truth.

- 75/75 unique Tasks migrated and verified (`TSK-0001` through `TSK-0075`).
- Task read/write runtime is Production verified.
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

PostgreSQL is the approved Production runtime source for the migrated Asset Master snapshot.

- 19/19 unique Assets migrated and verified.
- Status distribution: 9 Active / 8 Under examination / 2 Sold.
- `/assets` and `/assets/[id]` are request-time dynamic and Workspace-session gated.
- Task counts are deliberately labeled `Direct open tasks`; generic `Hotels` Tasks are not guessed onto individual Assets.
- `Asset_Overview_v4` remains read-only and receives no writeback.

Production gates:

```env
OPS_ASSET_SOURCE=postgres
OPS_ASSET_DB_APPROVED=true
```

### Development

Development is migrated project-by-project. PostgreSQL project detail is available only for project IDs that exist in the approved Development store.

Current Production:

- `PRJ-0001` → `A004` (Hotel 57): 72/72 packages, 4 Erledigt / 6 In Bearbeitung / 62 Nicht begonnen.
- `PRJ-0002` → `A005` (Hahnmühle): 72/72 packages, 3 Erledigt / 7 In Bearbeitung / 62 Nicht begonnen.
- `PRJ-0003` → `A010` (Square): 72/72 packages, 3 Erledigt / 5 In Bearbeitung / 64 Nicht begonnen.
- `PRJ-0004` → `A008` (Adam Riese): 72/72 packages, 4 Erledigt / 2 In Bearbeitung / 66 Nicht begonnen.
- Total Production Development baseline: 4 projects / 288 work packages.
- All four imports passed full-field source↔database parity before Production cutover.
- Project navigation is generic: `/projects` queries migrated project IDs through the authenticated PostgreSQL provider and only those rows are clickable.
- Non-migrated transition projects remain visible as summaries but are intentionally non-clickable.
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
2. relevant `OPS_*_SOURCE=postgres`,
3. relevant `OPS_*_DB_APPROVED=true`,
4. authenticated Google Workspace session,
5. exact hosted-domain match against `GOOGLE_WORKSPACE_ALLOWED_DOMAIN`.

Task writes additionally require `OPS_TASK_DB_WRITES_ENABLED=true`.

Asset/Development runtime store remains read-only. Build verification rejects runtime `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` paths.

## Current Production deployment

Functional Adam-Riese cutover commit:

`d0a4f075723023fd001784eb6430e87fdc5a73e1`

Functional Adam-Riese Vercel deployment:

`dpl_ETQNJ8GUnr45up2vspWDF8pQjHEy` — READY

A later `ARCHITECTURE.md`-only synchronization commit may sit on top of this functional commit; it contains no runtime or database logic change.

Production build checks passed:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- TypeScript
- Next.js 16.3.0

Production baseline after Adam Riese:

- Tasks: 75/75
- Assets: 19/19, status 9/8/2
- Development: 4 projects / 288 packages
- Hotel 57: 72, status 4/6/62
- Hahnmühle: 72, status 3/7/62
- Square: 72, status 3/5/64
- Adam Riese: 72, status 4/2/66
- all corresponding migration markers completed

Unauthenticated portfolio verification remains fail-closed with HTTP 401 `AUTH_REQUIRED`. No Production runtime error/fatal logs were found after the Adam Riese deployment.

## Development migration procedure

For every additional Development project:

1. Read the corresponding `Development_Projects_DE` tab only.
2. Record source `modifiedTime` immediately before snapshot/import.
3. Normalize header, dates, priorities and ordered package fields using the established model.
4. Build the snapshot outside the public repository when it contains operational payloads.
5. Verify unique project ID, Asset relation, package IDs/order and required fields.
6. Clone current Production to an isolated Neon branch.
7. Import only there first.
8. Run full-field parity/checksums and verify existing Tasks, Assets and already migrated Development data remain unchanged.
9. Extend only generic read-only runtime/build verification as required; avoid project-specific UI/store duplication.
10. Require an exact-head green Vercel Preview.
11. Recheck source freshness and Production absence immediately before the approval boundary.
12. Obtain explicit Production-data approval.
13. Import atomically into Production, verify again, then merge/deploy the already-green feature head.
14. Run authenticated Production `/api/verify/portfolio-db` and runtime-error checks.

## Phase 4 Production completion · Adam Riese

Project: `PRJ-0004` → `A008` (Adam Riese).

Source:

- Read-only source file: `Development_Projects_DE`.
- Source tab: `008_AdamRiese`.
- Source file `modifiedTime`: `2026-08-07T10:06:50.395Z` at the Production approval boundary.
- Project header: status Planung, start 2026-07-22, planned end 2028-04-15, as-of 2026-08-08.
- Current focus: Grundstücks- und Rechtsunterlagen.

Isolated verification:

- Neon branch: `development-adamriese-pilot-2026-08-08` (`br-long-water-a6kzmsts`), cloned from Production.
- Production was confirmed to contain Asset `A008` and zero `PRJ-0004` / Adam-Riese migration-marker rows before cutover.
- Adam Riese snapshot: 72 unique packages, source order 1–72.
- Status distribution: 4 Erledigt / 2 In Bearbeitung / 66 Nicht begonnen.
- Canonical source snapshot MD5 values:
  - project `673a90c8bbac818e4a2ab71f424e2267`
  - work packages `eef0e32d1a9261d0c51da87765a934a6`
- Independent source↔isolated-database parity passed exactly.
- Exact verified feature head: `dc712dc15da1bd36297ab532da74a555104ab9b2`.
- Vercel Preview: `dpl_EFbUZRzpTdQ6HfFJKmV9WETnYoqi` — READY.

Production completion:

- Explicit Production approval was obtained before the write.
- `PRJ-0004 → A008`, 72 work packages and migration marker were transferred atomically with pre/postcondition guards.
- Production totals after commit: 4 Development projects / 288 work packages.
- Existing Tasks remain 75/75 and Assets remain 19/19.
- Hotel 57, Hahnmühle and Square remain unchanged at 72/72 each.
- Migration marker `legacy-development-adamriese-import-2026-08-08` is completed 72/72.
- Full-row Production↔isolated-branch hashes match exactly:
  - project `bfb68f5cc2f967ce16acd235bf7e7d74`
  - work packages `11a8bc25b9a4e5ecf2f6b3ad35807ad4`
- PR #5 merged as `d0a4f075723023fd001784eb6430e87fdc5a73e1`.
- Vercel Production `dpl_ETQNJ8GUnr45up2vspWDF8pQjHEy` is READY.
- All Task checks, `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`, TypeScript and Next.js 16.3.0 passed.
- `/projects` and `/projects/[id]` remain dynamic.
- Unauthenticated `/api/verify/portfolio-db` remains HTTP 401 `AUTH_REQUIRED`.
- No Production runtime error/fatal logs were found after deployment.

## Current development status

Phase 4 is merged and complete. There is no active Development migration awaiting Production approval.

The next modeled legacy Development project is `PRJ-0005` → `A012` (Old Post). It has not been staged or imported by this phase. Before any Old Post work, start again at the read-only source-freshness and Production-baseline checks.

## Handoff

1. Production Tasks: PostgreSQL read/write, verified 75/75.
2. Production Assets: PostgreSQL read-only runtime, verified 19/19.
3. Production Development: Hotel 57 + Hahnmühle + Square + Adam Riese, 4 projects / 288 packages.
4. Production project navigation is generic: migrated projects are clickable based on authenticated PostgreSQL membership; non-migrated projects are not.
5. Legacy Sheets remain read-only; never write back.
6. Adam Riese `PRJ-0004 → A008` is live and fully verified in Production at 72 packages, status 4/2/66.
7. Adam Riese functional merge commit is `d0a4f075723023fd001784eb6430e87fdc5a73e1`; functional Production deployment is `dpl_ETQNJ8GUnr45up2vspWDF8pQjHEy` READY.
8. No schema change or Adam-Riese-specific runtime UI/store path was required.
9. Next candidate is Old Post `PRJ-0005 → A012`; begin only with a new checked plan, read-only source freshness, isolated Neon branch and full parity before any Production approval request.
