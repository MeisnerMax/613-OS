import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requestedAssetSourceMode, requestedDevelopmentSourceMode } from "../src/lib/adapters/read-only/portfolio-provider-selector";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const store = readFileSync(join(root, "src/lib/db/asset-development-store.ts"), "utf8");
const selector = readFileSync(join(root, "src/lib/adapters/read-only/portfolio-provider-selector.ts"), "utf8");
const migration = readFileSync(join(root, "migrations/0002_asset_development_pilot.sql"), "utf8");
const projectDetailPage = readFileSync(join(root, "src/app/projects/[id]/page.tsx"), "utf8");
const assetsPage = readFileSync(join(root, "src/app/assets/page.tsx"), "utf8");
const assetDetailPage = readFileSync(join(root, "src/app/assets/[id]/page.tsx"), "utf8");

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
assert(store.includes("FROM development_work_packages"), "Development work-package database read is missing.");
assert(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(store), "Asset/development runtime store must remain read-only in the pilot.");

for (const table of ["assets", "development_projects", "development_work_packages"]) {
  assert(migration.includes(`CREATE TABLE ${table}`), `Missing ${table} schema.`);
}
assert(projectDetailPage.includes("getDevelopmentProjectDetail"), "Project detail metadata read is missing.");
assert(projectDetailPage.includes("getProjectWorkPackages"), "Project work-package read is missing.");
assert(projectDetailPage.includes("packages.map"), "Project work-package table is missing.");
assert(assetsPage.includes("Direct open tasks"), "Asset task metric must disclose direct-only linkage.");
assert(assetsPage.includes("Migrated projects"), "Asset project metric must disclose staged migration scope.");
assert(assetDetailPage.includes("getAssetById"), "Asset detail read path is missing.");
assert(assetDetailPage.includes("Financial snapshot"), "Asset financial snapshot section is missing.");
assert(assetDetailPage.includes("No source Sheet is modified"), "Asset detail must retain the read-only source disclosure.");

console.log("ASSET_DEVELOPMENT_PILOT_VERIFICATION_OK");
