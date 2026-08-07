"use client";

import { useEffect, useMemo, useState } from "react";
import type { Priority, Task, TaskStatus } from "@/lib/domain";
import { PriorityTag, Status } from "@/components/ui";

type TaskDraft = {
  title: string;
  asset: string;
  category: string;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  support: string;
  info: string;
  deadline: string;
  nextStep: string;
  nextStepBy: string;
  waitingFor: string;
  waitingSince: string;
  description: string;
};

type Props = {
  task: Task | null;
  creating?: boolean;
  onClose: () => void;
  onTaskChanged: (task: Task, options?: { created?: boolean }) => void;
};

const emptyDraft: TaskDraft = {
  title: "",
  asset: "",
  category: "",
  status: "Open",
  priority: "Medium",
  owner: "",
  support: "",
  info: "",
  deadline: "",
  nextStep: "",
  nextStepBy: "",
  waitingFor: "",
  waitingSince: "",
  description: "",
};

function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    asset: task.asset,
    category: task.category ?? "",
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    support: task.support ?? "",
    info: task.info ?? "",
    deadline: task.deadline ?? "",
    nextStep: task.nextStep ?? "",
    nextStepBy: task.nextStepBy ?? "",
    waitingFor: task.waitingFor ?? "",
    waitingSince: task.waitingSince ?? "",
    description: task.description,
  };
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

async function readJson(response: Response) {
  return await response.json() as { task?: Task; error?: string };
}

