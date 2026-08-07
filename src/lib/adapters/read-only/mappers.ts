import type { Asset, DevelopmentWorkPackage, Priority, Task, TaskStatus } from "../../domain";
import type { AssetSheetRow, DevelopmentSheetRow, TaskSheetRow } from "./sheet-row-types";

const TASK_STATUSES = new Set<TaskStatus>(["Open", "In progress", "Waiting", "Done"]);
const PRIORITIES = new Set<Priority>(["High", "Medium", "Low"]);

function optional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTaskStatus(value?: string): TaskStatus {
  const candidate = optional(value) as TaskStatus | undefined;
  return candidate && TASK_STATUSES.has(candidate) ? candidate : "Open";
}

function normalizePriority(value?: string): Priority {
  const candidate = optional(value);
  if (!candidate) return "Medium";
  if (PRIORITIES.has(candidate as Priority)) return candidate as Priority;
  if (candidate === "Hoch") return "High";
  if (candidate === "Mittel") return "Medium";
  if (candidate === "Niedrig") return "Low";
  return "Medium";
}

function normalizeAssetStatus(value?: string): Asset["status"] {
  if (value === "Under examination" || value === "Sold") return value;
  return "Active";
}

function parseGermanNumber(value?: string): number {
  if (!value) return 0;
  const normalized = value.replace(/\s|€|%/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value?: string): Date | null {
  const raw = optional(value);
  if (!raw) return null;

  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (german) {
    const [, day, month, year] = german;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function daysBetween(start?: string, today: Date = new Date()): number | undefined {
  const parsed = parseDate(start);
  if (!parsed) return undefined;
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diff = Math.floor((end - parsed.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

function normalizeTaskFlag(value?: string): Task["flag"] {
  const flag = optional(value)?.toLowerCase();
  if (!flag || flag === "no date") return undefined;
  if (flag.includes("deadline overdue") || flag.includes("overdue")) return "overdue";
  if (flag.startsWith("waiting")) return "waiting";
  return "attention";
}

export function mapTaskSheetRow(row: TaskSheetRow, today: Date = new Date()): Task {
  const progress = optional(row["Latest progress"]);
  const info = optional(row.Info);
  return {
    id: optional(row.ID) ?? "TSK-UNKNOWN",
    title: optional(row.Task) ?? "Untitled task",
    asset: optional(row["Property / Project"]) ?? "Unassigned",
    status: normalizeTaskStatus(row.Status),
    priority: normalizePriority(row.Priority),
    owner: optional(row.Owner) ?? "Unassigned",
    waitingFor: optional(row["Waiting for"]),
    waitingDays: daysBetween(row["Waiting since"], today),
    deadline: optional(row.Deadline),
    nextStep: optional(row["Next step"]),
    description: progress ?? info ?? "No description yet.",
    flag: normalizeTaskFlag(row.Flag),
    updates: progress ? [progress] : [],
  };
}

export function mapAssetSheetRow(
  row: AssetSheetRow,
  counts: { openTasks?: number; projects?: number } = {},
): Asset {
  return {
    id: optional(row["Asset ID"]) ?? "A000",
    name: optional(row["Object Name"]) ?? "Unnamed asset",
    type: optional(row["Asset Type"]) ?? "Unknown",
    status: normalizeAssetStatus(row.Status),
    city: optional(row.City) ?? "—",
    units: Math.round(parseGermanNumber(row["Units / Rooms"])),
    openTasks: counts.openTasks ?? 0,
    projects: counts.projects ?? 0,
  };
}

export function mapDevelopmentSheetRow(row: DevelopmentSheetRow): DevelopmentWorkPackage {
  return {
    sourceId: optional(row.ID) ?? "UNKNOWN",
    phase: optional(row.Phase) ?? "Unassigned phase",
    title: optional(row.Arbeitspaket) ?? "Untitled work package",
    action: optional(row["Was genau jetzt zu tun ist"]) ?? "",
    owner: optional(row.Verantwortlich),
    start: optional(row.Start),
    end: optional(row.Ende),
    durationDays: row["Dauer (KT)"] ? parseGermanNumber(row["Dauer (KT)"]) : undefined,
    status: optional(row.Status) ?? "Nicht begonnen",
    priority: normalizePriority(row["Priorität"]),
    dependency: optional(row["Vorher muss vorliegen"]),
    completionEvidence: optional(row["Fertig, wenn"]),
    nextPackage: optional(row["Direkt danach"]),
    calendar: optional(row["Kalender?"])?.toLowerCase() === "ja",
    planOffsetDays: row["Planoffset (Tage)"] ? parseGermanNumber(row["Planoffset (Tage)"]) : undefined,
  };
}
