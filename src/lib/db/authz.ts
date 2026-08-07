import { getGoogleOAuthConfig, getGoogleWorkspaceSession } from "@/lib/auth/google-workspace";

export async function require613WorkspaceSession() {
  const session = await getGoogleWorkspaceSession();
  const { allowedDomain } = getGoogleOAuthConfig();
  if (!session.authenticated || !session.email || !session.hostedDomain) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!allowedDomain || session.hostedDomain.toLowerCase() !== allowedDomain.toLowerCase()) {
    throw new Error("WORKSPACE_DOMAIN_NOT_ALLOWED");
  }
  return session;
}
