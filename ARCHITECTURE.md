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

## Production source-of-truth status · 09.08.2026

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

The complete modeled legacy Development project set from `Development_Projects_DE` is now migrated to PostgreSQL.

Current Production:

- `PRJ-0001` → `A004` (Hotel 57): 72/72 packages, 4 Erledigt / 6 In Bearbeitung / 62 Nicht begonnen.
- `PRJ-0002` → `A005` (Hahnmühle): 72/72 packages, 3 Erledigt / 7 In Bearbeitung / 62 Nicht begonnen.
- `PRJ-0003` → `A010` (Square): 72/72 packages, 3 Erledigt / 5 In Bearbeitung / 64 Nicht begonnen.
- `PRJ-0004` → `A008` (Adam Riese): 72/72 packages, 4 Erledigt / 2 In Bearbeitung / 66 Nicht begonnen.
- `PRJ-0005` → `A012` (Old Post): 72/72 packages, 2 Erledigt / 5 In Bearbeitung / 65 Nicht begonnen.
- Total Production Development baseline: 5 projects / 360 work packages.
- All five imports passed full-field source↔database parity before or at Production cutover.
- Project navigation is generic: `/projects` queries migrated project IDs through the authenticated PostgreSQL provider and only those rows are clickable.
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

## Current Production deployment state

Current functional `main` after the read-only Project Gantt merge:

`5a4942fc3e0aab8a32778f5205164991a49fb68e`

Functional Vercel Production deployment:

`dpl_CHExepaoFWD7zTHyvhyTqPM3K23L` — READY

This Production deployment contains the completed 5-project / 360-package Development baseline plus the read-only Project Gantt Phase A. The build passed:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- TypeScript
- Next.js 16.3.0

Production runtime checks after deployment:

- `/api/auth/status` reports PostgreSQL sources and the approved Production gates.
- unauthenticated `/api/verify/portfolio-db` returns HTTP 401 `AUTH_REQUIRED`.
- unauthenticated Development project detail stays fail-closed and does not expose PostgreSQL payloads.
- no error/fatal runtime logs were found after deployment.
- authenticated visual browser verification of the new Gantt is still pending user confirmation.

Current verified database baseline remains unchanged by the Gantt phase:

- Tasks: 75/75
- Assets: 19/19, status 9/8/2
- Development: 5 projects / 360 packages
- Hotel 57: 72, status 4/6/62
- Hahnmühle: 72, status 3/7/62
- Square: 72, status 3/5/64
- Adam Riese: 72, status 4/2/66
- Old Post: 72, status 2/5/65
- all corresponding migration markers completed

Unauthenticated portfolio verification must remain fail-closed with HTTP 401 `AUTH_REQUIRED`.

## Development migration procedure

For any future Development source added outside the completed five-project legacy set:

1. Read the corresponding legacy source only.
2. Record source `modifiedTime` immediately before snapshot/import.
3. Normalize header, dates, priorities and ordered package fields using the established model.
4. Build the snapshot outside the public repository when it contains operational payloads.
5. Verify unique project ID, Asset relation, package IDs/order and required fields.
6. Clone current Production to an isolated Neon branch.
7. Import only there first.
8. Run full-field parity/checksums and verify existing Tasks, Assets and Development data remain unchanged.
9. Extend only generic read-only runtime/build verification as required; avoid project-specific UI/store duplication.
10. Require an exact-head green Vercel Preview.
11. Recheck source freshness and Production absence immediately before the approval boundary.
12. Obtain explicit Production-data approval.
13. Import atomically into Production, verify again, then merge/deploy the already-green feature head.
14. Run authenticated Production `/api/verify/portfolio-db` and runtime-error checks.

## Phase 4 Production completion · Adam Riese

Project: `PRJ-0004` → `A008` (Adam Riese).

- Read-only source: `Development_Projects_DE / 008_AdamRiese`.
- Source `modifiedTime` at cutover boundary: `2026-08-07T10:06:50.395Z`.
- 72/72 packages, status 4 Erledigt / 2 In Bearbeitung / 66 Nicht begonnen.
- Isolated branch: `br-long-water-a6kzmsts`.
- Production import completed atomically after explicit approval.
- Full Production↔isolated parity passed.
- PR #5 merged as `d0a4f075723023fd001784eb6430e87fdc5a73e1`.

## Phase 5 Production completion · Old Post

Project: `PRJ-0005` → `A012` (Old Post).

Source and isolated verification:

- Read-only source: `Development_Projects_DE / 012_OldPost`.
- Source `modifiedTime` at cutover boundary: `2026-08-07T10:06:50.395Z`.
- Project header: status Planung, start 2026-07-12, planned end 2028-04-15, as-of 2026-08-08.
- Current focus: Bauakten und Archiv sichten.
- Current owner: Asset Manager Meisner.
- Isolated Neon branch: `development-oldpost-pilot-2026-08-08` (`br-morning-surf-a6gsjp87`).
- 72 unique packages, source order 1–72, status 2 Erledigt / 5 In Bearbeitung / 65 Nicht begonnen.
- Full-field source↔isolated-database hashes matched exactly:
  - project `5991d1085175bb0f69aa7ce9ba6c7119`
  - work packages `41d84f405d3f8908038ee7f67fb81508`
