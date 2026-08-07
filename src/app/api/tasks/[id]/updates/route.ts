import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession } from "@/lib/db/authz";
import { apiErrorStatus } from "@/lib/db/task-input";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await require613WorkspaceSession();
    const { id } = await context.params;
    const payload = await request.json() as { body?: unknown };
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body) throw new Error("INVALID_BODY");
    const task = await new PostgresTaskStore().addUpdate(id, body, { email: session.email });
    return task ? NextResponse.json({ task }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    return NextResponse.json({ error: code }, { status: apiErrorStatus(code) });
  }
}
