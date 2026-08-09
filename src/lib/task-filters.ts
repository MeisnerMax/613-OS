import type { Priority, Task, TaskStatus } from "./domain";

export type TaskStatusFilter = "All" | TaskStatus;
export type TaskPriorityFilter = "All" | Priority;
export type TaskAttentionFilter = "All" | "Needs attention" | "Overdue";

export type TaskFilterState = {
  status: TaskStatusFilter;
  query: string;
  owner: string;
  asset: string;
  priority: TaskPriorityFilter;
  attention: TaskAttentionFilter;
};

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  status: "All",
  query: "",
  owner: "All",
  asset: "All",
  priority: "All",
  attention: "All",
};

export type TaskFilterOptions = {
  owners: string[];
  assets: string[];
};

export function filterTasks(tasks: ReadonlyArray<Task>, filters: TaskFilterState): Task[] {
  const query = normalize(filters.query);

  return tasks.filter((task) => {
    if (filters.status !== "All" && task.status !== filters.status) return false;
    if (filters.owner !== "All" && normalizedValue(task.owner) !== filters.owner) return false;
    if (filters.asset !== "All" && normalizedValue(task.asset) !== filters.asset) return false;
    if (filters.priority !== "All" && task.priority !== filters.priority) return false;
    if (!matchesAttention(task, filters.attention)) return false;
    if (query && !searchableTaskText(task).includes(query)) return false;
    return true;
  }).map((task) => ({ ...task, updates: [...task.updates] }));
}

export function getTaskFilterOptions(tasks: ReadonlyArray<Task>): TaskFilterOptions {
  return {
    owners: uniqueSorted(tasks.map((task) => normalizedValue(task.owner))),
    assets: uniqueSorted(tasks.map((task) => normalizedValue(task.asset))),
  };
}

export function hasActiveTaskFilters(filters: TaskFilterState) {
  return filters.status !== DEFAULT_TASK_FILTERS.status
    || filters.query.trim() !== DEFAULT_TASK_FILTERS.query
    || filters.owner !== DEFAULT_TASK_FILTERS.owner
    || filters.asset !== DEFAULT_TASK_FILTERS.asset
    || filters.priority !== DEFAULT_TASK_FILTERS.priority
    || filters.attention !== DEFAULT_TASK_FILTERS.attention;
}

function matchesAttention(task: Task, attention: TaskAttentionFilter) {
  if (attention === "All") return true;
  if (attention === "Needs attention") return Boolean(task.flag);
  return task.flag === "overdue";
}

function searchableTaskText(task: Task) {
  return [
    task.id,
    task.title,
    task.asset,
    task.owner,
    task.category,
    task.nextStep,
  ].map(normalize).join(" ");
}

function normalizedValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || "Unassigned";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b, "en", { sensitivity: "base" });
  });
}

function normalize(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("en") ?? "";
}
