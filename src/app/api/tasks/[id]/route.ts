import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession } from "@/lib/db/authz";
import { apiErrorStatus, parseTaskPatchInput } from "@/lib/db/task-input";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  return NextResponse.json({ error: code }, { status: apiErrorStatus(code) });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await require613WorkspaceSession();
    const { id } = await context.params;
    const task = await new PostgresTaskStore().getTask(id);
    return task ? NextResponse.json({ task }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await require613WorkspaceSession();
    const { id } = await context.params;
    const input = parseTaskPatchInput(await request.json());
    const task = await new PostgresTaskStore().updateTask(id, input, { email: session.email });
    return task ? NextResponse.json({ task }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