export function TaskDrawer({ task, creating = false, onClose, onTaskChanged }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [baseline, setBaseline] = useState(JSON.stringify(emptyDraft));
  const [busy, setBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateBody, setUpdateBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const next = task ? draftFromTask(task) : emptyDraft;
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setUpdateBody("");
    setError(null);
    setNotice(null);
  }, [task, creating]);

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline]);
  const open = creating || Boolean(task);
  if (!open) return null;

  function setField<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved task changes?")) return;
    onClose();
  }

  async function loadLatestAfterConflict(id: string) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await readJson(response);
    if (response.ok && data.task) onTaskChanged(data.task);
  }

  async function saveTask() {
    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const createPayload = {
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        asset: optional(draft.asset),
        category: optional(draft.category),
        owner: optional(draft.owner),
        support: optional(draft.support),
        info: optional(draft.info),
        deadline: optional(draft.deadline),
        nextStep: optional(draft.nextStep),
        nextStepBy: optional(draft.nextStepBy),
        waitingFor: optional(draft.waitingFor),
        waitingSince: optional(draft.waitingSince),
        description: optional(draft.description),
      };

      const patchPayload = {
        expectedVersion: task?.version,
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        asset: nullable(draft.asset),
        category: nullable(draft.category),
        owner: nullable(draft.owner),
        support: nullable(draft.support),
        info: nullable(draft.info),
        deadline: nullable(draft.deadline),
        nextStep: nullable(draft.nextStep),
        nextStepBy: nullable(draft.nextStepBy),
        waitingFor: nullable(draft.waitingFor),
        waitingSince: nullable(draft.waitingSince),
        description: nullable(draft.description),
      };

      const response = await fetch(creating ? "/api/tasks" : `/api/tasks/${encodeURIComponent(task!.id)}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? createPayload : patchPayload),
      });
      const data = await readJson(response);

      if (response.status === 409 && task) {
        await loadLatestAfterConflict(task.id);
        setError("This task was changed by someone else. The latest version has been loaded; review it before saving again.");
        return;
      }
      if (!response.ok || !data.task) throw new Error(data.error || `SAVE_FAILED_${response.status}`);

      onTaskChanged(data.task, { created: creating });
      const savedDraft = draftFromTask(data.task);
      setDraft(savedDraft);
      setBaseline(JSON.stringify(savedDraft));
      setNotice(creating ? "Task created." : "Changes saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Task could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function addUpdate() {
    if (!task || !updateBody.trim()) return;
    setUpdateBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: updateBody.trim() }),
      });
      const data = await readJson(response);
      if (!response.ok || !data.task) throw new Error(data.error || `UPDATE_FAILED_${response.status}`);
      onTaskChanged(data.task);
      setUpdateBody("");
      setNotice("Update added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update could not be added.");
    } finally {
      setUpdateBusy(false);
    }
  }

  return <>
    <button className="backdrop" onClick={requestClose} aria-label="Close task details" />
    <aside className="drawer taskEditDrawer">
      <div className="drawerHead">
        <div><span className="id">{creating ? "NEW TASK" : task?.id}</span><h2>{creating ? "Create task" : task?.title}</h2></div>
        <button className="close" onClick={requestClose}>×</button>
      </div>

      {!creating && task ? <div className="drawerStatus"><Status value={task.status}/><PriorityTag value={task.priority}/><span className="taskVersion">v{task.version ?? "—"}</span></div> : null}

      <div className="taskForm">
        <Field label="Task title" wide><input value={draft.title} onChange={(event) => setField("title", event.target.value)} placeholder="What needs to be done?" /></Field>
        <Field label="Property / project"><input value={draft.asset} onChange={(event) => setField("asset", event.target.value)} placeholder="e.g. Allee 7" /></Field>
        <Field label="Category"><input value={draft.category} onChange={(event) => setField("category", event.target.value)} placeholder="Category" /></Field>
        <Field label="Status"><select value={draft.status} onChange={(event) => setField("status", event.target.value as TaskStatus)}><option>Open</option><option>In progress</option><option>Waiting</option><option>Done</option></select></Field>
        <Field label="Priority"><select value={draft.priority} onChange={(event) => setField("priority", event.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select></Field>
        <Field label="Owner"><input value={draft.owner} onChange={(event) => setField("owner", event.target.value)} placeholder="Owner" /></Field>
        <Field label="Support"><input value={draft.support} onChange={(event) => setField("support", event.target.value)} placeholder="Support" /></Field>
        <Field label="Deadline"><input type="date" value={draft.deadline} onChange={(event) => setField("deadline", event.target.value)} /></Field>
        <Field label="Next step by"><input type="date" value={draft.nextStepBy} onChange={(event) => setField("nextStepBy", event.target.value)} /></Field>
        <Field label="Next step" wide><textarea value={draft.nextStep} onChange={(event) => setField("nextStep", event.target.value)} placeholder="Concrete next action" rows={2} /></Field>
        <Field label="Waiting for"><input value={draft.waitingFor} onChange={(event) => setField("waitingFor", event.target.value)} placeholder="Person / external dependency" /></Field>
        <Field label="Waiting since"><input type="date" value={draft.waitingSince} onChange={(event) => setField("waitingSince", event.target.value)} /></Field>
        <Field label="Info" wide><textarea value={draft.info} onChange={(event) => setField("info", event.target.value)} placeholder="Short operational information" rows={2} /></Field>
        <Field label="Description / progress" wide><textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="Context, progress and relevant details" rows={5} /></Field>
      </div>

      {error ? <div className="taskMessage error">{error}</div> : null}
      {notice ? <div className="taskMessage success">{notice}</div> : null}

      <div className="taskFormActions">
        <button className="secondaryAction" onClick={requestClose} disabled={busy}>Cancel</button>
        <button className="primaryAction" onClick={saveTask} disabled={busy || (!creating && !dirty)}>{busy ? "Saving…" : creating ? "Create task" : dirty ? "Save changes" : "Saved"}</button>
      </div>

      {!creating && task ? <section className="drawerSection taskActivitySection">
        <span>Activity / updates</span>
        <div className="taskUpdateComposer">
          <textarea value={updateBody} onChange={(event) => setUpdateBody(event.target.value)} placeholder="Add progress, decision or note…" rows={3} />
          <button className="secondaryAction" onClick={addUpdate} disabled={updateBusy || !updateBody.trim()}>{updateBusy ? "Adding…" : "Add update"}</button>
        </div>
        {task.updates.length ? task.updates.map((update, index) => <p className="activity" key={`${index}-${update}`}>{update}</p>) : <p className="muted">No updates yet.</p>}
      </section> : null}
    </aside>
  </>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`taskField${wide ? " wide" : ""}`}><span>{label}</span>{children}</label>;
}
