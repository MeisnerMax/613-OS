import { NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleWorkspaceSession,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-workspace";
import { requestedTaskSourceMode } from "@/lib/adapters/read-only/provider-selector";

export async function GET() {
  const session = await getGoogleWorkspaceSession();
  const { allowedDomain } = getGoogleOAuthConfig();
  return NextResponse.json({
    oauthConfigured: isGoogleOAuthConfigured(),
    authenticated: session.authenticated,
    email: session.email ?? null,
    hostedDomain: session.hostedDomain ?? null,
    allowedDomain: allowedDomain ?? null,
    taskSourceRequested: requestedTaskSourceMode(),
    taskParityApproved: process.env.OPS_TASK_PARITY_APPROVED === "true",
    liveTaskDisplayEnabled: process.env.OPS_ALLOW_LIVE_TASK_DISPLAY === "true",
  });
}
