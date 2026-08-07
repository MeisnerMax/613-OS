import type { Priority, Task, TaskStatus } from "@/lib/domain";
import { taskDatabase } from "./client";

export type TaskCreateInput = {
  title: string;
  asset?: string;
  category?: string;
  status?: TaskStatus;
  priority?: Priority;
  owner?: string;
  support?: string;
  info?: string;
  waitingFor?: string;
  waitingSince?: string;
  deadline?: string;
  nextStep?: string;
  nextStepBy?: string;
  description?: string;
};

export type TaskPatchInput = {
  title?: string;
  asset?: string | null;
  category?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  owner?: string | null;
  support?: string | null;
  info?: string | null;
  waitingFor?: string | null;
  waitingSince?: string | null;
  deadline?: string | null;
  nextStep?: string | null;
  nextStepBy?: string | null;
  description?: string | null;
};

type Actor = { email?: string; name?: string };

type TaskRow = {
  id: string;
  title: string;
  property_project: string;
  status: TaskStatus;
  priority: Priority;
  owner: string | null;
  waiting_for: string | null;
  waiting_since: string | null;
  deadline: string | null;
  next_step: string | null;
  latest_progress: string | null;
  description: string;
};

type UpdateRow = { task_id: string; body: string };

function daysSince(value: string | null): number | undefined {
  if (!value) return undefined;
  const start = new Date(`${value}T00:00:00Z`);
  const diff = Date.now() - start.getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff / 86_400_000)) : undefined;
}

function flagFor(row: TaskRow): Task["flag"] {
  if (row.status === "Done") return undefined;
  if (row.deadline) {
    const due = new Date(`${row.deadline}T23:59:59Z`).getTime();
    if (due < Date.now()) return "overdue";
  }
  if (row.status === "Waiting") return "waiting";
  return undefined;
}

function mapRow(row: TaskRow, updates: string[]): Task {
  return {
    id: row.id,
    title: row.title,
    asset: row.property_project,
    status: row.status,
    priority: row.priority,
    owner: row.owner ?? "",
    waitingFor: row.waiting_for ?? undefined,
    waitingDays: daysSince(row.waiting_since),
    deadline: row.deadline ?? undefined,
    nextStep: row.next_step ?? undefined,
    description: row.description || row.latest_progress || "",
    flag: flagFor(row),
    updates,
  };
}

async function updatesByTask(ids: string[]) {
  if (!ids.length) return new Map<string, string[]>();
  const sql = taskDatabase();
  const rows = await sql.query(
    "SELECT task_id, body FROM task_updates WHERE task_id = ANY($1::text[]) ORDER BY created_at DESC",
    [ids],
  ) as UpdateRow[];
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const values = grouped.get(row.task_id) ?? [];
    values.push(row.body);
    grouped.set(row.task_id, values);
  }
  return grouped;
}

function patchValue<T>(input: Record<string, unknown>, key: string, current: T): T | null {
  return Object.prototype.hasOwnProperty.call(input, key) ? (input[key] as T | null) : current;
}

export class PostgresTaskStore {
  async listTasks(): Promise<ReadonlyArray<Task>> {
    const sql = taskDatabase();
    const rows = await sql`SELECT id, title, property_project, status, priority, owner, waiting_for, waiting_since::text, deadline::text, next_step, latest_progress, description FROM tasks WHERE deleted_at IS NULL ORDER BY id` as TaskRow[];
    const grouped = await updatesByTask(rows.map((row) => row.id));
    return rows.map((row) => mapRow(row, grouped.get(row.id) ?? []));
  }

  async getTask(id: string): Promise<Task | null> {
    const sql = taskDatabase();
    const rows = await sql`SELECT id, title, property_project, status, priority, owner, waiting_for, waiting_since::text, deadline::text, next_step, latest_progress, description FROM tasks WHERE id=${id} AND deleted_at IS NULL LIMIT 1` as TaskRow[];
    if (!rows[0]) return null;
    const grouped = await updatesByTask([id]);
    return mapRow(rows[0], grouped.get(id) ?? []);
  }

