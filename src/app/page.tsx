import { Header, HealthTag, Progress, Status } from "@/components/ui";
import { getPortfolioSnapshot } from "@/lib/read-model";

export default async function HomePage() {
  const { assets, projects, tasks, overview } = await getPortfolioSnapshot();
  return <div className="stack">
    <Header eyebrow="Friday · Operations overview" title="Good afternoon, Max." description="Here is what needs attention across the portfolio."/>
    <section className="metrics">
      <Metric label="Open tasks" value={String(overview.openTasks)} meta="Across all owners"/>
      <Metric label="Overdue" value={String(overview.overdueTasks)} meta="Needs action" tone="danger"/>
      <Metric label="Waiting external" value={String(overview.waitingExternal)} meta="External dependencies" tone="warn"/>
      <Metric label="Active projects" value={String(overview.activeProjects)} meta={`${overview.projectsNeedingAttention} need attention`}/>
    </section>
    <div className="grid2">
      <section className="panel"><Title title="Attention required" link="View all"/>{tasks.filter((t) => t.flag).slice(0,4).map((t) => <div className="attentionRow" key={t.id}><i className={`flag ${t.flag}`}/><div className="main"><strong>{t.title}</strong><small>{t.asset} · {t.id}</small></div><Status value={t.status}/><div className="age">{t.waitingDays ? `${t.waitingDays}d waiting` : t.deadline ?? "No date"}</div></div>)}</section>
      <section className="panel"><Title title="Portfolio pulse"/><div className="pulse"><div><span>Assets tracked</span><strong>{overview.assetsTracked}</strong></div><div><span>Active assets</span><strong>{overview.activeAssets}</strong></div><div><span>Development projects</span><strong>{projects.length}</strong></div><div><span>Hotels in pilot</span><strong>{assets.filter((asset) => asset.type === "Hotel").length}</strong></div></div></section>
    </div>
    <section className="panel"><Title title="Development portfolio" link="Open projects"/>{projects.map((p) => <div className="projectRow" key={p.id}><div><strong>{p.asset}</strong><small>{p.phase}</small></div><div><small>{p.progress}% · {p.completion}</small><Progress value={p.progress}/></div><HealthTag value={p.health}/><div><small>Next milestone</small><strong>{p.nextMilestone}</strong></div></div>)}</section>
  </div>;
}

function Metric({ label, value, meta, tone = "" }: { label: string; value: string; meta: string; tone?: string }) { return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>; }
function Title({ title, link }: { title: string; link?: string }) { return <div className="sectionTitle"><h2>{title}</h2>{link ? <button>{link} →</button> : null}</div>; }
