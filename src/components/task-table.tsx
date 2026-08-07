"use client";

import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/domain";
import { PriorityTag, Status } from "@/components/ui";
import { TaskDrawer } from "@/components/task-drawer";

const filters: Array<"All" | TaskStatus> = ["All", "Open", "In progress", "Waiting", "Done"];

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selected, setSelected] = useState<Task | null>(null);
  const visible = useMemo(() => filter === "All" ? tasks : tasks.filter((t) => t.status === filter), [filter, tasks]);

  return <>
    <div className="toolbar"><div className="tabs">{filters.map((f) => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}</div><button className="filter">☷ Filters</button></div>
    <div className="tableWrap"><table className="table"><thead><tr><th>Task</th><th>Property</th><th>Status</th><th>Priority</th><th>Owner</th><th>Deadline</th><th>Next step</th></tr></thead><tbody>
      {visible.map((t) => <tr key={t.id} onClick={() => setSelected(t)}><td><span className="id">{t.id}</span><strong>{t.title}</strong>{t.waitingDays ? <small>Waiting {t.waitingDays} days</small> : null}</td><td>{t.asset}</td><td><Status value={t.status}/></td><td><PriorityTag value={t.priority}/></td><td><span className="person"><span className="mini">MM</span>{t.owner}</span></td><td className={t.flag === "overdue" ? "danger" : ""}>{t.deadline ?? "—"}</td><td>{t.nextStep ?? "—"}</td></tr>)}
    </tbody></table></div>
    <TaskDrawer task={selected} onClose={() => setSelected(null)}/>
  </>;
}
