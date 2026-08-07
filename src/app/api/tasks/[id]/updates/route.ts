import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession, requireTaskDatabaseWritesEnabled } from "@/lib/db/authz";
import { apiErrorStatus } from "@/lib/db/task-input";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await require613WorkspaceSession();
    requireTaskDatabaseWritesEnabled();
    const { id } = await context.params;
    const payload = await request.json() as { body?: unknown };
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body) throw new Error("INVALID_BODY");
    const task = await new PostgresTaskStore().addUpdate(id, body, { email: session.email });
    return task ? json({ task }) : json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    return json({ error: code }, apiErrorStatus(code));
  }
}
