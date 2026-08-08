# Development Phase 2 · Hahnmühle pilot

Status: isolated verification only. Production data is not changed by this document or branch.

## Source

- Read-only source: `Development_Projects_DE`
- Source tab: `005_Hahnmühle`
- Source file modified time checked before snapshot: `2026-08-07T10:06:50.395Z`
- Source file was read/exported only; no Sheet writeback was performed.

## Target identity

- Project: `PRJ-0002`
- Asset: `A005`
- Work packages: 72 unique records
- Source order: 1–72
- Status distribution: 3 completed / 7 in progress / 62 not started

## Source snapshot checksums

Original pilot canonicalization:

- Project: `ee361bfcb662eb74a56d0f848ddde250`
- Work packages: `412ed10aa491710afd90ce7415f11930`

Independent full-field parity canonicalization used after isolated import:

- Project source/DB: `166e61dcc76777f2ce6bb770c984b2e3`
- Work packages source/DB: `f409c9cfff4ff571d2d3cc12e69424d8`

The independent parity digest includes every migrated project field and every migrated work-package field, with explicit null markers, ISO dates, normalized priorities and source order.

## Isolated Neon verification

- Neon project: `613 OS Production` (`restless-tree-08180513`)
- Isolated branch: `development-hahnmuehle-pilot-2026-08-08`
- Branch ID: `br-plain-recipe-a6f9q58d`
- Existing Task baseline remained 75 total / 75 distinct.
- Existing Asset baseline remained 19 total / 19 distinct.
- Existing Hotel 57 pilot remained `PRJ-0001 → A004` with 72 packages and status distribution 4 / 6 / 62.
- Isolated Development state after import: 2 projects / 144 work packages.
- Hahnmühle migration marker: `legacy-development-hahnmuehle-import-2026-08-08`, completed 72 / 72.

## Runtime verification change

`/api/verify/portfolio-db` is extended on the isolated feature branch to require all previous baselines plus:

- exactly 2 staged Development projects,
- exactly 144 staged work packages,
- `PRJ-0002 → A005`,
- 72 / 72 Hahnmühle packages in source order 1–72,
- status distribution 3 / 7 / 62,
- completed 72 / 72 Hahnmühle migration marker.

The endpoint remains authenticated, `no-store`, aggregate-only and read-only. It does not expose project descriptions, work-package descriptions, financial values or credentials.

## Production gate

No Hahnmühle Production import is authorized by this isolated verification. Before any Production data change:

1. Recheck source modified time read-only.
2. Require a green exact-head Vercel Preview with all existing Task/portfolio checks, TypeScript and Next.js.
3. Obtain explicit Production data approval.
4. Import transactionally and rerun the authenticated Production verifier.
