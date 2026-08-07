import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_WORKSPACE_SCOPES,
  createOAuthState,
  createPkcePair,
  getGoogleOAuthConfig,
  googleAuthCookieNames,
  secureCookieOptions,
} from "@/lib/auth/google-workspace";

export async function GET(request: NextRequest) {
  const { clientId, allowedDomain } = getGoogleOAuthConfig();
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
  }

  const state = createOAuthState();
  const { verifier, challenge } = createPkcePair();
  const callbackUrl = new URL("/api/auth/google/callback", request.nextUrl.origin);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_WORKSPACE_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("include_granted_scopes", "false");
  authUrl.searchParams.set("prompt", "select_account");
  if (allowedDomain) authUrl.searchParams.set("hd", allowedDomain);

  const response = NextResponse.redirect(authUrl);
  const names = googleAuthCookieNames();
  response.cookies.set(names.state, state, secureCookieOptions(10 * 60));
  response.cookies.set(names.pkce, verifier, secureCookieOptions(10 * 60));
  return response;
}
