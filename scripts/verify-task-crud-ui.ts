import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const table = readFileSync(join(root, "src/components/task-table.tsx"), "utf8");
const drawer = readFileSync(join(root, "src/components/task-drawer.tsx"), "utf8");
const store = readFileSync(join(root, "src/lib/db/task-store.ts"), "utf8");
const input = readFileSync(join(root, "src/lib/db/task-input.ts"), "utf8");
const styles = readFileSync(join(root, "src/app/tasks/task-crud.css"), "utf8");

assert(table.includes("+ New task"), "Task creation control is missing.");
assert(table.includes("onTaskChanged"), "Task table does not receive saved task state.");
assert(drawer.includes('method: creating ? "POST" : "PATCH"'), "Task create/edit API wiring is missing.");
assert(drawer.includes("expectedVersion: task?.version"), "Task edit UI must send optimistic version.");
assert(drawer.includes("response.status === 409"), "Task edit UI must handle version conflicts.");
assert(drawer.includes("/updates"), "Task update/comment API wiring is missing.");
assert(drawer.includes("Waiting since"), "Waiting workflow fields are missing.");
assert(drawer.includes("Next step by"), "Next-step deadline field is missing.");
assert(store.includes("version = version + 1"), "Task version increment is missing.");
assert(store.includes("TASK_VERSION_CONFLICT"), "Task store version conflict guard is missing.");
assert(input.includes('apiErrorStatus("TASK_VERSION_CONFLICT")') || input.includes('code === "TASK_VERSION_CONFLICT"'), "Task version conflicts must map to HTTP 409.");
assert(styles.includes(".taskForm"), "Task CRUD form styles are missing.");
console.log("TASK_CRUD_UI_VERIFICATION_OK");
