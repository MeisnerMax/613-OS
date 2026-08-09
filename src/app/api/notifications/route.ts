import { NextResponse } from "next/server";
import { require613WorkspaceSession } from "@/lib/db/authz";
import { currentMyWorkOwner } from "@/lib/my-work";
import { dateInTimeZone, deriveTaskNotifications } from "@/lib/notifications";
import { getPortfolioSnapshot } from "@/lib/read-model";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const DISPLAY_LIMIT = 20;
const APP_TIME_ZONE = "Europe/Berlin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET() {
  try {
    await require613WorkspaceSession();

    const snapshot = await getPortfolioSnapshot();
    const taskDatabaseApproved = process.env.OPS_TASK_DB_APPROVED === "true";
    if (snapshot.sourceMode !== "postgres" || !taskDatabaseApproved) {
      return json({
        notifications: [],
        count: 0,
        error: "NOTIFICATION_SOURCE_NOT_READY",
      }, 503);
    }

    const owner = currentMyWorkOwner();
    const today = dateInTimeZone(new Date(), APP_TIME_ZONE);
    const notifications = deriveTaskNotifications(snapshot.tasks, owner, today);

    return json({
      owner,
      today,
      count: notifications.length,
      notifications: notifications.slice(0, DISPLAY_LIMIT),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "WORKSPACE_DOMAIN_NOT_ALLOWED" ? 403 : 500;
    return json({ notifications: [], count: 0, error: code }, status);
  }
}
