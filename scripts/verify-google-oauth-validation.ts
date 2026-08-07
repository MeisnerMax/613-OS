import { GOOGLE_SHEETS_READONLY_SCOPE } from "../src/lib/adapters/read-only/google-sheets-client";
import {
  hasRequiredGoogleSheetsScope,
  parseGrantedScopes,
  validateGoogleWorkspaceUser,
  validateGrantedGoogleScopes,
} from "../src/lib/auth/google-oauth-validation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, expectedText: string) {
  let message = "";
  try {
    fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes(expectedText), `Expected error containing ${JSON.stringify(expectedText)}, got ${JSON.stringify(message)}`);
}

const scopes = `openid email profile ${GOOGLE_SHEETS_READONLY_SCOPE}`;
assert(parseGrantedScopes(scopes).size === 4, "Scope parsing failed.");
assert(hasRequiredGoogleSheetsScope(scopes), "Read-only Sheets scope was not detected.");
validateGrantedGoogleScopes(scopes);
expectThrows(() => validateGrantedGoogleScopes("openid email profile"), "read-only Sheets scope");
expectThrows(() => validateGrantedGoogleScopes(`${scopes} https://www.googleapis.com/auth/spreadsheets`), "broader Sheets permission");

const valid = validateGoogleWorkspaceUser({
  sub: "google-subject-123",
  email: "max@example.com",
  email_verified: true,
  hd: "example.com",
}, "example.com");
assert(valid.subject === "google-subject-123", "Stable Google subject was not preserved.");
assert(valid.email === "max@example.com", "Google email was not normalized.");
assert(valid.hostedDomain === "example.com", "Hosted domain was not preserved.");

expectThrows(() => validateGoogleWorkspaceUser({
  sub: "google-subject-123",
  email: "max@example.com",
  email_verified: true,
}, "example.com"), "outside the allowed Workspace domain");

expectThrows(() => validateGoogleWorkspaceUser({
  sub: "google-subject-123",
  email: "max@example.com",
  email_verified: true,
  hd: "other.example",
}, "example.com"), "outside the allowed Workspace domain");

expectThrows(() => validateGoogleWorkspaceUser({
  sub: "google-subject-123",
  email: "max@example.com",
  email_verified: false,
  hd: "example.com",
}, "example.com"), "verified Google email");

expectThrows(() => validateGoogleWorkspaceUser({
  email: "max@example.com",
  email_verified: true,
  hd: "example.com",
}, "example.com"), "identifier is missing");

console.log("GOOGLE_OAUTH_VALIDATION_OK");
