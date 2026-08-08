# Asset + Development Production Cutover Plan

Checked plan only. This file contains no production rows, credentials or secrets and does not itself activate anything.

## Preconditions

1. Keep `Asset_Overview_v4` and `Development_Projects_DE` read-only from 613 OS.
2. Final Feature Preview for the exact candidate must pass all existing Task checks, `ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK`, TypeScript and Next.js route generation for `/assets/[id]`, `/projects/[id]` and `/api/verify/portfolio-db`.
3. Re-read both source Sheets immediately before migration. Snapshot freshness markers from the verified 07.08.2026 pilot were:
   - `Asset_Overview_v4` Drive modifiedTime: `2026-08-07T12:27:57.979Z`.
   - `Development_Projects_DE` Drive modifiedTime: `2026-08-07T10:06:50.395Z`.
   If either source changed after the verified snapshot, rebuild the normalized migration snapshot and recompute parity before continuing.
4. Obtain explicit approval before any change to Neon Production main.

## Production migration sequence

1. Re-verify Production Task baseline: 75 active tasks / 75 distinct IDs and completed legacy Task migration.
2. Apply only the additive schema from `migrations/0002_asset_development_pilot.sql` to Neon Production main. Do not modify existing Task tables.
3. Re-verify Task baseline before importing Asset/Development data.
4. Import the freshly verified 19 Asset Master records directly to PostgreSQL outside the public repository.
5. Import Hotel 57 project `PRJ-0001` and its freshly verified 72 work packages directly to PostgreSQL outside the public repository.
6. Record the two migration markers only after the corresponding counts and full-field parity are correct.
7. Re-run full-field parity. Current pilot reference MD5 values are Assets `211bebe45157b6156666f6e4ad3e4a58`, project header `9c8149173037a1744dcd026586686c20`, work packages `761af437cedbc4db126223967480af84`; these are valid only if the source freshness gate confirms the source did not change.
8. Re-verify Task baseline remains 75/75.
9. Deploy the fail-closed application code to `main` while Asset/Development gates remain disabled.
10. Verify `/api/auth/status` still reports Asset/Development sources disabled and `/api/verify/portfolio-db` remains protected.
11. Configure the independent Vercel gates only after the database verification is complete:
    - `OPS_ASSET_SOURCE=postgres`
    - `OPS_ASSET_DB_APPROVED=true`
    - `OPS_DEVELOPMENT_SOURCE=postgres`
    - `OPS_DEVELOPMENT_DB_APPROVED=true`
12. Redeploy and, from an authenticated 613 Workspace browser session, require `/api/verify/portfolio-db` to return `ok=true` before treating PostgreSQL as active for these views.
13. Verify `/assets`, at least A004 detail, `/projects/PRJ-0001`, and existing `/tasks` in Production.

## Rollback before activation

If schema or parity verification fails before Asset/Development gates are enabled, remove the isolated pilot tables using `migrations/0002_asset_development_pilot_rollback.sql` and keep the existing Sheets as the unchanged transition source. Never use that rollback after Asset/Development has become an operative source without a separate data-preservation plan.

## Staged scope

Only Asset Master and Hotel 57 are in this cutover. Other Development projects remain on the transition view until each is separately imported and verified. Generic `Hotels` Tasks are not automatically assigned to individual hotel Assets; only direct, unambiguous task links are counted at Asset level.
