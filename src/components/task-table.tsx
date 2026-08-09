"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/domain";
import { PriorityTag, Status } from "@/components/ui";
import { TaskDrawer } from "@/components/task-drawer";
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  getTaskFilterOptions,
  hasActiveTaskFilters,
  type TaskAttentionFilter,
  type TaskFilterState,
  type TaskPriorityFilter,
} from "@/lib/task-filters";

const statusFilters: Array<"All" | TaskStatus> = ["All", "Open", "In progress", "Waiting", "Done"];
const priorityFilters: TaskPriorityFilter[] = ["All", "High", "Medium", "Low"];
const attentionFilters: TaskAttentionFilter[] = ["All", "Needs attention", "Overdue", "Waiting"];

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function TaskTable({ tasks, initialSelectedId }: { tasks: Task[]; initialSelectedId?: string }) {
  const [rows, setRows] = useState<Task[]>(tasks);
  const [filters, setFilters] = useState<TaskFilterState>({ ...DEFAULT_TASK_FILTERS });
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [creating, setCreating] = useState(false);
  const selected = useMemo(() => rows.find((task) => task.id === selectedId) ?? null, [rows, selectedId]);
  const filterOptions = useMemo(() => getTaskFilterOptions(rows), [rows]);
  const visible = useMemo(() => filterTasks(rows, filters), [filters, rows]);
  const activeFilters = hasActiveTaskFilters(filters);

  useEffect(() => {
    if (!initialSelectedId) return;
    setCreating(false);
    setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  function updateFilter<K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters({ ...DEFAULT_TASK_FILTERS });
  }

  function applyTask(task: Task, options?: { created?: boolean }) {
    setRows((current) => {
      const exists = current.some((item) => item.id === task.id);
      if (exists) return current.map((item) => item.id === task.id ? task : item);
      return [...current, task].sort((a, b) => a.id.localeCompare(b.id));
    });
    setCreating(false);
    setSelectedId(task.id);
    if (options?.created) clearFilters();
  }

  function closeDrawer() {
    setCreating(false);
    setSelectedId(null);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("task")) return;
    url.searchParams.delete("task");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return <>
    <div className="toolbar">
      <div className="tabs">{statusFilters.map((value) => <button key={value} className={filters.status === value ? "active" : ""} onClick={() => updateFilter("status", value)}>{value}</button>)}</div>
      <div className="taskToolbarActions">
        <span className="taskCount">{visible.length} of {rows.length}</span>
        <button className="taskCreate" onClick={() => { setSelectedId(null); setCreating(true); }}>+ New task</button>
      </div>
    </div>
    <div className="taskFilterBar" aria-label="Task filters">
      <label className="taskFilterSearch">
        <span>⌕</span>
        <input
          value={filters.query}
          onChange={(event) => updateFilter("query", event.target.value)}
          placeholder="Filter tasks…"
          aria-label="Filter Tasks by text"
        />
      </label>
      <select value={filters.owner} onChange={(event) => updateFilter("owner", event.target.value)} aria-label="Filter Tasks by owner">
        <option value="All">All owners</option>
        {filterOptions.owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
      </select>
      <select value={filters.asset} onChange={(event) => updateFilter("asset", event.target.value)} aria-label="Filter Tasks by property or project">
        <option value="All">All properties</option>
        {filterOptions.assets.map((asset) => <option key={asset} value={asset}>{asset}</option>)}
      </select>
      <select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value as TaskPriorityFilter)} aria-label="Filter Tasks by priority">
        {priorityFilters.map((priority) => <option key={priority} value={priority}>{priority === "All" ? "All priorities" : priority}</option>)}
      </select>
      <select value={filters.attention} onChange={(event) => updateFilter("attention", event.target.value as TaskAttentionFilter)} aria-label="Filter Tasks by attention">
        {attentionFilters.map((attention) => <option key={attention} value={attention}>{attention === "All" ? "All attention" : attention}</option>)}
      </select>
      <button className="taskFilterClear" type="button" onClick={clearFilters} disabled={!activeFilters}>Clear filters</button>
    </div>
    <div className="tableWrap"><table className="table"><thead><tr><th>Task</th><th>Property</th><th>Status</th><th>Priority</th><th>Owner</th><th>Deadline</th><th>Next step</th></tr></thead><tbody>
      {visible.map((task) => <tr key={task.id} onClick={() => { setCreating(false); setSelectedId(task.id); }}><td><span className="id">{task.id}</span><strong>{task.title}</strong>{task.waitingDays ? <small>Waiting {task.waitingDays} days</small> : null}</td><td>{task.asset || "—"}</td><td><Status value={task.status}/></td><td><PriorityTag value={task.priority}/></td><td><span className="person"><span className="mini">{initials(task.owner)}</span>{task.owner || "Unassigned"}</span></td><td className={task.flag === "overdue" ? "danger" : ""}>{task.deadline ?? "—"}</td><td>{task.nextStep ?? "—"}</td></tr>)}
      {!visible.length ? <tr><td className="taskEmpty" colSpan={7}>{activeFilters ? "No tasks match these filters." : "No tasks in this view."}</td></tr> : null}
    </tbody></table></div>
    <TaskDrawer
      task={selected}
      creating={creating}
      onClose={closeDrawer}
      onTaskChanged={(task, options) => applyTask(task, options)}
    />
  </>;
}
