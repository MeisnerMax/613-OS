import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const store = readFileSync(join(root, "src/lib/db/task-store.ts"), "utf8");
const selector = readFileSync(join(root, "src/lib/adapters/read-only/provider-selector.ts"), "utf8");
const authz = readFileSync(join(root, "src/lib/db/authz.ts"), "utf8");
const createRoute = readFileSync(join(root, "src/app/api/tasks/route.ts"), "utf8");
const updateRoute = readFileSync(join(root, "src/app/api/tasks/[id]/route.ts"), "utf8");
const importer = readFileSync(join(root, "scripts/import-task-migration.ts"), "utf8");

assert(store.includes("class PostgresTaskStore"), "Postgres task store is missing.");
assert(store.includes("activity_events"), "Task writes must create audit events.");
assert(store.includes("task_updates"), "Task update persistence is missing.");
assert(selector.includes('OPS_TASK_DB_APPROVED === "true"'), "Database activation gate is missing.");
assert(selector.includes("isTaskDatabaseConfigured"), "Database configuration check is missing.");
assert(authz.includes("allowedDomain"), "Workspace domain authorization is missing from DB writes.");
assert(createRoute.includes("parseTaskCreateInput"), "Create route must whitelist/validate input.");
assert(updateRoute.includes("parseTaskPatchInput"), "Patch route must whitelist/validate input.");
assert(importer.includes('TASK_MIGRATION_APPLY === "YES"'), "Migration apply confirmation is missing.");
assert(importer.includes("Expected exactly 75 tasks"), "Migration count guard is missing.");
assert(!store.includes("GOOGLE_SHEETS"), "Postgres task store must not depend on Google Sheets.");
assert(!store.includes("DATABASE_URL="), "Database credentials must not be embedded in source.");
console.log("POSTGRES_TASK_STORE_VERIFICATION_OK");
