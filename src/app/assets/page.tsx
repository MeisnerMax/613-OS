import Link from "next/link";
import { Header } from "@/components/ui";
import { getPortfolioSnapshot } from "@/lib/read-model";
import "./assets.css";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const { assets } = await getPortfolioSnapshot();
  return <div className="stack"><Header eyebrow="Portfolio" title="Assets" description="Asset master pilot. Direct task counts include only unambiguous object links; shared Hotel tasks remain unassigned until explicit relations are introduced."/><div className="assets">{assets.map((a) => <article className="assetCard" key={a.id}><div className="assetHead"><span className="assetId">{a.id}</span><span className={`assetStatus ${a.status === "Under examination" ? "exam" : a.status === "Sold" ? "sold" : ""}`}>{a.status}</span></div><h2>{a.name}</h2><p>{a.type} · {a.city}</p><div className="stats"><div><span>Units / rooms</span><strong>{a.units || "—"}</strong></div><div><span>Direct open tasks</span><strong>{a.openTasks}</strong></div><div><span>Migrated projects</span><strong>{a.projects}</strong></div></div><Link className="openAsset" href={`/assets/${a.id}`}>Open asset →</Link></article>)}</div></div>;
}
