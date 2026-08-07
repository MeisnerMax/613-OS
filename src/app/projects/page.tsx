import { Header, HealthTag, Progress } from "@/components/ui";
import { getPortfolioSnapshot } from "@/lib/read-model";

export default async function ProjectsPage() {
  const { projects } = await getPortfolioSnapshot();
  return <div className="stack"><Header eyebrow="Development" title="Projects" description="Portfolio view before the Hotel 57 Gantt pilot is connected."/><div className="tableWrap"><table className="table"><thead><tr><th>Project</th><th>Phase</th><th>Progress</th><th>Health</th><th>Owner</th><th>Completion</th><th>Next milestone</th></tr></thead><tbody>{projects.map((p) => <tr key={p.id}><td><span className="id">{p.id}</span><strong>{p.asset} Development</strong></td><td>{p.phase}</td><td><span>{p.progress}%</span><Progress value={p.progress}/></td><td><HealthTag value={p.health}/></td><td><span className="person"><span className="mini">MM</span>Max Meisner</span></td><td>{p.completion}</td><td>{p.nextMilestone}</td></tr>)}</tbody></table></div></div>;
}
