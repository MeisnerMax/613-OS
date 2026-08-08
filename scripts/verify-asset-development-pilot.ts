import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requestedAssetSourceMode, requestedDevelopmentSourceMode } from "../src/lib/adapters/read-only/portfolio-provider-selector";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const store = readFileSync(join(root, "src/lib/db/asset-development-store.ts"), "utf8");
const readModel = readFileSync(join(root, "src/lib/read-model.ts"), "utf8");
const selector = readFileSync(join(root, "src/lib/adapters/read-only/portfolio-provider-selector.ts"), "utf8");
const migration = readFileSync(join(root, "migrations/0002_asset_development_pilot.sql"), "utf8");
const rollback = readFileSync(join(root, "migrations/0002_asset_development_pilot_rollback.sql"), "utf8");
const projectsPage = readFileSync(join(root, "src/app/projects/page.tsx"), "utf8");
const projectDetailPage = readFileSync(join(root, "src/app/projects/[id]/page.tsx"), "utf8");
const assetsPage = readFileSync(join(root, "src/app/assets/page.tsx"), "utf8");
const assetsStyles = readFileSync(join(root, "src/app/assets/assets.css"), "utf8");
const assetDetailPage = readFileSync(join(root, "src/app/assets/[id]/page.tsx"), "utf8");
const runtimeVerifier = readFileSync(join(root, "src/app/api/verify/portfolio-db/route.ts"), "utf8");
const authStatus = readFileSync(join(root, "src/app/api/auth/status/route.ts"), "utf8");

const oldAssetSource = process.env.OPS_ASSET_SOURCE;
const oldDevelopmentSource = process.env.OPS_DEVELOPMENT_SOURCE;
delete process.env.OPS_ASSET_SOURCE;
delete process.env.OPS_DEVELOPMENT_SOURCE;
assert(requestedAssetSourceMode() === "mock-read-only", "Asset source must default fail-closed to mock.");
assert(requestedDevelopmentSourceMode() === "mock-read-only", "Development source must default fail-closed to mock.");
process.env.OPS_ASSET_SOURCE = "postgres";
process.env.OPS_DEVELOPMENT_SOURCE = "postgres";
assert(requestedAssetSourceMode() === "postgres", "Asset postgres request mode is missing.");
assert(requestedDevelopmentSourceMode() === "postgres", "Development postgres request mode is missing.");
if (oldAssetSource === undefined) delete process.env.OPS_ASSET_SOURCE; else process.env.OPS_ASSET_SOURCE = oldAssetSource;
if (oldDevelopmentSource === undefined) delete process.env.OPS_DEVELOPMENT_SOURCE; else process.env.OPS_DEVELOPMENT_SOURCE = oldDevelopmentSource;

assert(selector.includes('OPS_ASSET_DB_APPROVED === "true"'), "Asset approval gate is missing.");
assert(selector.includes('OPS_DEVELOPMENT_DB_APPROVED === "true"'), "Development approval gate is missing.");
assert(selector.includes("getGoogleWorkspaceSession"), "Workspace session gate is missing.");
assert(selector.includes("allowedDomain"), "Workspace domain gate is missing.");

assert(store.includes("SELECT a.id"), "Asset database read is missing.");
assert(store.includes("a.market_value_2026"), "Full Asset Master snapshot fields are not exposed.");
assert(store.includes("async listProjectIds"), "Migrated Development project ID read is missing.");
assert(store.includes("FROM development_projects"), "Development project database read is missing.");
assert(store.includes("FROM development_work_packages"), "Development work-package database read is missing.");
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(store), "Asset/development runtime store must remain read-only in the pilot.");

for (const table of ["assets", "development_projects", "development_work_packages"]) {
  assert(migration.includes(`CREATE TABLE ${table}`), `Missing ${table} schema.`);
  assert(rollback.includes(`DROP TABLE IF EXISTS ${table}`), `Missing ${table} rollback.`);
}
for (const protectedTable of ["tasks", "task_updates", "activity_events", "migration_runs"]) {
  assert(!new RegExp(`DROP\\s+TABLE[^;]*\\b${protectedTable}\\b`, "i").test(rollback), `Rollback must never drop ${protectedTable}.`);
}
assert(readModel.includes("getMigratedDevelopmentProjectIds"), "Read model must expose migrated Development project IDs.");
assert(readModel.includes("provider.reader.listProjectIds()"), "Migrated project IDs must come from the approved Development provider.");
assert(projectsPage.includes('export const dynamic = "force-dynamic"'), "Projects overview must stay dynamic so migrated navigation follows the Workspace session gate.");
assert(projectsPage.includes("getMigratedDevelopmentProjectIds"), "Projects overview must query the migrated Development project set.");
assert(projectsPage.includes("migratedProjects.has(p.id)"), "Projects overview must link projects based on migrated database membership.");
assert(!projectsPage.includes('p.id === "PRJ-0001"'), "Projects overview must not hard-code Hotel 57 as the only linked project.");
assert(projectDetailPage.includes("getDevelopmentProjectDetail"), "Project detail metadata read is missing.");
assert(projectDetailPage.includes("getProjectWorkPackages"), "Project work-package read is missing.");
assert(projectDetailPage.includes("packages.map"), "Project work-package table is missing.");
assert(assetsPage.includes('export const dynamic = "force-dynamic"'), "Asset overview must stay dynamic so the Workspace session gate runs at request time.");
assert(assetsPage.includes("Direct open tasks"), "Asset task metric must disclose direct-only linkage.");
assert(assetsPage.includes("Migrated projects"), "Asset project metric must disclose staged migration scope.");
assert(assetsPage.includes('a.status === "Sold" ? "sold"'), "Sold Assets need a distinct visual state.");
assert(assetsStyles.includes(".assetStatus.sold"), "Sold Asset styling is missing.");
assert(assetsStyles.includes(".openAsset{display:flex"), "Asset detail link layout is missing.");
assert(assetDetailPage.includes("getAssetById"), "Asset detail read path is missing.");
assert(assetDetailPage.includes("Financial snapshot"), "Asset financial snapshot section is missing.");
assert(assetDetailPage.includes("No source Sheet is modified"), "Asset detail must retain the read-only source disclosure.");

