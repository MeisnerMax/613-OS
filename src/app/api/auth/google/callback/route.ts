import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  getGoogleOAuthConfig,
  googleAuthCookieNames,
  secureCookieOptions,
} from "@/lib/auth/google-workspace";
import {
  validateGoogleWorkspaceUser,
  validateGrantedGoogleScopes,
  type GoogleUserInfo,
} from "@/lib/auth/google-oauth-validation";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

function clearTransientCookies(response: NextResponse) {
  const names = googleAuthCookieNames();
  response.cookies.delete(names.state);
  response.cookies.delete(names.pkce);
  return response;
}

function oauthError(message: string, status: number) {
  return clearTransientCookies(NextResponse.json({ error: message }, { status }));
}

export async function GET(request: NextRequest) {
  const { clientId, clientSecret, allowedDomain } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    return oauthError("Google OAuth is not configured.", 503);
  }

  const returnedState = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const names = googleAuthCookieNames();
  const expectedState = store.get(names.state)?.value;
  const verifier = store.get(names.pkce)?.value;

  if (!returnedState || !expectedState || returnedState !== expectedState || !verifier) {
    return oauthError("Invalid OAuth callback state.", 400);
  }

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    return oauthError(`Google OAuth was not completed: ${providerError}.`, 400);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return oauthError("Google authorization code is missing.", 400);

  const callbackGrantedScopes = request.nextUrl.searchParams.get("scope");
  const callbackHostedDomain = request.nextUrl.searchParams.get("hd")?.trim().toLowerCase();
  if (allowedDomain && callbackHostedDomain && callbackHostedDomain !== allowedDomain) {
    return oauthError("Google account is outside the allowed Workspace domain.", 403);
  }

  const callbackUrl = new URL("/api/auth/google/callback", request.nextUrl.origin);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl.toString(),
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return oauthError("Google token exchange failed.", 502);
  }

  const token = await tokenResponse.json() as TokenResponse;
  if (!token.access_token) {
    return oauthError("Google did not return an access token.", 502);
  }

  try {
    validateGrantedGoogleScopes(token.scope ?? callbackGrantedScopes);
  } catch (error) {
    return oauthError(error instanceof Error ? error.message : "Required Google scope was not granted.", 403);
  }

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!userInfoResponse.ok) {
    return oauthError("Google user verification failed.", 502);
  }

  const userInfo = await userInfoResponse.json() as GoogleUserInfo;
  let validatedUser;
  try {
    validatedUser = validateGoogleWorkspaceUser(userInfo, allowedDomain);
  } catch (error) {
    return oauthError(error instanceof Error ? error.message : "Google Workspace user validation failed.", 403);
  }

  const maxAge = Math.max(60, (token.expires_in ?? 3600) - 60);
  const response = NextResponse.redirect(new URL("/tasks", request.nextUrl.origin));
  response.cookies.set(names.accessToken, token.access_token, secureCookieOptions(maxAge));
  response.cookies.set(names.email, validatedUser.email, secureCookieOptions(maxAge));
  response.cookies.set(names.subject, validatedUser.subject, secureCookieOptions(maxAge));
  if (validatedUser.hostedDomain) {
    response.cookies.set(names.hostedDomain, validatedUser.hostedDomain, secureCookieOptions(maxAge));
  } else {
    response.cookies.delete(names.hostedDomain);
  }
  return clearTransientCookies(response);
}
