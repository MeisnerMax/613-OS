"use client";

import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/domain";
import { PriorityTag, Status } from "@/components/ui";
import { TaskDrawer } from "@/components/task-drawer";

const filters: Array<"All" | TaskStatus> = ["All", "Open", "In progress", "Waiting", "Done"];

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function TaskTable({ tasks, initialSelectedId }: { tasks: Task[]; initialSelectedId?: string }) {
  const [rows, setRows] = useState<Task[]>(tasks);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [creating, setCreating] = useState(false);
  const selected = useMemo(() => rows.find((task) => task.id === selectedId) ?? null, [rows, selectedId]);
  const visible = useMemo(() => filter === "All" ? rows : rows.filter((task) => task.status === filter), [filter, rows]);

  function applyTask(task: Task, options?: { created?: boolean }) {
    setRows((current) => {
      const exists = current.some((item) => item.id === task.id);
      if (exists) return current.map((item) => item.id === task.id ? task : item);
      return [...current, task].sort((a, b) => a.id.localeCompare(b.id));
    });
    setCreating(false);
    setSelectedId(task.id);
    if (options?.created) setFilter("All");
  }

  return <>
    <div className="toolbar">
      <div className="tabs">{filters.map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div>
      <div className="taskToolbarActions">
        <span className="taskCount">{visible.length} of {rows.length}</span>
        <button className="taskCreate" onClick={() => { setSelectedId(null); setCreating(true); }}>+ New task</button>
      </div>
    </div>
    <div className="tableWrap"><table className="table"><thead><tr><th>Task</th><th>Property</th><th>Status</th><th>Priority</th><th>Owner</th><th>Deadline</th><th>Next step</th></tr></thead><tbody>
      {visible.map((task) => <tr key={task.id} onClick={() => { setCreating(false); setSelectedId(task.id); }}><td><span className="id">{task.id}</span><strong>{task.title}</strong>{task.waitingDays ? <small>Waiting {task.waitingDays} days</small> : null}</td><td>{task.asset || "—"}</td><td><Status value={task.status}/></td><td><PriorityTag value={task.priority}/></td><td><span className="person"><span className="mini">{initials(task.owner)}</span>{task.owner || "Unassigned"}</span></td><td className={task.flag === "overdue" ? "danger" : ""}>{task.deadline ?? "—"}</td><td>{task.nextStep ?? "—"}</td></tr>)}
      {!visible.length ? <tr><td className="taskEmpty" colSpan={7}>No tasks in this view.</td></tr> : null}
    </tbody></table></div>
    <TaskDrawer
      task={selected}
      creating={creating}
      onClose={() => { setCreating(false); setSelectedId(null); }}
      onTaskChanged={(task, options) => applyTask(task, options)}
    />
  </>;
}
