import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type MigrationTask = { id?: unknown; sourceBucket?: unknown };
const path = process.env.TASK_MIGRATION_SNAPSHOT?.trim();
assert(path, "Set TASK_MIGRATION_SNAPSHOT to an external JSON snapshot path.");
const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
assert(Array.isArray(parsed), "Migration snapshot must be an array.");
const tasks = parsed as MigrationTask[];
assert(tasks.length === 75, `Expected 75 migration tasks, got ${tasks.length}.`);
const ids = tasks.map((task) => String(task.id ?? ""));
const unique = new Set(ids);
assert(unique.size === 75, "Migration snapshot contains duplicate task IDs.");
for (let index = 1; index <= 75; index += 1) {
  const expected = `TSK-${String(index).padStart(4, "0")}`;
  assert(unique.has(expected), `Migration snapshot is missing ${expected}.`);
}
const data = tasks.filter((task) => task.sourceBucket === "DATA").length;
const archive = tasks.filter((task) => task.sourceBucket === "ARCHIVE").length;
assert(data === 44, `Expected 44 DATA tasks, got ${data}.`);
assert(archive === 31, `Expected 31 ARCHIVE tasks, got ${archive}.`);
console.log(`TASK_MIGRATION_SNAPSHOT_OK total=${tasks.length} data=${data} archive=${archive}`);
