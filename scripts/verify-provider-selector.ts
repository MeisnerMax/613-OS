import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const selector = readFileSync(join(root, "src/lib/adapters/read-only/provider-selector.ts"), "utf8");
const auth = readFileSync(join(root, "src/lib/auth/google-workspace.ts"), "utf8");
const authValidation = readFileSync(join(root, "src/lib/auth/google-oauth-validation.ts"), "utf8");
const callback = readFileSync(join(root, "src/app/api/auth/google/callback/route.ts"), "utf8");
const start = readFileSync(join(root, "src/app/api/auth/google/start/route.ts"), "utf8");
const client = readFileSync(join(root, "src/lib/adapters/read-only/google-sheets-client.ts"), "utf8");

assert(selector.includes('OPS_ALLOW_LIVE_TASK_DISPLAY === "true"'), "Live-display gate is missing.");
assert(selector.includes('OPS_TASK_PARITY_APPROVED === "true"'), "Parity-approval gate is missing.");
assert(selector.includes("getGoogleWorkspaceSession"), "Provider selector does not require a Google session.");
assert(auth.includes("spreadsheets.readonly") || auth.includes("GOOGLE_SHEETS_READONLY_SCOPE"), "Read-only Sheets scope is missing.");
assert(callback.includes('method: "POST"') && callback.includes("oauth2.googleapis.com/token"), "OAuth token exchange is missing.");
assert(callback.includes('method: "GET"') && callback.includes("openidconnect.googleapis.com/v1/userinfo"), "Google user verification is missing.");
assert(callback.includes("validateGrantedGoogleScopes"), "Granted OAuth scope validation is missing.");
assert(callback.includes("validateGoogleWorkspaceUser"), "Workspace user validation is missing.");
assert(authValidation.includes("hostedDomain !== normalizedAllowedDomain"), "Workspace restriction must validate the Google hd claim.");
assert(authValidation.includes("email_verified !== true"), "Verified Google email must be required.");
assert(start.includes('include_granted_scopes", "false"'), "OAuth must not merge previously granted scopes into this session.");
assert(client.includes('method: "GET"'), "Google Sheets client must use GET.");
assert(!client.match(/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/), "Google Sheets client exposes a write HTTP method.");
assert(!callback.includes("refresh_token"), "OAuth callback must not persist or request a refresh token in this phase.");

console.log("PROVIDER_SELECTOR_AND_AUTH_VERIFICATION_OK");
