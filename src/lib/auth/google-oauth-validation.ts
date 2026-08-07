import { GOOGLE_SHEETS_READONLY_SCOPE } from "../adapters/read-only/google-sheets-client";

export type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  hd?: string;
};

export type ValidatedGoogleUser = {
  subject: string;
  email: string;
  hostedDomain?: string;
};

export function parseGrantedScopes(value?: string | null): Set<string> {
  return new Set(
    (value ?? "")
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
}

export function hasRequiredGoogleSheetsScope(value?: string | null): boolean {
  return parseGrantedScopes(value).has(GOOGLE_SHEETS_READONLY_SCOPE);
}

export function validateGrantedGoogleScopes(value?: string | null): void {
  const scopes = parseGrantedScopes(value);
  if (!scopes.has(GOOGLE_SHEETS_READONLY_SCOPE)) {
    throw new Error("Google did not grant the required read-only Sheets scope.");
  }

  const broaderSheetsScope = [...scopes].find(
    (scope) => scope.includes("/auth/spreadsheets") && scope !== GOOGLE_SHEETS_READONLY_SCOPE,
  );
  if (broaderSheetsScope) {
    throw new Error("Google granted a broader Sheets permission than 613 OS allows.");
  }
}

export function validateGoogleWorkspaceUser(
  userInfo: GoogleUserInfo,
  allowedDomain?: string,
): ValidatedGoogleUser {
  const subject = userInfo.sub?.trim();
  const email = userInfo.email?.trim().toLowerCase();
  const hostedDomain = userInfo.hd?.trim().toLowerCase();
  const normalizedAllowedDomain = allowedDomain?.trim().toLowerCase();

  if (!subject) throw new Error("Google user identifier is missing.");
  if (!email || userInfo.email_verified !== true) {
    throw new Error("A verified Google email is required.");
  }

  if (normalizedAllowedDomain && hostedDomain !== normalizedAllowedDomain) {
    throw new Error("Google account is outside the allowed Workspace domain.");
  }

  return {
    subject,
    email,
    hostedDomain: hostedDomain || undefined,
  };
}
