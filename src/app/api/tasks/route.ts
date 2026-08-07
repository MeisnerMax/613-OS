import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession, requireTaskDatabaseWritesEnabled } from "@/lib/db/authz";
import { apiErrorStatus, parseTaskCreateInput } from "@/lib/db/task-input";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  return NextResponse.json({ error: code }, { status: apiErrorStatus(code) });
}

export async function GET() {
  try {
    await require613WorkspaceSession();
    return NextResponse.json({ tasks: await new PostgresTaskStore().listTasks() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await require613WorkspaceSession();
    requireTaskDatabaseWritesEnabled();
    const input = parseTaskCreateInput(await request.json());
    const task = await new PostgresTaskStore().createTask(input, { email: session.email });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
