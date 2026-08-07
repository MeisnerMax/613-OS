import type { TaskReader } from "./contracts";
import { GoogleSheetsReadOnlyClient } from "./google-sheets-client";
import { GoogleSheetsTaskReader } from "./google-sheets-task-reader";
import { MockReadOnlyOperationsSource } from "./mock-source";
import { getGoogleWorkspaceAccessToken, getGoogleWorkspaceSession } from "@/lib/auth/google-workspace";

export type TaskSourceMode = "mock-read-only" | "google-sheets-read-only";

export type TaskProviderSelection = {
  reader: TaskReader;
  mode: TaskSourceMode;
  requestedMode: TaskSourceMode;
  liveDisplayEnabled: boolean;
  reason: string;
};

export function requestedTaskSourceMode(): TaskSourceMode {
  return process.env.OPS_TASK_SOURCE === "google-sheets-read-only"
    ? "google-sheets-read-only"
    : "mock-read-only";
}

export async function selectTaskProvider(): Promise<TaskProviderSelection> {
  const requestedMode = requestedTaskSourceMode();
  const mock = new MockReadOnlyOperationsSource();

  if (requestedMode === "mock-read-only") {
    return {
      reader: mock,
      mode: "mock-read-only",
      requestedMode,
      liveDisplayEnabled: false,
      reason: "Mock provider selected.",
    };
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
    return {
      reader: mock,
      mode: "mock-read-only",
      requestedMode,
      liveDisplayEnabled: true,
      reason: "Google Sheets was requested but no authenticated Google Workspace session exists.",
    };
  }

  const client = new GoogleSheetsReadOnlyClient(getGoogleWorkspaceAccessToken);
  return {
    reader: new GoogleSheetsTaskReader(client),
    mode: "google-sheets-read-only",
    requestedMode,
    liveDisplayEnabled: true,
    reason: "Authenticated read-only Google Sheets task provider selected.",
  };
}
