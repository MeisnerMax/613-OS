"use client";

import type { Task } from "@/lib/domain";
import { PriorityTag, Status } from "@/components/ui";

export function TaskDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  if (!task) return null;
  return <>
    <button className="backdrop" onClick={onClose} aria-label="Close task details" />
    <aside className="drawer">
      <div className="drawerHead"><div><span className="id">{task.id}</span><h2>{task.title}</h2></div><button className="close" onClick={onClose}>×</button></div>
      <div className="drawerStatus"><Status value={task.status}/><PriorityTag value={task.priority}/></div>
      <div className="details">
        <Detail label="Property" value={task.asset}/><Detail label="Owner" value={task.owner}/>
        <Detail label="Deadline" value={task.deadline ?? "No date"}/><Detail label="Waiting for" value={task.waitingFor ?? "—"}/>
      </div>
      <section className="drawerSection"><span>Next step</span><p>{task.nextStep ?? "No next step defined."}</p></section>
      <section className="drawerSection"><span>Description / progress</span><p>{task.description}</p></section>
      <section className="drawerSection"><span>Activity</span>{task.updates.length ? task.updates.map((u) => <p className="activity" key={u}>{u}</p>) : <p className="muted">No updates yet.</p>}</section>
    </aside>
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail"><span>{label}</span><strong>{value}</strong></div>;
}
