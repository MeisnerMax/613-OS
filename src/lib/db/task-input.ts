import type { Priority, TaskStatus } from "@/lib/domain";
import type { TaskCreateInput, TaskPatchInput } from "./task-store";

const STATUSES = new Set<TaskStatus>(["Open", "In progress", "Waiting", "Done"]);
const PRIORITIES = new Set<Priority>(["High", "Medium", "Low"]);

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON_OBJECT");
  return value as JsonRecord;
}

function stringValue(record: JsonRecord, key: string, options?: { required?: boolean; nullable?: boolean }): string | null | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (value === null && options?.nullable) return null;
  if (typeof value !== "string") throw new Error(`INVALID_${key.toUpperCase()}`);
  const trimmed = value.trim();
  if (options?.required && !trimmed) throw new Error(`INVALID_${key.toUpperCase()}`);
  return trimmed;
}

function dateValue(record: JsonRecord, key: string): string | null | undefined {
  const value = stringValue(record, key, { nullable: true });
  if (value === undefined || value === null || value === "") return value === "" ? null : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`INVALID_${key.toUpperCase()}`);
  }
  return value;
}

function statusValue(record: JsonRecord): TaskStatus | undefined {
  const value = stringValue(record, "status");
  if (value === undefined) return undefined;
  if (!STATUSES.has(value as TaskStatus)) throw new Error("INVALID_STATUS");
  return value as TaskStatus;
}

function priorityValue(record: JsonRecord): Priority | undefined {
  const value = stringValue(record, "priority");
  if (value === undefined) return undefined;
  if (!PRIORITIES.has(value as Priority)) throw new Error("INVALID_PRIORITY");
  return value as Priority;
}

export function parseTaskCreateInput(value: unknown): TaskCreateInput {
  const record = asRecord(value);
  const title = stringValue(record, "title", { required: true });
  if (!title) throw new Error("INVALID_TITLE");
  return {
    title,
    asset: stringValue(record, "asset") ?? undefined,
    category: stringValue(record, "category") ?? undefined,
    status: statusValue(record),
    priority: priorityValue(record),
    owner: stringValue(record, "owner") ?? undefined,
    support: stringValue(record, "support") ?? undefined,
    info: stringValue(record, "info") ?? undefined,
    waitingFor: stringValue(record, "waitingFor") ?? undefined,
    waitingSince: dateValue(record, "waitingSince") ?? undefined,
    deadline: dateValue(record, "deadline") ?? undefined,
    nextStep: stringValue(record, "nextStep") ?? undefined,
    nextStepBy: dateValue(record, "nextStepBy") ?? undefined,
    description: stringValue(record, "description") ?? undefined,
  };
}

export function parseTaskPatchInput(value: unknown): TaskPatchInput {
  const record = asRecord(value);
  const input: TaskPatchInput = {};
  const title = stringValue(record, "title");
  if (title !== undefined) {
    if (!title) throw new Error("INVALID_TITLE");
    input.title = title;
  }
  const asset = stringValue(record, "asset", { nullable: true }); if (asset !== undefined) input.asset = asset;
  const category = stringValue(record, "category", { nullable: true }); if (category !== undefined) input.category = category;
  const status = statusValue(record); if (status !== undefined) input.status = status;
  const priority = priorityValue(record); if (priority !== undefined) input.priority = priority;
  const owner = stringValue(record, "owner", { nullable: true }); if (owner !== undefined) input.owner = owner;
  const support = stringValue(record, "support", { nullable: true }); if (support !== undefined) input.support = support;
  const info = stringValue(record, "info", { nullable: true }); if (info !== undefined) input.info = info;
  const waitingFor = stringValue(record, "waitingFor", { nullable: true }); if (waitingFor !== undefined) input.waitingFor = waitingFor;
  const waitingSince = dateValue(record, "waitingSince"); if (waitingSince !== undefined) input.waitingSince = waitingSince;
  const deadline = dateValue(record, "deadline"); if (deadline !== undefined) input.deadline = deadline;
  const nextStep = stringValue(record, "nextStep", { nullable: true }); if (nextStep !== undefined) input.nextStep = nextStep;
  const nextStepBy = dateValue(record, "nextStepBy"); if (nextStepBy !== undefined) input.nextStepBy = nextStepBy;
  const description = stringValue(record, "description", { nullable: true }); if (description !== undefined) input.description = description;
  if (Object.keys(input).length === 0) throw new Error("NO_SUPPORTED_FIELDS");
  return input;
}

export function apiErrorStatus(code: string) {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "WORKSPACE_DOMAIN_NOT_ALLOWED") return 403;
  if (code === "DB_WRITES_DISABLED") return 503;
  if (code.startsWith("INVALID_") || code === "NO_SUPPORTED_FIELDS") return 400;
  return 500;
}
