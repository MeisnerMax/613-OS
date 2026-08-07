# Asset + Development pilot verification · 07.08.2026

This file contains no source rows, credentials or secrets.

Final isolated migration candidate:
- 19 Asset Master records: 9 Active, 8 Under examination, 2 Sold.
- Hotel 57: PRJ-0001 → A004, 72 work packages: 4 completed, 6 in progress, 62 not started.
- Full-field parity MD5: assets `211bebe45157b6156666f6e4ad3e4a58`; project `9c8149173037a1744dcd026586686c20`; work packages `761af437cedbc4db126223967480af84`.
- Isolated Neon branch: `br-old-mud-a6ify2sw`.
- Existing Task baseline on the isolated branch remains 75 tasks / 75 distinct IDs.
- Runtime Asset/Development store is read-only and independently fail-closed.
- Production Neon schema/data and Asset/Development Vercel gates are unchanged.

Do not merge or activate the Production Asset/Development source until this exact candidate has a green Vercel Preview and the Production migration is explicitly approved.
