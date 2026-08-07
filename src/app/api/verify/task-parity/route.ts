import { NextResponse } from "next/server";
import { GoogleSheetsReadOnlyClient } from "@/lib/adapters/read-only/google-sheets-client";
import { getGoogleWorkspaceAccessToken, getGoogleWorkspaceSession } from "@/lib/auth/google-workspace";
import { verifyTaskParity } from "@/lib/verification/task-parity";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getGoogleWorkspaceSession();
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, authenticated: false, error: "Google Workspace session required." },
      { status: 401 },
    );
  }

  try {
    const client = new GoogleSheetsReadOnlyClient(getGoogleWorkspaceAccessToken);
    const result = await verifyTaskParity(client);
    return NextResponse.json({
      authenticated: true,
      email: session.email ?? null,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: true,
        error: error instanceof Error ? error.message : "Task parity check failed.",
      },
      { status: 500 },
    );
  }
}
