import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Task } from "../src/lib/domain";
import { dateInTimeZone, deriveTaskNotifications } from "../src/lib/notifications";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base: Omit<Task, "id" | "owner" | "status"> = {
  title: "Fixture",
  asset: "613 Group",
  priority: "Medium",
  description: "Fixture",
  updates: [],
};

const tasks: Task[] = [
  {
    ...base,
    id: "TSK-OVERDUE-WAITING",
    owner: "Max Meisner",
    status: "Waiting",
    priority: "High",
    deadline: "2026-08-08",
    waitingSince: "2026-08-01",
    waitingDays: 8,
  },
  {
    ...base,
    id: "TSK-WAITING",
    owner: "max meisner",
    status: "Waiting",
    waitingSince: "2026-08-02",
    waitingDays: 7,
  },
  {
    ...base,
    id: "TSK-DUE-SOON",
    owner: "Max Meisner",
    status: "Open",
    priority: "Low",
    deadline: "2026-08-16",
  },
  {
    ...base,
    id: "TSK-FUTURE",
    owner: "Max Meisner",
    status: "Open",
    deadline: "2026-08-17",
  },
  {
    ...base,
    id: "TSK-DONE-OVERDUE",
    owner: "Max Meisner",
    status: "Done",
    deadline: "2026-08-01",
  },
  {
    ...base,
    id: "TSK-OTHER-OWNER",
    owner: "Joseph",
    status: "Open",
    deadline: "2026-08-01",
  },
];

const notifications = deriveTaskNotifications(tasks, "Max Meisner", "2026-08-09");
assert(notifications.length === 3, `Expected 3 basic notifications, got ${notifications.length}.`);
assert(notifications[0]?.taskId === "TSK-OVERDUE-WAITING", "Overdue must outrank Waiting for the same Task.");
assert(notifications[0]?.kind === "overdue", "Overdue+Waiting Task must produce one overdue notification.");
assert(notifications[1]?.taskId === "TSK-WAITING" && notifications[1]?.kind === "waiting", "Waiting Task was not derived correctly.");
assert(notifications[2]?.taskId === "TSK-DUE-SOON" && notifications[2]?.kind === "due-soon", "7-day due-soon boundary was not included.");
assert(!notifications.some((item) => item.taskId === "TSK-FUTURE"), "Task beyond the 7-day window leaked into notifications.");
assert(!notifications.some((item) => item.taskId === "TSK-DONE-OVERDUE"), "Completed Task leaked into notifications.");
assert(!notifications.some((item) => item.taskId === "TSK-OTHER-OWNER"), "Another owner's Task leaked into personal notifications.");
assert(new Set(notifications.map((item) => item.taskId)).size === notifications.length, "Notification derivation produced duplicate Task entries.");
assert(dateInTimeZone(new Date("2026-08-08T22:30:00.000Z"), "Europe/Berlin") === "2026-08-09", "Berlin notification date boundary is incorrect.");

const root = process.cwd();
const route = readFileSync(join(root, "src/app/api/notifications/route.ts"), "utf8");
const shell = readFileSync(join(root, "src/components/shell.tsx"), "utf8");
const styles = readFileSync(join(root, "src/components/shell-notifications.module.css"), "utf8");

assert(route.includes('export const dynamic = "force-dynamic"'), "Notifications API must stay request-time dynamic.");
assert(route.includes("require613WorkspaceSession"), "Notifications API must require a 613 Workspace session.");
assert(route.includes('"Cache-Control": "no-store"'), "Notifications API must disable caching.");
assert(route.includes('snapshot.sourceMode !== "postgres"'), "Notifications API must fail closed unless Tasks use PostgreSQL.");
assert(route.includes('process.env.OPS_TASK_DB_APPROVED === "true"'), "Notifications API must preserve the Task database approval gate.");
assert(route.includes("currentMyWorkOwner"), "Notifications must stay aligned with the existing My Work owner resolver.");
assert(route.includes('APP_TIME_ZONE = "Europe/Berlin"'), "Notifications must use the configured operational timezone boundary.");
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(route), "Notifications API must remain read-only.");

assert(shell.includes('fetch("/api/notifications"'), "Application shell must call the protected notifications API.");
assert(shell.includes("notificationCount > 0"), "Notification attention badge is missing.");
assert(shell.includes("Needs attention"), "Notification dropdown heading is missing.");
assert(shell.includes("notification.href"), "Notifications must deep-link through their existing Task destination.");
assert(shell.includes("setNotificationOpen(false)"), "Search/notification mutual-close behavior is missing.");
assert(styles.includes(".panel") && styles.includes(".badge") && styles.includes(".overdue") && styles.includes(".waiting") && styles.includes(".dueSoon"), "Notification styling is incomplete.");

console.log("BASIC_NOTIFICATIONS_VERIFICATION_OK");
