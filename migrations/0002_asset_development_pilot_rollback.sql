-- Rollback for the Asset + Development pilot schema only.
-- Safe only before Asset/Development is activated as an operative source.
-- Does not alter Task tables, Task data, activity events or the legacy source Sheets.
DROP TABLE IF EXISTS development_work_packages;
DROP TABLE IF EXISTS development_projects;
DROP TABLE IF EXISTS assets;
