import type { Task } from "../src/lib/domain";
import { selectMyWorkTasks } from "../src/lib/my-work";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base: Omit<Task, "id" | "owner" | "status"> = {
  title: "Fixture",
  asset: "613 Group",
  priority: "Medium",
  description: "Fixture",
  updates: [],
};

const tasks: Task[] = [
  { ...base, id: "TSK-MAX-OPEN", owner: "Max Meisner", status: "Open" },
  { ...base, id: "TSK-MAX-WAIT", owner: "Max Meisner", status: "Waiting" },
  { ...base, id: "TSK-MAX-DONE", owner: "Max Meisner", status: "Done" },
  { ...base, id: "TSK-OTHER", owner: "Joseph", status: "Open" },
];

const selected = selectMyWorkTasks(tasks, "Max Meisner");
assert(selected.length === 2, `Expected 2 active Max tasks, got ${selected.length}`);
assert(selected.every((task) => task.owner === "Max Meisner"), "My Work leaked another owner.");
assert(selected.every((task) => task.status !== "Done"), "My Work includes completed tasks.");
console.log("MY_WORK_OWNER_FILTER_VERIFICATION_OK");
