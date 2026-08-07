import { parseTaskCreateInput, parseTaskPatchInput } from "../src/lib/db/task-input";

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

const patch = parseTaskPatchInput({ waitingFor: null, owner: " Max Meisner ", status: "Waiting" });
assert(patch.waitingFor === null, "Patch parser must support explicit field clearing.");
assert(patch.owner === "Max Meisner", "Patch owner normalization failed.");
expectCode(() => parseTaskPatchInput({ unexpected: true }), "NO_SUPPORTED_FIELDS");
console.log("TASK_INPUT_VALIDATION_OK");