assert(runtimeVerifier.includes("require613WorkspaceSession"), "Portfolio runtime verifier must require a 613 Workspace session.");
assert(runtimeVerifier.includes('"Cache-Control": "no-store"'), "Portfolio runtime verifier must disable caching.");
assert(runtimeVerifier.includes("taskBaseline"), "Portfolio verifier must protect the existing 75-task baseline.");
assert(runtimeVerifier.includes("assets?.total === 19"), "Portfolio verifier must enforce 19 Asset records.");
assert(runtimeVerifier.includes("development?.projects === 4"), "Portfolio verifier must enforce the four-project staged Development scope.");
assert(runtimeVerifier.includes("development.packages === 288"), "Portfolio verifier must enforce the 288-package staged Development scope.");
assert(runtimeVerifier.includes("hotel57.packages === 72"), "Portfolio verifier must enforce 72 Hotel 57 packages.");
assert(runtimeVerifier.includes('hotel57.assetId === "A004"'), "Hotel 57 Asset link verification is missing.");
assert(runtimeVerifier.includes("hahnmuehle.packages === 72"), "Portfolio verifier must enforce 72 Hahnmuehle packages.");
assert(runtimeVerifier.includes('hahnmuehle.assetId === "A005"'), "Hahnmuehle Asset link verification is missing.");
assert(runtimeVerifier.includes("hahnmuehle.done === 3"), "Hahnmuehle completed-package baseline is missing.");
assert(runtimeVerifier.includes("hahnmuehle.inProgress === 7"), "Hahnmuehle in-progress baseline is missing.");
assert(runtimeVerifier.includes("hahnmuehle.notStarted === 62"), "Hahnmuehle not-started baseline is missing.");
assert(runtimeVerifier.includes("square.packages === 72"), "Portfolio verifier must enforce 72 Square packages.");
assert(runtimeVerifier.includes('square.assetId === "A010"'), "Square Asset link verification is missing.");
assert(runtimeVerifier.includes("square.done === 3"), "Square completed-package baseline is missing.");
assert(runtimeVerifier.includes("square.inProgress === 5"), "Square in-progress baseline is missing.");
assert(runtimeVerifier.includes("square.notStarted === 64"), "Square not-started baseline is missing.");
assert(runtimeVerifier.includes("adamRiese.packages === 72"), "Portfolio verifier must enforce 72 Adam Riese packages.");
assert(runtimeVerifier.includes('adamRiese.assetId === "A008"'), "Adam Riese Asset link verification is missing.");
assert(runtimeVerifier.includes("adamRiese.done === 4"), "Adam Riese completed-package baseline is missing.");
assert(runtimeVerifier.includes("adamRiese.inProgress === 2"), "Adam Riese in-progress baseline is missing.");
assert(runtimeVerifier.includes("adamRiese.notStarted === 66"), "Adam Riese not-started baseline is missing.");
assert(runtimeVerifier.includes("legacy-asset-import-2026-08-07"), "Asset migration marker verification is missing.");
assert(runtimeVerifier.includes("legacy-development-hotel57-import-2026-08-07"), "Hotel 57 migration marker verification is missing.");
assert(runtimeVerifier.includes("legacy-development-hahnmuehle-import-2026-08-08"), "Hahnmuehle migration marker verification is missing.");
assert(runtimeVerifier.includes("legacy-development-square-import-2026-08-08"), "Square migration marker verification is missing.");
assert(runtimeVerifier.includes("legacy-development-adamriese-import-2026-08-08"), "Adam Riese migration marker verification is missing.");
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(runtimeVerifier), "Portfolio runtime verifier must be read-only.");
assert(!runtimeVerifier.includes("market_value"), "Portfolio runtime verifier must not expose financial values.");
assert(!runtimeVerifier.includes("description"), "Portfolio runtime verifier must not expose descriptive source content.");
assert(authStatus.includes("assetSourceRequested"), "Auth status must expose the requested Asset source mode.");
assert(authStatus.includes("assetDatabaseApproved"), "Auth status must expose the Asset approval gate.");
assert(authStatus.includes("developmentSourceRequested"), "Auth status must expose the requested Development source mode.");
assert(authStatus.includes("developmentDatabaseApproved"), "Auth status must expose the Development approval gate.");

console.log("ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK");
