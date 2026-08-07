import { apiErrorStatus, parseTaskCreateInput, parseTaskPatchInput } from "../src/lib/db/task-input";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectCode(fn: () => unknown, code: string) {
  let actual = "";
  try { fn(); } catch (error) { actual = error instanceof Error ? error.message : String(error); }
  assert(actual === code, `Expected ${code}, got ${actual}`);
}

const create = parseTaskCreateInput({
  title: "  Fixture  ", status: "Open", priority: "High", deadline: "2026-08-11", unexpected: "must be ignored",
});
assert(create.title === "Fixture", "Create title normalization failed.");
assert(!("unexpected" in create), "Create parser leaked an unsupported field.");
expectCode(() => parseTaskCreateInput({ title: "", status: "Open" }), "INVALID_TITLE");
expectCode(() => parseTaskCreateInput({ title: "x", status: "Other" }), "INVALID_STATUS");
expectCode(() => parseTaskCreateInput({ title: "x", deadline: "11.08.2026" }), "INVALID_DEADLINE");

const patch = parseTaskPatchInput({ expectedVersion: 3, waitingFor: null, owner: " Max Meisner ", status: "Waiting" });
assert(patch.expectedVersion === 3, "Patch expectedVersion validation failed.");
assert(patch.waitingFor === null, "Patch parser must support explicit field clearing.");
assert(patch.owner === "Max Meisner", "Patch owner normalization failed.");
expectCode(() => parseTaskPatchInput({ expectedVersion: 0, title: "x" }), "INVALID_EXPECTEDVERSION");
expectCode(() => parseTaskPatchInput({ expectedVersion: 2 }), "NO_SUPPORTED_FIELDS");
expectCode(() => parseTaskPatchInput({ unexpected: true }), "NO_SUPPORTED_FIELDS");
assert(apiErrorStatus("TASK_VERSION_CONFLICT") === 409, "Task version conflicts must return HTTP 409.");
console.log("TASK_INPUT_VALIDATION_OK");
