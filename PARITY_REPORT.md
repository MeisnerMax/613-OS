# 613 OS · Task parity report · 2026-08-07

## Scope

Read-only comparison of `Task_Overview_613Group` against the current 613 OS task mapping. No production data was modified.

## Live source structure

- Spreadsheet: `Task_Overview_613Group`
- `DATA`: sheetId `3813593`, hidden, 1000 × 26 grid
- `MY TASKS`: sheetId `571520082`, visible, frozen through row 5
- `DATA` header: row 1
- `MY TASKS` task header: row 5

## Observed counts

- Populated task records in `DATA` within the current live range: **44**
- Active tasks in `DATA` owned by `Max Meisner`: **32**
- Rows shown in `MY TASKS` for `Max Meisner`: **32**
- ID-set parity for Max-owned active tasks: **matched**

Matched IDs:
`TSK-0003`, `TSK-0006`, `TSK-0007`, `TSK-0008`, `TSK-0009`, `TSK-0010`, `TSK-0011`, `TSK-0013`, `TSK-0014`, `TSK-0016`, `TSK-0017`, `TSK-0018`, `TSK-0023`, `TSK-0024`, `TSK-0025`, `TSK-0027`, `TSK-0028`, `TSK-0029`, `TSK-0031`, `TSK-0032`, `TSK-0036`, `TSK-0037`, `TSK-0038`, `TSK-0040`, `TSK-0042`, `TSK-0049`, `TSK-0058`, `TSK-0059`, `TSK-0061`, `TSK-0064`, `TSK-0066`, `TSK-0075`.

## Findings fixed before live activation

- v0.3: `My Work` consumed the complete snapshot without owner filtering. Fixed in v0.4: the view now filters to the configured current owner and excludes `Done` tasks.
- v0.4 OAuth hardening follow-up: v0.5 validates Google's Workspace `hd` claim instead of trusting an email suffix, requires a verified email and stable Google `sub`, validates the granted `spreadsheets.readonly` scope and rejects a broader Sheets scope.

## Approval status

**Not yet approved for live display.** Source-level Task parity passes, but the actual application OAuth session still has not been exercised end-to-end from a running Next.js instance with a real Google OAuth Web client. `OPS_TASK_PARITY_APPROVED=false` and `OPS_ALLOW_LIVE_TASK_DISPLAY=false` remain the safe defaults.
