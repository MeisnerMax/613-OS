import type { TaskReader } from "./contracts";
import { GoogleSheetsReadOnlyClient } from "./google-sheets-client";
import { GoogleSheetsTaskReader } from "./google-sheets-task-reader";
import { MockReadOnlyOperationsSource } from "./mock-source";
import { getGoogleOAuthConfig, getGoogleWorkspaceAccessToken, getGoogleWorkspaceSession } from "@/lib/auth/google-workspace";
import { PostgresTaskStore } from "@/lib/db/task-store";
import { isTaskDatabaseConfigured } from "@/lib/db/client";

export type TaskSourceMode = "mock-read-only" | "google-sheets-read-only" | "postgres";

export type TaskProviderSelection = {
  reader: TaskReader;
  mode: TaskSourceMode;
  requestedMode: TaskSourceMode;
  liveDisplayEnabled: boolean;
  reason: string;
};

export function requestedTaskSourceMode(): TaskSourceMode {
  if (process.env.OPS_TASK_SOURCE === "postgres") return "postgres";
  if (process.env.OPS_TASK_SOURCE === "google-sheets-read-only") return "google-sheets-read-only";
  return "mock-read-only";
}

export async function selectTaskProvider(): Promise<TaskProviderSelection> {
  const requestedMode = requestedTaskSourceMode();
  const mock = new MockReadOnlyOperationsSource();

  if (requestedMode === "mock-read-only") {
    return { reader: mock, mode: "mock-read-only", requestedMode, liveDisplayEnabled: false, reason: "Mock provider selected." };
  }

  if (requestedMode === "postgres") {
    const approved = process.env.OPS_TASK_DB_APPROVED === "true";
    const session = await getGoogleWorkspaceSession();
    const { allowedDomain } = getGoogleOAuthConfig();
    const validWorkspace = Boolean(allowedDomain && session.hostedDomain && session.hostedDomain.toLowerCase() === allowedDomain.toLowerCase());
    if (!approved || !isTaskDatabaseConfigured() || !session.authenticated || !validWorkspace) {
      return {
        reader: mock,
        mode: "mock-read-only",
        requestedMode,
        liveDisplayEnabled: false,
        reason: !approved
          ? "Postgres was requested but database activation has not been approved."
          : !isTaskDatabaseConfigured()
            ? "Postgres was requested but DATABASE_URL is not configured."
            : !session.authenticated
              ? "Postgres was requested but no authenticated Workspace session exists."
              : "Postgres was requested but the Workspace domain gate is not configured or does not match.",
      };
    }
    return { reader: new PostgresTaskStore(), mode: "postgres", requestedMode, liveDisplayEnabled: true, reason: "Authenticated Postgres task store selected." };
  }

  const liveDisplayEnabled = process.env.OPS_ALLOW_LIVE_TASK_DISPLAY === "true";
  const parityApproved = process.env.OPS_TASK_PARITY_APPROVED === "true";
  if (!liveDisplayEnabled || !parityApproved) {
    return {
      reader: mock,
      mode: "mock-read-only",
      requestedMode,
      liveDisplayEnabled: false,
      reason: !parityApproved
        ? "Google Sheets was requested but task parity has not been explicitly approved."
        : "Google Sheets was requested but live display is disabled.",
    };
  }

  const session = await getGoogleWorkspaceSession();
  if (!session.authenticated) {
    return { reader: mock, mode: "mock-read-only", requestedMode, liveDisplayEnabled: true, reason: "Google Sheets was requested but no authenticated Google Workspace session exists." };
  }

  const client = new GoogleSheetsReadOnlyClient(getGoogleWorkspaceAccessToken);
  return { reader: new GoogleSheetsTaskReader(client), mode: "google-sheets-read-only", requestedMode, liveDisplayEnabled: true, reason: "Authenticated read-only Google Sheets task provider selected." };
}
