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

Current runtime-bearing Production commit:

`7a8ac766fcdba12f9aca58603984fe438c07da90`

Runtime-bearing Production deployment:

`dpl_J8SGF2ghbj4nvQdbG5gmjvfZy4i7` — READY

Later documentation-only commits/deployments may advance `main` without changing the runtime code represented by this baseline.

This Production runtime contains the completed 5-project / 360-package Development baseline, read-only Project Gantt Phase A, Global Search Phase A, Basic Notifications Phase A and Task Filters Phase A. The build passed:

- `POSTGRES_TASK_STORE_VERIFICATION_OK`
- `TASK_INPUT_VALIDATION_OK`
- `TASK_DATABASE_WRITE_GATE_VERIFICATION_OK`
- `TASK_CRUD_UI_VERIFICATION_OK`
- `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`
- `GLOBAL_SEARCH_VERIFICATION_OK`
- `BASIC_NOTIFICATIONS_VERIFICATION_OK`
- `TASK_FILTERS_VERIFICATION_OK`
- TypeScript
- Next.js 16.3.0

Production runtime checks after deployment:

- `/api/auth/status` reports PostgreSQL sources and the approved Production gates.
- unauthenticated `/api/notifications` returns HTTP 401 `AUTH_REQUIRED` with `Cache-Control: no-store`.
- unauthenticated `/api/search?q=Hotel` returns HTTP 401 `AUTH_REQUIRED` with `Cache-Control: no-store`.
- unauthenticated `/api/verify/portfolio-db` returns HTTP 401 `AUTH_REQUIRED`.
- unauthenticated Development project detail stays fail-closed and does not expose PostgreSQL payloads.
- no error/fatal runtime logs were found after deployment.
- authenticated visual browser verification of Gantt, Global Search, Basic Notifications and Task Filters was confirmed successfully by the user on 09.08.2026.

Current verified database baseline remains unchanged:

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

The planned Gantt + Dependencies block was split deliberately. Phase A implemented only the part that is already data-safe: a real read-only Gantt timeline from existing Development work-package dates.

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
- Documentation-sync Production deployment `dpl_8cVTzMp3tGtE9zTTVAMqje9gMjjX` on `b6eb31aedb040ac007417eaad73172acd48c479f` is READY with the same runtime code and all checks green.
- Production security checks remain green and no error/fatal runtime logs were found.
- Authenticated browser verification was confirmed successfully by the user on 09.08.2026. Gantt Phase A is fully closed.

Dependency source values remain free text. A future technical dependency-graph phase requires explicit normalization to unambiguous package IDs and its own checked design/data boundary.

## Product roadmap phase · Global Search Phase A · 09.08.2026

The original MVP sequence was re-read from the persistent architecture handoff rather than inferred. Task Drawer and Task Updates are already productive. The `activity_events` table was checked read-only and currently contains 75 events, all `task.legacy_imported`; a standalone global Activity view would therefore add little operational value at this point. Task filtering existed only as status tabs, while the global header search was decorative. The useful incomplete MVP block was therefore Filter & Search, starting with Global Search Phase A.

Implemented Production boundary:

- Isolated feature branch `feature/global-search-phase-a` was based exactly on Production `main` `b6eb31aedb040ac007417eaad73172acd48c479f`.
- `/api/search?q=…` is request-time dynamic, `Cache-Control: no-store`, and requires `require613WorkspaceSession()` before any data read.
- Search fails closed unless the existing PostgreSQL Task source and approved Asset/Development database gates are active.
- Phase A searches only the productive core entities Tasks, Assets and migrated Development Projects.
- Internal matching can use existing operational text fields, but the response is deliberately minimal: entity type, ID, title, short context line and destination URL. Asset financial fields are excluded.
- Task results deep-link to `/tasks?task=TSK-…` and reuse the existing Task Drawer; the existing Task CRUD implementation is not duplicated or changed.
- Asset results link to `/assets/[id]`; Project results link to `/projects/[id]`.
- Header search supports debounce, request cancellation, Cmd/Ctrl+K focus, Escape close, loading/empty/auth states and scoped result-dropdown styling.
- Closing a Task Drawer opened through search removes the `task` query parameter without reloading the page.
- No database mutation, schema migration, API write path, Task/Asset/Development gate change or legacy Sheet writeback was part of this phase.
- `scripts/verify-global-search.ts` emits `GLOBAL_SEARCH_VERIFICATION_OK` in addition to all existing Task/Portfolio checks.
- Functional feature head `de51007a114f2d8efce5772155f72ee59a4fbca0` passed Vercel Preview `dpl_2JqMjg5ghDEgLFWqgKPT2JFFqE4v`.
- Final documentation-inclusive feature head `a3d5d1fb3559fccaa14eef29ebaa56ea7de6c41d` passed Vercel Preview `dpl_FxjeizGEBgRCvW8bS5bXtubqzQLL` with all Task/Portfolio/Search checks, TypeScript and Next.js 16.3.0 green.
- PR #8 merged with expected-head guard as `a15da231028bd7a4bf206bcb37ca5bc4c03b01e0`.
- Production deployment `dpl_FYHsma3ZJ2Fjqig6qsJiANp8gaE3` is READY; unauthenticated `/api/search?q=Hotel` returns 401 `AUTH_REQUIRED`, Portfolio verification remains 401 unauthenticated and no error/fatal runtime logs were found.
- Authenticated browser verification covering Task deep-link plus Asset/Project navigation was confirmed successfully by the user on 09.08.2026. Global Search Phase A is fully closed.