  async createTask(input: TaskCreateInput, actor: Actor) {
    const sql = taskDatabase();
    const rows = await sql`
      WITH next_id AS (
        SELECT 'TSK-' || LPAD((COALESCE(MAX(SUBSTRING(id FROM 5)::integer), 0) + 1)::text, 4, '0') AS id FROM tasks WHERE id ~ '^TSK-[0-9]+$'
      )
      INSERT INTO tasks (id, title, property_project, category, status, priority, owner, support, info, waiting_for, waiting_since, deadline, next_step, next_step_by, description, source_bucket)
      SELECT id, ${input.title}, ${input.asset ?? ""}, ${input.category ?? null}, ${input.status ?? "Open"}, ${input.priority ?? "Medium"}, ${input.owner ?? null}, ${input.support ?? null}, ${input.info ?? null}, ${input.waitingFor ?? null}, ${input.waitingSince ?? null}, ${input.deadline ?? null}, ${input.nextStep ?? null}, ${input.nextStepBy ?? null}, ${input.description ?? ""}, 'WEBAPP' FROM next_id
      RETURNING id` as Array<{ id: string }>;
    const id = rows[0]?.id;
    if (!id) throw new Error("TASK_CREATE_FAILED");
    await sql`INSERT INTO activity_events (entity_id, action, actor_email, actor_name, after_state) VALUES (${id}, 'task.created', ${actor.email ?? null}, ${actor.name ?? null}, ${JSON.stringify(input)}::jsonb)`;
    return this.getTask(id);
  }

  async updateTask(id: string, input: TaskPatchInput, actor: Actor) {
    const sql = taskDatabase();
    const before = await this.getTask(id);
    if (!before) return null;
    const currentRows = await sql`SELECT title, property_project, category, status, priority, owner, support, info, waiting_for, waiting_since::text, deadline::text, next_step, next_step_by::text, description FROM tasks WHERE id=${id} AND deleted_at IS NULL LIMIT 1` as Array<Record<string, unknown>>;
    const current = currentRows[0];
    if (!current) return null;
    const raw = input as Record<string, unknown>;

    await sql`UPDATE tasks SET
      title = ${patchValue(raw, "title", current.title as string)},
      property_project = ${patchValue(raw, "asset", current.property_project as string) ?? ""},
      category = ${patchValue(raw, "category", current.category as string | null)},
      status = ${patchValue(raw, "status", current.status as TaskStatus)},
      priority = ${patchValue(raw, "priority", current.priority as Priority)},
      owner = ${patchValue(raw, "owner", current.owner as string | null)},
      support = ${patchValue(raw, "support", current.support as string | null)},
      info = ${patchValue(raw, "info", current.info as string | null)},
      waiting_for = ${patchValue(raw, "waitingFor", current.waiting_for as string | null)},
      waiting_since = ${patchValue(raw, "waitingSince", current.waiting_since as string | null)},
      deadline = ${patchValue(raw, "deadline", current.deadline as string | null)},
      next_step = ${patchValue(raw, "nextStep", current.next_step as string | null)},
      next_step_by = ${patchValue(raw, "nextStepBy", current.next_step_by as string | null)},
      description = ${patchValue(raw, "description", current.description as string) ?? ""},
      updated_at = now(), version = version + 1
      WHERE id=${id} AND deleted_at IS NULL`;
    const after = await this.getTask(id);
    await sql`INSERT INTO activity_events (entity_id, action, actor_email, actor_name, before_state, after_state) VALUES (${id}, 'task.updated', ${actor.email ?? null}, ${actor.name ?? null}, ${JSON.stringify(before)}::jsonb, ${JSON.stringify(after)}::jsonb)`;
    return after;
  }

  async addUpdate(id: string, body: string, actor: Actor) {
    const sql = taskDatabase();
    const exists = await this.getTask(id);
    if (!exists) return null;
    await sql`INSERT INTO task_updates (task_id, body, author_email, author_name) VALUES (${id}, ${body}, ${actor.email ?? null}, ${actor.name ?? null})`;
    await sql`INSERT INTO activity_events (entity_id, action, actor_email, actor_name, after_state) VALUES (${id}, 'task.update_added', ${actor.email ?? null}, ${actor.name ?? null}, ${JSON.stringify({ body })}::jsonb)`;
    return this.getTask(id);
  }
}
