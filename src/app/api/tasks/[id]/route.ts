import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession, requireTaskDatabaseWritesEnabled } from "@/lib/db/authz";
import { apiErrorStatus, parseTaskPatchInput } from "@/lib/db/task-input";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  return json({ error: code }, apiErrorStatus(code));
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await require613WorkspaceSession();
    const { id } = await context.params;
    const task = await new PostgresTaskStore().getTask(id);
    return task ? json({ task }) : json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await require613WorkspaceSession();
    requireTaskDatabaseWritesEnabled();
    const { id } = await context.params;
    const input = parseTaskPatchInput(await request.json());
    const task = await new PostgresTaskStore().updateTask(id, input, { email: session.email });
    return task ? json({ task }) : json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
