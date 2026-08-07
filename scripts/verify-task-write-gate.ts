import { strict as assert } from "node:assert";
import { requireTaskDatabaseWritesEnabled, taskDatabaseWritesEnabled } from "../src/lib/db/authz";
import { apiErrorStatus } from "../src/lib/db/task-input";

const previous = process.env.OPS_TASK_DB_WRITES_ENABLED;

try {
  delete process.env.OPS_TASK_DB_WRITES_ENABLED;
  assert.equal(taskDatabaseWritesEnabled(), false);
  assert.throws(() => requireTaskDatabaseWritesEnabled(), /DB_WRITES_DISABLED/);
  assert.equal(apiErrorStatus("DB_WRITES_DISABLED"), 503);

  process.env.OPS_TASK_DB_WRITES_ENABLED = "true";
  assert.equal(taskDatabaseWritesEnabled(), true);
  assert.doesNotThrow(() => requireTaskDatabaseWritesEnabled());

  console.log("TASK_DATABASE_WRITE_GATE_VERIFICATION_OK");
} finally {
  if (previous === undefined) delete process.env.OPS_TASK_DB_WRITES_ENABLED;
  else process.env.OPS_TASK_DB_WRITES_ENABLED = previous;
}
