import { NextResponse } from "next/server";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { require613WorkspaceSession, requireTaskDatabaseWritesEnabled } from "@/lib/db/authz";
import { apiErrorStatus, parseTaskCreateInput } from "@/lib/db/task-input";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  return json({ error: code }, apiErrorStatus(code));
}

export async function GET() {
  try {
    await require613WorkspaceSession();
    return json({ tasks: await new PostgresTaskStore().listTasks() });
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
    return json({ task }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
