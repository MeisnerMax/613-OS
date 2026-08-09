import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Task } from "../src/lib/domain";
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  getTaskFilterOptions,
  hasActiveTaskFilters,
  type TaskFilterState,
} from "../src/lib/task-filters";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base: Omit<Task, "id" | "title" | "asset" | "status" | "priority" | "owner"> = {
  description: "Fixture",
  updates: [],
};

const tasks: Task[] = [
  {
    ...base,
    id: "TSK-FILTER-1",
    title: "Roof approval overdue",
    asset: "Allee 7",
    status: "Waiting",
    priority: "High",
    owner: "Max Meisner",
    flag: "overdue",
    nextStep: "Call architect",
  },
  {
    ...base,
    id: "TSK-FILTER-2",
    title: "Hotel supplier reply",
    asset: "Hotels",
    status: "Waiting",
    priority: "Medium",
    owner: "Max Meisner",
    flag: "waiting",
  },
  {
    ...base,
    id: "TSK-FILTER-3",
    title: "Prepare contract",
    asset: "Allee 7",
    status: "Open",
    priority: "High",
    owner: "Joseph",
    nextStep: "Send draft",
  },
  {
    ...base,
    id: "TSK-FILTER-4",
    title: "Unassigned admin item",
    asset: "",
    status: "In progress",
    priority: "Low",
    owner: "",
    category: "Administration",
  },
  {
    ...base,
    id: "TSK-FILTER-5",
    title: "Completed roof archive",
    asset: "Allee 7",
    status: "Done",
    priority: "High",
    owner: "Max Meisner",
  },
];

const defaults = { ...DEFAULT_TASK_FILTERS };
assert(filterTasks(tasks, defaults).length === tasks.length, "Default filters must keep all Tasks visible.");
assert(!hasActiveTaskFilters(defaults), "Default Task filters must not be marked active.");

const combined: TaskFilterState = {
  status: "Waiting",
  query: "roof",
  owner: "Max Meisner",
  asset: "Allee 7",
  priority: "High",
  attention: "Overdue",
};
const combinedResult = filterTasks(tasks, combined);
assert(combinedResult.length === 1 && combinedResult[0]?.id === "TSK-FILTER-1", "Combined Task filters did not intersect correctly.");
assert(hasActiveTaskFilters(combined), "Changed Task filters must be marked active.");

const attentionResult = filterTasks(tasks, { ...defaults, attention: "Needs attention" });
assert(attentionResult.map((task) => task.id).join(",") === "TSK-FILTER-1,TSK-FILTER-2", "Needs-attention filter must use existing Task flags.");

const waitingResult = filterTasks(tasks, { ...defaults, status: "Waiting" });
assert(waitingResult.length === 2, "Waiting status filter must include both waiting Tasks, including an overdue waiting Task.");

const searchResult = filterTasks(tasks, { ...defaults, query: "send draft" });
assert(searchResult.length === 1 && searchResult[0]?.id === "TSK-FILTER-3", "Local Task search must match practical Task text fields.");

const unassignedResult = filterTasks(tasks, { ...defaults, owner: "Unassigned", asset: "Unassigned" });
assert(unassignedResult.length === 1 && unassignedResult[0]?.id === "TSK-FILTER-4", "Unassigned owner/property filtering is incorrect.");

const options = getTaskFilterOptions(tasks);
assert(options.owners.includes("Max Meisner") && options.owners.includes("Joseph"), "Owner filter options are incomplete.");
assert(options.assets.includes("Allee 7") && options.assets.includes("Hotels"), "Property filter options are incomplete.");
assert(options.owners.at(-1) === "Unassigned", "Unassigned owner should sort last.");
assert(options.assets.at(-1) === "Unassigned", "Unassigned property should sort last.");

const root = process.cwd();
const filterSource = readFileSync(join(root, "src/lib/task-filters.ts"), "utf8");
const table = readFileSync(join(root, "src/components/task-table.tsx"), "utf8");
const styles = readFileSync(join(root, "src/app/tasks/task-crud.css"), "utf8");

assert(!filterSource.includes("fetch("), "Pure Task filter model must not depend on network calls.");
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(filterSource), "Task filter model must not contain database writes.");
assert(table.includes("filterTasks(rows, filters)"), "Task table is not using the pure combined filter model.");
assert(table.includes('aria-label="Task filters"'), "Task filter bar is missing.");
assert(table.includes('aria-label="Filter Tasks by owner"'), "Owner filter is missing.");
assert(table.includes('aria-label="Filter Tasks by property or project"'), "Property filter is missing.");
assert(table.includes('aria-label="Filter Tasks by priority"'), "Priority filter is missing.");
assert(table.includes('aria-label="Filter Tasks by attention"'), "Attention filter is missing.");
assert(table.includes("Clear filters"), "Clear filters control is missing.");
assert(table.includes("if (options?.created) clearFilters()"), "New Task flow must clear filters so the created Task cannot stay hidden.");
assert(table.includes("<TaskDrawer"), "Existing Task Drawer integration was removed.");
assert(table.includes("initialSelectedId"), "Existing Task deep-link selection was removed.");
assert(table.includes("window.history.replaceState"), "Existing Task deep-link close behavior was removed.");
assert(styles.includes(".taskFilterBar") && styles.includes("@media(max-width:720px)"), "Responsive Task filter styling is incomplete.");

console.log("TASK_FILTERS_VERIFICATION_OK");
