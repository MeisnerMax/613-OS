import { Header } from "@/components/ui";
import { TaskTable } from "@/components/task-table";
import { getPortfolioSnapshot } from "@/lib/read-model";
import {
  getGoogleWorkspaceSession,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-workspace";
import "./task-crud.css";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ task?: string | string[] }> }) {
  const [{ tasks, sourceMode }, session, params] = await Promise.all([
    getPortfolioSnapshot(),
    getGoogleWorkspaceSession(),
    searchParams,
  ]);
  const oauthConfigured = isGoogleOAuthConfigured();
  const sourceLabel = sourceMode === "postgres" ? "613 OS database" : sourceMode === "mock-read-only" ? "isolated mock read model" : "read-only Google Sheets";
  const initialTaskId = typeof params.task === "string" ? params.task : undefined;

  return <div className="stack">
    <Header eyebrow="Operations" title="Tasks" description={`One task record, multiple views. Current source: ${sourceLabel}.`}/>
    <section className="panel authPanel">
      <div>
        <span className="eyebrow">Google Workspace connection</span>
        <strong>{session.authenticated ? `Connected · ${session.email ?? "verified Google account"}` : oauthConfigured ? "Ready to connect" : "OAuth client not configured"}</strong>
        <small>
          {sourceMode === "postgres"
            ? "613 OS is using its own task database."
            : sourceMode === "google-sheets-read-only"
              ? "Live task source is active in read-only mode."
              : "Task database remains locked; production Sheets are not being written to."}
        </small>
      </div>
      {session.authenticated
        ? <a className="authAction secondary" href="/api/auth/logout">Disconnect</a>
        : oauthConfigured
          ? <a className="authAction" href="/api/auth/google/start">Connect Google Workspace</a>
          : <span className="authHint">Set the OAuth environment variables first.</span>}
    </section>
    <TaskTable tasks={tasks} initialSelectedId={initialTaskId}/>
  </div>;
}
