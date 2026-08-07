import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const store = readFileSync(join(root, "src/lib/db/task-store.ts"), "utf8");
const selector = readFileSync(join(root, "src/lib/adapters/read-only/provider-selector.ts"), "utf8");
const authz = readFileSync(join(root, "src/lib/db/authz.ts"), "utf8");
const authStatusRoute = readFileSync(join(root, "src/app/api/auth/status/route.ts"), "utf8");
const createRoute = readFileSync(join(root, "src/app/api/tasks/route.ts"), "utf8");
const updateRoute = readFileSync(join(root, "src/app/api/tasks/[id]/route.ts"), "utf8");
const taskUpdateRoute = readFileSync(join(root, "src/app/api/tasks/[id]/updates/route.ts"), "utf8");
const importer = readFileSync(join(root, "scripts/import-task-migration.ts"), "utf8");

assert(store.includes("class PostgresTaskStore"), "Postgres task store is missing.");
assert(store.includes("activity_events"), "Task writes must create audit events.");
assert(store.includes("task_updates"), "Task update persistence is missing.");
assert(store.includes("TASK_ID_RETRY_LIMIT"), "Bounded task ID allocation retry is missing.");
assert(store.includes("ON CONFLICT (id) DO NOTHING"), "Concurrent task ID conflict handling is missing.");
assert(selector.includes('OPS_TASK_DB_APPROVED === "true"'), "Database activation gate is missing.");
assert(selector.includes("isTaskDatabaseConfigured"), "Database configuration check is missing.");
assert(authz.includes("allowedDomain"), "Workspace domain authorization is missing from DB writes.");
assert(createRoute.includes("parseTaskCreateInput"), "Create route must whitelist/validate input.");
assert(updateRoute.includes("parseTaskPatchInput"), "Patch route must whitelist/validate input.");
assert(authStatusRoute.includes('"Cache-Control": "no-store"'), "Auth status must disable caching.");
assert(createRoute.includes('"Cache-Control": "no-store"'), "Task collection API must disable caching.");
assert(updateRoute.includes('"Cache-Control": "no-store"'), "Task item API must disable caching.");
assert(taskUpdateRoute.includes('"Cache-Control": "no-store"'), "Task update API must disable caching.");
assert(importer.includes('TASK_MIGRATION_APPLY === "YES"'), "Migration apply confirmation is missing.");
assert(importer.includes("Expected exactly 75 tasks"), "Migration count guard is missing.");
assert(!store.includes("GOOGLE_SHEETS"), "Postgres task store must not depend on Google Sheets.");
assert(!store.includes("DATABASE_URL="), "Database credentials must not be embedded in source.");
console.log("POSTGRES_TASK_STORE_VERIFICATION_OK");
