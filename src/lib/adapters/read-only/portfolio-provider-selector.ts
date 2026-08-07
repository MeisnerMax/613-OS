import type { AssetReader } from "./contracts";
import { MockReadOnlyOperationsSource } from "./mock-source";
import { getGoogleOAuthConfig, getGoogleWorkspaceSession } from "@/lib/auth/google-workspace";
import { isTaskDatabaseConfigured } from "@/lib/db/client";
import { PostgresAssetDevelopmentStore } from "@/lib/db/asset-development-store";

export type PortfolioSourceMode = "mock-read-only" | "postgres";

type SelectionBase = {
  mode: PortfolioSourceMode;
  requestedMode: PortfolioSourceMode;
  reason: string;
};

export type AssetProviderSelection = SelectionBase & { reader: AssetReader };
export type DevelopmentProviderSelection = SelectionBase & { reader: PostgresAssetDevelopmentStore | null };

export function requestedAssetSourceMode(): PortfolioSourceMode {
  return process.env.OPS_ASSET_SOURCE === "postgres" ? "postgres" : "mock-read-only";
}

export function requestedDevelopmentSourceMode(): PortfolioSourceMode {
  return process.env.OPS_DEVELOPMENT_SOURCE === "postgres" ? "postgres" : "mock-read-only";
}

async function databaseSessionGate(approved: boolean) {
  if (!approved) return { ok: false, reason: "Database activation has not been approved." };
  if (!isTaskDatabaseConfigured()) return { ok: false, reason: "DATABASE_URL is not configured." };

  const session = await getGoogleWorkspaceSession();
  const { allowedDomain } = getGoogleOAuthConfig();
  if (!session.authenticated) return { ok: false, reason: "No authenticated Workspace session exists." };
  const validWorkspace = Boolean(allowedDomain && session.hostedDomain && session.hostedDomain.toLowerCase() === allowedDomain.toLowerCase());
  if (!validWorkspace) return { ok: false, reason: "Workspace domain gate is not configured or does not match." };
  return { ok: true, reason: "Authenticated Workspace database access approved." };
}

export async function selectAssetProvider(): Promise<AssetProviderSelection> {
  const requestedMode = requestedAssetSourceMode();
  const mock = new MockReadOnlyOperationsSource();
  if (requestedMode === "mock-read-only") {
    return { reader: mock, mode: "mock-read-only", requestedMode, reason: "Mock asset provider selected." };
  }

  const gate = await databaseSessionGate(process.env.OPS_ASSET_DB_APPROVED === "true");
  if (!gate.ok) return { reader: mock, mode: "mock-read-only", requestedMode, reason: gate.reason };
  return { reader: new PostgresAssetDevelopmentStore(), mode: "postgres", requestedMode, reason: gate.reason };
}

export async function selectDevelopmentProvider(): Promise<DevelopmentProviderSelection> {
  const requestedMode = requestedDevelopmentSourceMode();
  if (requestedMode === "mock-read-only") {
    return { reader: null, mode: "mock-read-only", requestedMode, reason: "Mock development provider selected." };
  }

  const gate = await databaseSessionGate(process.env.OPS_DEVELOPMENT_DB_APPROVED === "true");
  if (!gate.ok) return { reader: null, mode: "mock-read-only", requestedMode, reason: gate.reason };
  return { reader: new PostgresAssetDevelopmentStore(), mode: "postgres", requestedMode, reason: gate.reason };
}
