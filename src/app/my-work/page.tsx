import type { Task } from "@/lib/domain";
import { getPortfolioSnapshot } from "@/lib/read-model";
import { currentMyWorkOwner, selectMyWorkTasks } from "@/lib/my-work";
import { Header, PriorityTag, Status } from "@/components/ui";

export default async function MyWorkPage() {
  const { tasks } = await getPortfolioSnapshot();
  const owner = currentMyWorkOwner();
  const myTasks = selectMyWorkTasks(tasks, owner);
  const overdue = myTasks.filter((t) => t.flag === "overdue");
  const waiting = myTasks.filter((t) => t.status === "Waiting" && t.flag !== "overdue");
  const upcoming = myTasks.filter((t) => t.status !== "Waiting" && t.flag !== "overdue");
  return <div className="stack">
    <Header eyebrow="Personal workspace" title="My Work" description={`A focused view of what ${owner} needs to move next.`}/>
    <div className="workSummary"><div><span>Assigned</span><strong>{myTasks.length}</strong></div><div><span>Overdue</span><strong className="danger">{overdue.length}</strong></div><div><span>Waiting</span><strong>{waiting.length}</strong></div><div><span>Upcoming</span><strong>{upcoming.length}</strong></div></div>
    <WorkSection title="Overdue" items={overdue}/><WorkSection title="Waiting" items={waiting}/><WorkSection title="This week" items={upcoming}/>
  </div>;
}

function WorkSection({ title, items }: { title: string; items: Task[] }) {
  return <section className="panel"><div className="sectionTitle"><h2>{title} · {items.length}</h2></div>{items.map((t) => <div className="workRow" key={t.id}><button className="circle" aria-label={`Complete ${t.title}`}/><div className="main"><strong>{t.title}</strong><small>{t.asset} · {t.id}</small></div><PriorityTag value={t.priority}/><Status value={t.status}/><div className="next"><small>Next step</small><strong>{t.nextStep ?? "—"}</strong></div><div className={t.flag === "overdue" ? "danger" : ""}>{t.waitingDays ? `${t.waitingDays}d` : t.deadline ?? "—"}</div></div>)}</section>;
}
