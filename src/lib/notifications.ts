import type { Priority, Task } from "./domain";

export type BasicNotificationKind = "overdue" | "waiting" | "due-soon";

export type BasicNotification = {
  id: string;
  taskId: string;
  kind: BasicNotificationKind;
  title: string;
  context: string;
  priority: Priority;
  href: string;
};

const KIND_RANK: Record<BasicNotificationKind, number> = {
  overdue: 0,
  waiting: 1,
  "due-soon": 2,
};

const PRIORITY_RANK: Record<Priority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function deriveTaskNotifications(
  tasks: ReadonlyArray<Task>,
  ownerName: string,
  today: string,
  dueSoonDays = 7,
): BasicNotification[] {
  const owner = ownerName.trim().toLocaleLowerCase("en");

  return tasks
    .filter((task) => task.status !== "Done")
    .filter((task) => task.owner.trim().toLocaleLowerCase("en") === owner)
    .map((task) => toNotification(task, today, dueSoonDays))
    .filter((notification): notification is BasicNotification => Boolean(notification))
    .sort(compareNotifications);
}

export function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("DATE_FORMAT_FAILED");
  return `${year}-${month}-${day}`;
}

function toNotification(task: Task, today: string, dueSoonDays: number): BasicNotification | null {
  const deadlineDelta = task.deadline ? dayDifference(today, task.deadline) : null;

  if (deadlineDelta !== null && deadlineDelta < 0) {
    return {
      id: `task-overdue-${task.id}`,
      taskId: task.id,
      kind: "overdue",
      title: task.title,
      context: compact([task.asset, `Deadline ${task.deadline}`]),
      priority: task.priority,
      href: `/tasks?task=${encodeURIComponent(task.id)}`,
    };
  }

  if (task.status === "Waiting") {
    return {
      id: `task-waiting-${task.id}`,
      taskId: task.id,
      kind: "waiting",
      title: task.title,
      context: compact([
        task.asset,
        task.waitingDays ? `Waiting ${task.waitingDays} days` : task.waitingSince ? `Waiting since ${task.waitingSince}` : "Waiting",
      ]),
      priority: task.priority,
      href: `/tasks?task=${encodeURIComponent(task.id)}`,
    };
  }

  if (deadlineDelta !== null && deadlineDelta >= 0 && deadlineDelta <= dueSoonDays) {
    return {
      id: `task-due-soon-${task.id}`,
      taskId: task.id,
      kind: "due-soon",
      title: task.title,
      context: compact([task.asset, deadlineDelta === 0 ? "Due today" : `Due in ${deadlineDelta} days`]),
      priority: task.priority,
      href: `/tasks?task=${encodeURIComponent(task.id)}`,
    };
  }

  return null;
}

function compareNotifications(a: BasicNotification, b: BasicNotification) {
  return KIND_RANK[a.kind] - KIND_RANK[b.kind]
    || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || a.title.localeCompare(b.title);
}

function dayDifference(from: string, to: string) {
  return Math.round((dateOnlyToUtc(to) - dateOnlyToUtc(from)) / 86_400_000);
}

function dateOnlyToUtc(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) throw new Error(`INVALID_DATE_${value}`);
  return Date.UTC(year, month - 1, day);
}

function compact(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean).join(" · ");
}