## Product roadmap phase · Basic Notifications Phase A · 09.08.2026

The original MVP sequence was checked again after closing Global Search. The next listed block after Filter & Search is Basis-Notifications. Production Task data was inspected read-only before implementation rather than inventing notification types.

Verified Production notification candidates as of 09.08.2026:

- 43 open Tasks in total.
- 3 Tasks have an overdue deadline.
- 10 Tasks are in Waiting.
- 1 open Task has a deadline within the next 7 days.
- 1 Task has an overdue `next_step_by`; this belongs to another owner and is not part of the Phase-A personal signal set.
- For the existing `currentMyWorkOwner()` / `Max Meisner`: 1 overdue deadline, 9 Waiting Tasks and 1 due-soon Task.
- The overdue own Task is also Waiting. The derivation rule therefore produces one signal per Task with precedence `overdue > waiting > due-soon`, yielding 10 unique own notifications from the current Production snapshot rather than 11 duplicated signals.

Implemented Production boundary:

- Isolated feature branch `feature/basic-notifications-phase-a`, based exactly on Production `main` `a15da231028bd7a4bf206bcb37ca5bc4c03b01e0`.
- `src/lib/notifications.ts` contains the pure/testable Task→Notification derivation and Berlin operational date helper.
- Phase A is deliberately personalized to the existing My Work owner resolver and only considers that owner's non-Done Tasks.
- Exactly one notification can be derived per Task, with precedence overdue deadline → Waiting → deadline due within 7 days.
- No persisted read/unread state is invented. The Bell badge represents current attention signals, not unread messages.
- `/api/notifications` is request-time dynamic, `Cache-Control: no-store`, requires `require613WorkspaceSession()`, and fails closed unless the Task source is approved PostgreSQL.
- The Shell Bell loads the current attention count and opens a scoped dropdown. Every notification deep-links to `/tasks?task=TSK-…` and reuses the existing Task Drawer.
- Global Search and Notifications close each other; the existing Create button/navigation remain unchanged.
- No database mutation, schema migration, Task write-path change, source/gate change or legacy Sheet writeback was part of this phase.
- Build verification includes `scripts/verify-basic-notifications.ts`, which functionally tests owner filtering, one-signal-per-Task precedence/deduplication, the inclusive 7-day due-soon boundary, completed/other-owner exclusion and the Europe/Berlin date boundary; it also guards API read-only/security and Bell integration.
- Functional feature head `34f11ab92560ee2fe8671d216fa933ffff99a32c` passed Vercel Preview `dpl_FAok1Yox6SJzstRivEkPbAd6kaX2`.
- Final documentation-inclusive feature head `85484fa2ce48ebbb83e0630be17a1a53adce9e3b` passed Vercel Preview `dpl_GxvAeLaox9JTntVNajZJUcRGdLFW` with all Task/Portfolio/Search/Notifications checks, TypeScript and Next.js 16.3.0 green.
- PR #9 merged with expected-head guard as `b6aecfa91f2945f41eb411f0f40c560f00fe1720`.
- Production deployment `dpl_5oQJG9CeUVijiGcWjJGqfMjNubhb` is READY.
- Production gates remained unchanged; unauthenticated `/api/notifications`, `/api/search?q=Hotel` and `/api/verify/portfolio-db` return HTTP 401 `AUTH_REQUIRED`; no error/fatal runtime logs were found.
- Authenticated browser verification of Bell badge/dropdown and Task deep-link was confirmed successfully by the user on 09.08.2026. Basic Notifications Phase A is fully closed.

## Product roadmap phase · Task Filters Phase A · 09.08.2026

After closing Basic Notifications, the original MVP list and current code/data were rechecked. A global Activity page remains low-value because Production `activity_events` still contains only 75 `task.legacy_imported` rows. Technical Development dependency edges remain blocked because the 360 existing dependency values are descriptive free text rather than normalized package IDs. The remaining useful half of the original `Filter & Search` block is therefore Task Filters Phase A.

Verified Production Task filter suitability:

- 75 Tasks across 11 owner values, 3 priorities and 12 Property/Project values.
- 43 Tasks are currently active.
- Owner distribution is operationally non-trivial: Max Meisner 59, Ofir 4, Itzik/Oshri/Reza 2 each, further owners 1 each plus one unassigned Task.
- Priority distribution: Medium 35 / High 24 / Low 16.
- Largest Property/Project groups: Allee 7 21 / Hotels 18 / 613 Group (Company) 16 / Steinweg 36/38 6 / Steinweg 57 5.
- Existing PostgreSQL Task mapping already defines Attention semantics: non-Done overdue deadline → `overdue`; otherwise Waiting → `waiting`; no new deadline logic is invented.

Implementation boundary:

- Isolated feature branch `feature/task-filters-phase-a`, based exactly on Production `main` `b6aecfa91f2945f41eb411f0f40c560f00fe1720`.
- Existing status tabs remain unchanged: All / Open / In progress / Waiting / Done.
- `src/lib/task-filters.ts` provides a pure, deterministic filter model for status, local text, owner, Property/Project, priority and attention.
- Local Task text filtering matches Task ID, title, Property/Project, owner, category and next step.
- Owner and Property/Project options are derived from the already loaded Task rows; blanks are represented consistently as `Unassigned`.
- Attention offers `Needs attention` and `Overdue`. Exact Waiting remains the existing Status filter, avoiding ambiguous overlap with overdue Waiting Tasks.
- Filters combine by intersection, update the visible-result count immediately and have a single `Clear filters` reset.
- Creating a new Task clears active filters so a successfully created Task cannot remain hidden by previous filter state.
- Existing Task Drawer, CRUD behavior, optimistic concurrency and `/tasks?task=…` deep-link behavior are preserved.
- Filtering is entirely client-side on the already loaded Task set. No API, database, schema, source, Task write gate or legacy Sheet change is part of this phase.
- `scripts/verify-task-filters.ts` functionally tests combined filters, Attention semantics, Waiting overlap, practical text matching, `Unassigned`, option generation and default/clear state; static guards protect Drawer/deep-link integration and the no-network/no-write filter model.
- Functional feature head `476944c123df2723c57307f8109db5149241c059` passed Vercel Preview `dpl_re1W3f3LTsCZhN9J4T8jtPnCyVsQ` with all existing Task/Portfolio/Search/Notifications checks plus `TASK_FILTERS_VERIFICATION_OK`, TypeScript and Next.js 16.3.0 green.
- Final documentation-inclusive feature head `105578db01a4b472f735cada166347bd0674e854` passed Vercel Preview `dpl_5Em2LfjVES4mfycSYEoPykPbEijJ` with all existing Task/Portfolio/Search/Notifications checks plus `TASK_FILTERS_VERIFICATION_OK`, TypeScript and Next.js 16.3.0 green.
- PR #10 merged with expected-head guard as `7a8ac766fcdba12f9aca58603984fe438c07da90`.
- Production deployment `dpl_J8SGF2ghbj4nvQdbG5gmjvfZy4i7` is READY.
- Production gates remained unchanged; unauthenticated `/api/notifications`, `/api/search?q=Hotel` and `/api/verify/portfolio-db` return HTTP 401 `AUTH_REQUIRED`; database baseline remains 75 Tasks / 19 Assets / 5 Development projects / 360 work packages; no error/fatal runtime logs were found.
- Authenticated browser verification of combined filters, `Clear filters` and Task Drawer opening was confirmed successfully by the user on 09.08.2026. Task Filters Phase A is fully closed.

## Handoff

1. Production Tasks: PostgreSQL read/write, verified 75/75.
2. Production Assets: PostgreSQL read-only runtime, verified 19/19.
3. Production Development: Hotel 57 + Hahnmühle + Square + Adam Riese + Old Post, 5 projects / 360 packages.
4. Runtime-bearing Production commit is `7a8ac766fcdba12f9aca58603984fe438c07da90`; runtime-bearing Vercel deployment `dpl_J8SGF2ghbj4nvQdbG5gmjvfZy4i7` is READY. Later documentation-only commits may advance `main` without changing this runtime baseline.
5. Production project navigation is generic and database-membership based.
6. Legacy Sheets remain read-only and receive no writeback.
7. Project Gantt Phase A, Global Search Phase A, Basic Notifications Phase A and Task Filters Phase A are fully closed after successful authenticated browser verification.
8. Dependency source values remain free text and must not be converted into technical graph edges by guesswork. Global Activity remains deferred while its Production data contains only legacy-import events.
9. Task Filters Phase A is client-side only and changed no database/API/schema/source/gate or Task write path.
10. There is no active isolated product feature after Task Filters Phase A closure.
11. Select the next product block only after a fresh checked roadmap/code/data review.