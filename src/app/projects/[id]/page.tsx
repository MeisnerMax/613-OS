import Link from "next/link";
import { Header, PriorityTag } from "@/components/ui";
import { getDevelopmentProjectDetail, getProjectWorkPackages } from "@/lib/read-model";
import { GanttTimeline } from "./GanttTimeline";
import "./project-detail.css";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, packages] = await Promise.all([
    getDevelopmentProjectDetail(id),
    getProjectWorkPackages(id),
  ]);

  if (!project) {
    return <div className="stack">
      <Link className="projectBack" href="/projects">← Back to projects</Link>
      <Header eyebrow="Development" title="Project pilot not active" description="The PostgreSQL Development pilot is still fail-closed for this environment." />
      <div className="panel projectUnavailable">No project data was queried. Activate the approved Development database source to open this pilot.</div>
    </div>;
  }

  const completed = packages.filter((item) => item.status === "Erledigt").length;
  const inProgress = packages.filter((item) => item.status === "In Bearbeitung").length;
  const progress = packages.length ? Math.round((completed / packages.length) * 100) : 0;

  return <div className="stack">
    <Link className="projectBack" href="/projects">← Back to projects</Link>
    <Header eyebrow={`${project.id} · ${project.status}`} title={project.name} description={`Live PostgreSQL pilot · source status ${project.asOfDate ?? "—"}`} />

    <div className="projectPilotMetrics">
      <Metric label="Progress" value={`${progress}%`} note={`${completed} of ${packages.length} packages completed`} />
      <Metric label="In progress" value={String(inProgress)} note="Current active work packages" />
      <Metric label="Project start" value={project.startDate ?? "—"} note="Imported project baseline" />
      <Metric label="Planned completion" value={project.plannedEndDate ?? "—"} note="Current source plan" />
    </div>

    <div className="panel projectFocus">
      <div><span>Current focus</span><strong>{project.currentFocus ?? "—"}</strong></div>
      <div><span>Responsible</span><strong>{project.currentOwner ?? "—"}</strong></div>
      <div><span>Start</span><strong>{project.currentStartDate ?? "—"}</strong></div>
      <div><span>Complete when</span><strong>{project.currentCompletionEvidence ?? "—"}</strong></div>
    </div>

    <GanttTimeline packages={packages} projectStart={project.startDate} projectEnd={project.plannedEndDate} />

    <div className="tableWrap">
      <table className="table developmentTable">
        <thead><tr><th>ID</th><th>Phase / package</th><th>Owner</th><th>Start</th><th>End</th><th>Status</th><th>Priority</th><th>Dependency</th><th>Complete when</th></tr></thead>
        <tbody>{packages.map((item) => <tr key={item.sourceId}>
          <td><span className="id">{item.sourceId}</span></td>
          <td><strong>{item.title}</strong><small>{item.phase}</small><p>{item.action}</p></td>
          <td>{item.owner ?? "—"}</td>
          <td>{item.start ?? "—"}</td>
          <td>{item.end ?? "—"}</td>
          <td><span className={`workStatus ${statusClass(item.status)}`}>{item.status}</span></td>
          <td><PriorityTag value={item.priority} /></td>
          <td>{item.dependency ?? "—"}</td>
          <td>{item.completionEvidence ?? "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function statusClass(status: string) {
  if (status === "Erledigt") return "done";
  if (status === "In Bearbeitung") return "progress";
  return "pending";
}
