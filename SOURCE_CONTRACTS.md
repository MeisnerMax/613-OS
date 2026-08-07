# 613 OS · Read-only source contracts

These contracts document what the transition adapters are allowed to read. They do **not** authorize writes.

## Tasks

- Source: `Task_Overview_613Group`
- Spreadsheet ID: `1XZltYAP4XqOABB3fN1BgK4M19VfikUFh4dAZzznc3g8`
- Tab: `DATA`
- Header row: `1`
- Read range: `A1:V1000`
- Contract fields: ID, Task, Property / Project, Category, Status, Waiting for, Waiting since, Priority, Owner, Support, Info, Deadline, Next step, Next step by, Latest progress, Last activity, Source, Created, Flag, Source email, Documents, Drive folder.

## Assets

- Source: `Asset_Overview_v4`
- Spreadsheet ID: `1nWPgdwqmh326gbKf28q6YNR_eGvtAtjsvBLmsAwvqhQ`
- Tab: `Asset_Master`
- Header row: `3`
- Read range: `A1:T1000`
- Operational read model uses asset ID, name, type, status, city and units/rooms. Task/project counts are joined from the operational sources rather than written back into the asset sheet.

## Development

- Source: `Development_Projects_DE`
- Spreadsheet ID: `1l5XslvGB6-JvXbq9ZkNU_U6joVtgDMw7dkqFQAVaWD4`
- Project tabs: `004_Hotel_57`, `008_AdamRiese`, `012_OldPost`, `005_Hahnmühle`, `010_Square`
- Header row per project: `9`
- Read range per project: `A1:O1000`
- Source headers containing line breaks (for example `Dauer\n(KT)`) are normalized by collapsing whitespace before mapping.
- Work-package fields: ID, Phase, Arbeitspaket, action, owner, start/end, duration, status, priority, dependency, completion evidence, next package, calendar flag, plan offset.

## Enforcement

The TypeScript adapter interfaces expose only `list*`, `get*` and `getOverview`. There is no transition method for create, update, delete, append, clear or batch-write operations.

The eventual Google implementation must use a read-only credential scope and live behind the same interfaces. Any future write capability belongs to a separate 613 OS store and requires a new architecture decision.

## Google REST reader

The first real source client uses only `spreadsheets.values.get` via HTTP `GET` and requires the OAuth scope `https://www.googleapis.com/auth/spreadsheets.readonly`. Authentication is injected through an access-token provider; no token or secret is stored in source control. The application remains on the mock provider until Google authentication and parity checks are complete.
