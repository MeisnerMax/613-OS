import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { GOOGLE_SHEETS_READONLY_SCOPE } from "@/lib/adapters/read-only/google-sheets-client";

const ACCESS_TOKEN_COOKIE = "613_os_google_access_token";
const EMAIL_COOKIE = "613_os_google_email";
const SUBJECT_COOKIE = "613_os_google_sub";
const HOSTED_DOMAIN_COOKIE = "613_os_google_hd";
const OAUTH_STATE_COOKIE = "613_os_google_oauth_state";
const PKCE_COOKIE = "613_os_google_pkce";

export const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_SHEETS_READONLY_SCOPE,
] as const;

export type GoogleWorkspaceSession = {
  authenticated: boolean;
  email?: string;
  subject?: string;
  hostedDomain?: string;
  accessToken?: string;
};

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const allowedDomain = process.env.GOOGLE_WORKSPACE_ALLOWED_DOMAIN?.trim().toLowerCase();
  return { clientId, clientSecret, allowedDomain };
}

export function isGoogleOAuthConfigured() {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  return Boolean(clientId && clientSecret);
}

export async function getGoogleWorkspaceSession(): Promise<GoogleWorkspaceSession> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const email = store.get(EMAIL_COOKIE)?.value;
  const subject = store.get(SUBJECT_COOKIE)?.value;
  const hostedDomain = store.get(HOSTED_DOMAIN_COOKIE)?.value;
  return accessToken
    ? { authenticated: true, accessToken, email, subject, hostedDomain }
    : { authenticated: false };
}

export async function getGoogleWorkspaceAccessToken(): Promise<string> {
  const session = await getGoogleWorkspaceSession();
  if (!session.accessToken) throw new Error("Google Workspace session is not authenticated.");
  return session.accessToken;
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function googleAuthCookieNames() {
  return {
    accessToken: ACCESS_TOKEN_COOKIE,
    email: EMAIL_COOKIE,
    subject: SUBJECT_COOKIE,
    hostedDomain: HOSTED_DOMAIN_COOKIE,
    state: OAUTH_STATE_COOKIE,
    pkce: PKCE_COOKIE,
  } as const;
}

export function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