- Exact feature head `32b34c5209811a329fc44391a25792fa47c46a7f` had READY Vercel Preview `dpl_FTFK42KkR6EM3QnxoPmJUoYqw74E` with all build checks green.

Production completion:

- Explicit Production approval was obtained before the write.
- Immediately before import Production was verified at Tasks 75/75, Assets 19/19, 4 Development projects / 288 packages, with `A012` present and `PRJ-0005` plus its migration marker absent.
- `PRJ-0005 → A012`, 72 work packages and migration marker were transferred in one atomic Production transaction with pre/postcondition guards.
- Production totals after commit: 5 Development projects / 360 work packages.
- Existing Tasks remain 75/75 and Assets remain 19/19.
- Hotel 57, Hahnmühle, Square and Adam Riese remain unchanged at 72/72 each.
- Migration marker `legacy-development-oldpost-import-2026-08-08` is completed 72/72.
- Independent full-payload Production↔isolated-branch hashes match exactly:
  - project `663bcfc6b5afaafe30b0f2cfee78bd05`
  - work packages `dbf7c17ec611d55a3474b01934cc354b`
- PR #6 merged with expected-head guard as `c30afc345e2daa742234fcafcd0fba13dc98a2d3`.
- Final Production build after the Vercel rate-limit cleared is `dpl_9jdPNDSHUeDcU32YnCYfx5yUopnm` on `main` commit `697387fee600e08adf7174c5379f51f600431547`, READY with all build/runtime checks green.
- No schema change and no Old-Post-specific UI/store path were required.

## Current development status

The five modeled legacy Development project tabs are migrated. There is no remaining project tab in the current `Development_Projects_DE` migration set awaiting PostgreSQL cutover.

The product roadmap has therefore returned to application functionality rather than inventing another legacy Development migration.

## Product roadmap phase · Read-only Project Gantt · 09.08.2026

The next planned block after stabilizing Tasks/Assets/Projects is Gantt + Dependencies. Phase A deliberately implements only the part that is already data-safe: a real read-only Gantt timeline from existing Development work-package dates.

Verified Production data suitability before implementation:

- 360/360 Development work packages have `start_date`.
- 360/360 have `end_date`.
- all five migrated projects span the modeled plan from 2026-07-12 through 2028-04-15.
- 360/360 contain a `dependency` source value, but this field is descriptive free text such as `Bestandsaufmaß` or `Entwurf; TGA-Konzept`, not a normalized foreign-key/package-ID relation.

Implemented Production boundary:

- Feature branch `feature/project-gantt-readonly` was based on Production `main` `697387fee600e08adf7174c5379f51f600431547`.
- New server component `src/app/projects/[id]/GanttTimeline.tsx` derives timeline positions only from the existing `DevelopmentWorkPackage` fields.
- `/projects/[id]` keeps the existing work-package table and adds the Gantt as an additional read-only view.
- Gantt groups packages by phase and shows month axis, Today marker, status, owner, dates and the exact source dependency text.
- No dependency arrows or inferred graph edges are created. Technical dependency linking is deferred until dependencies are explicitly normalized to unambiguous package IDs.
- No database/schema/API/source-Sheet changes and no new write path.
- `scripts/verify-asset-development-pilot.ts` guards the Gantt integration, dynamic project route and read-only boundary.
- Functional feature head `f42cf9336d0d44df1bdcf0011b29a7271650f657` passed Vercel Preview `dpl_Gj5oqbaQqvQgugYdAc7DEZXXidxY`.
- Final documentation-inclusive feature head `d145f9a9cce787c98c7df973b98609f228ae282a` passed Vercel Preview `dpl_ED2YezvMWJeHQAMRagp1U1Phn1Tj`.
- PR #7 merged with expected-head guard as `5a4942fc3e0aab8a32778f5205164991a49fb68e`.
- Functional Production deployment `dpl_CHExepaoFWD7zTHyvhyTqPM3K23L` is READY and passed all Task checks, `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`, TypeScript and Next.js 16.3.0.
- Production security checks remain green and no error/fatal runtime logs were found.

Remaining closure gate: authenticated browser verification on at least one migrated project must confirm that the Gantt renders correctly with real PostgreSQL data, including month timeline, bars, phase groups, horizontal scrolling and dependency source text.

## Handoff

1. Production Tasks: PostgreSQL read/write, verified 75/75.
2. Production Assets: PostgreSQL read-only runtime, verified 19/19.
3. Production Development: Hotel 57 + Hahnmühle + Square + Adam Riese + Old Post, 5 projects / 360 packages.
4. Functional Production `main` is `5a4942fc3e0aab8a32778f5205164991a49fb68e`; Vercel `dpl_CHExepaoFWD7zTHyvhyTqPM3K23L` is READY.
5. Production project navigation is generic and database-membership based.
6. Legacy Sheets remain read-only and receive no writeback.
7. Project Gantt Phase A is live in Production and remains strictly read-only; it required no database/schema/API/source changes.
8. Dependency source values are free text and must not be converted into arrows/technical dependencies by guesswork. A later dependency-normalization phase requires its own checked design and approval boundary.
9. Authenticated browser verification of the Gantt is the only remaining closure gate before proceeding to the next checked roadmap step.
