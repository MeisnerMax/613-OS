import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const route = readFileSync(join(root, "src/app/api/search/route.ts"), "utf8");
const shell = readFileSync(join(root, "src/components/shell.tsx"), "utf8");
const styles = readFileSync(join(root, "src/components/shell-search.module.css"), "utf8");
const tasksPage = readFileSync(join(root, "src/app/tasks/page.tsx"), "utf8");
const taskTable = readFileSync(join(root, "src/components/task-table.tsx"), "utf8");

assert(route.includes('export const dynamic = "force-dynamic"'), "Global search API must stay request-time dynamic.");
assert(route.includes("require613WorkspaceSession"), "Global search API must require a 613 Workspace session.");
assert(route.includes('"Cache-Control": "no-store"'), "Global search API must disable caching.");
assert(route.includes("MAX_RESULTS = 12"), "Global search result cap is missing.");
assert(route.includes("MAX_QUERY_LENGTH = 80"), "Global search query length guard is missing.");
assert(route.includes('type: "task"') && route.includes('type: "asset"') && route.includes('type: "project"'), "Global search must cover Tasks, Assets and Projects.");
assert(route.includes("getPortfolioSnapshot"), "Global search must use the existing portfolio read model.");
assert(route.includes("getMigratedDevelopmentProjectIds") && route.includes("getDevelopmentProjectDetail"), "Global search must use the approved migrated Development read path.");
assert(route.includes('snapshot.sourceMode === "postgres"'), "Global search must fail closed unless the Task source is PostgreSQL.");
assert(route.includes('process.env.OPS_ASSET_DB_APPROVED === "true"'), "Global search must preserve the Asset approval gate.");
assert(route.includes('process.env.OPS_DEVELOPMENT_DB_APPROVED === "true"'), "Global search must preserve the Development approval gate.");
assert(route.includes("/tasks?task="), "Task search results must deep-link to the existing Task drawer.");
assert(route.includes("/assets/"), "Asset search results must link to Asset detail.");
assert(route.includes("/projects/"), "Project search results must link to Project detail.");
assert(route.includes("type: \"task\" | \"asset\" | \"project\""), "Global search response type must stay limited to the three approved entity types.");
for (const sensitiveField of ["marketValue", "assetPrice", "propertyPrice", "renovationCost", "sideCostsYear"]) {
  assert(!route.includes(sensitiveField), `Global search response/query must not expose financial Asset field ${sensitiveField}.`);
}
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(route), "Global search API must remain read-only.");

assert(shell.includes('/api/search?q=${encodeURIComponent(needle)}'), "Application shell must call the protected global search API.");
assert(shell.includes("event.metaKey || event.ctrlKey"), "Global search must retain Cmd/Ctrl+K support.");
assert(shell.includes('event.key === "Escape"'), "Global search must retain Escape close behavior.");
assert(shell.includes("AbortController"), "Global search must cancel superseded requests.");
assert(shell.includes("setTimeout(async () =>"), "Global search debounce is missing.");
assert(shell.includes("shell-search.module.css"), "Global search must keep scoped component styling.");
assert(styles.includes(".results") && styles.includes(".result") && styles.includes(".task") && styles.includes(".asset") && styles.includes(".project"), "Global search result styling is incomplete.");

assert(tasksPage.includes("searchParams"), "Tasks page must accept a search deep-link parameter.");
assert(tasksPage.includes("initialSelectedId={initialTaskId}"), "Tasks page must pass the search-selected Task into TaskTable.");
assert(taskTable.includes("initialSelectedId"), "TaskTable must accept an initial Task selection.");
assert(taskTable.includes("setSelectedId(initialSelectedId)"), "TaskTable must react to Task deep-link changes.");
assert(taskTable.includes('url.searchParams.delete("task")'), "Closing a search-opened Task drawer must clear the Task query parameter.");
assert(taskTable.includes("window.history.replaceState"), "Closing the Task drawer must clean the deep-link URL without a reload.");

console.log("GLOBAL_SEARCH_VERIFICATION_OK");
