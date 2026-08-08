# 613 OS · Architecture & Handoff

## Immutable rules

- Existing production source files are READ ONLY unless the user later gives an explicit file-specific write instruction.
- Do not modify `Task_Overview_613Group`, `Development_Projects_DE`, `Asset_Overview_v4`, existing production calendars, or other current production source files from 613 OS transition code.
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

PostgreSQL is the operative production source of truth.

- 75/75 unique Tasks migrated and verified (`TSK-0001` through `TSK-0075`).
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

PostgreSQL is the approved production runtime source for the migrated Asset Master snapshot.

- 19/19 unique Assets migrated and verified.
- Status distribution: 9 Active / 8 Under examination / 2 Sold.
- `/assets` and `/assets/[id]` are request-time dynamic and remain Workspace-session gated.
- Task counts are deliberately labeled `Direct open tasks`; generic `Hotels` Tasks are not guessed onto individual Assets.
- `Asset_Overview_v4` remains read-only and receives no writeback.

Production gates:

```env
OPS_ASSET_SOURCE=postgres
OPS_ASSET_DB_APPROVED=true
```

### Development

Development is migrated project-by-project. PostgreSQL project detail is available only for project IDs that actually exist in the approved Development store.

Current Production:

- `PRJ-0001` → `A004` (Hotel 57): 72/72 packages, 4 Erledigt / 6 In Bearbeitung / 62 Nicht begonnen.
- `PRJ-0002` → `A005` (Hahnmühle): 72/72 packages, 3 Erledigt / 7 In Bearbeitung / 62 Nicht begonnen.
- Total Production Development baseline: 2 projects / 144 work packages.
- Both project imports passed full-field source↔database parity before Production cutover.
- The Projects overview no longer hard-codes `PRJ-0001`: it queries migrated Development project IDs through the authenticated PostgreSQL provider and only those rows are clickable.
- Non-migrated transition projects remain visible as summary rows but are intentionally non-clickable.
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

GitHub `main`:

`7d9f292deb8537e006c0dc5faefcfddd56057a64`

Vercel Production:

`dpl_4hyoLDswvT13qhNRa7P4rNw3dfws` — READY

This deployment contains the generic migrated-project navigation fix. Build checks passed:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- TypeScript
- Next.js 16.3.0

No runtime errors were found after the navigation deployment.

The authenticated Production portfolio verifier baseline before Square remains:

- Tasks: 75/75
- Assets: 19/19, status 9/8/2
- Development: 2 projects / 144 packages
- Hotel 57: 72, status 4/6/62
- Hahnmühle: 72, status 3/7/62
- all corresponding migration markers completed

Unauthenticated portfolio verification remains fail-closed with HTTP 401 `AUTH_REQUIRED`.

## Development migration procedure

For every additional Development project:

1. Read the corresponding `Development_Projects_DE` tab only.
2. Record source `modifiedTime` immediately before snapshot/import.
3. Normalize header, dates, priorities and ordered package fields using the established model.
4. Build the snapshot outside the public repository when it contains operational payloads.
5. Verify unique project ID, Asset relation, package IDs/order and required fields.
6. Clone current Production to an isolated Neon branch.
7. Import only there first.
8. Run full-field parity/checksums and verify the existing Tasks, Assets and already migrated Development data remain unchanged.
9. Extend only generic read-only runtime/build verification as required; avoid project-specific UI/store duplication.
10. Require an exact-head green Vercel Preview.
11. Recheck source freshness and Production absence immediately before the approval boundary.
12. Obtain explicit Production-data approval.
13. Import atomically into Production, verify again, then merge/deploy the already-green feature head.
14. Run authenticated Production `/api/verify/portfolio-db` and runtime-error checks.

## Phase 3 isolated verification · Square

Next staged project: `PRJ-0003` → `A010` (Square).

Source:

- Read-only source file: `Development_Projects_DE`.
- Source tab: `010_Square`.
- Source file `modifiedTime`: `2026-08-07T10:06:50.395Z` at snapshot selection.
- Project header: status Planung, start 2026-07-12, planned end 2028-04-15, as-of 2026-08-08.

Isolated database state:

- Neon branch: `development-square-pilot-2026-08-08` (`br-empty-bonus-a65fy58r`), cloned from current Production.
- Production was confirmed to contain Asset `A010` and zero `PRJ-0003` rows before staging.
- Square snapshot: 72 unique packages, source order 1–72.
- Status distribution: 3 Erledigt / 5 In Bearbeitung / 64 Nicht begonnen.
- After isolated import: 3 Development projects / 216 packages.
- Existing baselines remain unchanged: Tasks 75/75, Assets 19/19, Hotel 57 72/72, Hahnmühle 72/72.
- Full-field source↔database payload parity passed exactly:
  - project MD5 `ebe39ac285d79dd9724d0b221109d0e7`
  - work-package MD5 `6f4b4b5e58cde2433570ece6af9f3f9d`
- Isolated migration marker: `legacy-development-square-import-2026-08-08`, completed 72/72.

Feature verification:

- Branch: `feature/development-migration-phase-3`.
- Runtime verifier now protects the staged 3-project / 216-package baseline and Square `PRJ-0003 → A010`, 72 packages, status 3/5/64 plus its migration marker.
- Build verifier protects the same scope and retains all existing security/navigation assertions.
- Exact pre-documentation feature head: `63525e6a6bd4b3979a074947279ff56e85ed8c67`.
- Vercel Preview: `dpl_A7ePrAabR2UFaJyCLwc6Pj2j2Pfr` — READY.
- All Task checks, `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`, TypeScript and Next.js 16.3.0 passed.
- `/projects` and `/projects/[id]` remain dynamic.

Production remains unchanged by Phase 3 staging: `PRJ-0003` has not been imported into Production.

## Current development branch

`feature/development-migration-phase-3`

Purpose: stage Square safely and stop before Production until explicit Square Production-data approval.

## Handoff

1. Production Tasks: PostgreSQL read/write, verified 75/75.
2. Production Assets: PostgreSQL read-only runtime, verified 19/19.
3. Production Development: Hotel 57 + Hahnmühle only, 2 projects / 144 packages.
4. Production project navigation is generic: migrated projects are clickable based on authenticated PostgreSQL membership; non-migrated projects are not.
5. Legacy Sheets remain read-only; never write back.
6. Square `PRJ-0003 → A010` is fully imported and full-field verified only on isolated Neon branch `br-empty-bonus-a65fy58r`.
7. Feature branch `feature/development-migration-phase-3` contains only the expanded read-only verifier/build guard plus this documentation; no schema migration or project-specific runtime path was needed.
8. Before Square Production import: recheck `Development_Projects_DE` `modifiedTime`, verify `PRJ-0003=0` in Production and request explicit Production-data approval.
9. After approval: atomic Production import, full baseline/hash verification, merge exact green feature head, verify Vercel Production, then require authenticated `/api/verify/portfolio-db` `ok=true` for 3 projects / 216 packages.
