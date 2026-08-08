import Link from "next/link";
import { Header, HealthTag, Progress } from "@/components/ui";
import { getMigratedDevelopmentProjectIds, getPortfolioSnapshot } from "@/lib/read-model";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [{ projects }, migratedProjectIds] = await Promise.all([
    getPortfolioSnapshot(),
    getMigratedDevelopmentProjectIds(),
  ]);
  const migratedProjects = new Set(migratedProjectIds);

  return <div className="stack"><Header eyebrow="Development" title="Projects" description="Migrated PostgreSQL projects open into their verified detail view; remaining projects stay in the transition overview."/><div className="tableWrap"><table className="table"><thead><tr><th>Project</th><th>Phase</th><th>Progress</th><th>Health</th><th>Owner</th><th>Completion</th><th>Next milestone</th></tr></thead><tbody>{projects.map((p) => <tr key={p.id}><td><span className="id">{p.id}</span>{migratedProjects.has(p.id) ? <Link href={`/projects/${p.id}`}><strong>{p.asset} Development →</strong></Link> : <strong>{p.asset} Development</strong>}</td><td>{p.phase}</td><td><span>{p.progress}%</span><Progress value={p.progress}/></td><td><HealthTag value={p.health}/></td><td><span className="person"><span className="mini">MM</span>Max Meisner</span></td><td>{p.completion}</td><td>{p.nextMilestone}</td></tr>)}</tbody></table></div></div>;
}
