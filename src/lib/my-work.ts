import type { Task } from "./domain";

export function selectMyWorkTasks(tasks: ReadonlyArray<Task>, ownerName: string): Task[] {
  const owner = ownerName.trim().toLocaleLowerCase("en");
  return tasks
    .filter((task) => task.status !== "Done")
    .filter((task) => task.owner.trim().toLocaleLowerCase("en") === owner)
    .map((task) => ({ ...task, updates: [...task.updates] }));
}

export function currentMyWorkOwner() {
  return process.env.OPS_CURRENT_USER_NAME?.trim() || "Max Meisner";
}
