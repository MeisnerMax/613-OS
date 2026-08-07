import { Header } from "@/components/ui";
import { getPortfolioSnapshot } from "@/lib/read-model";

export default async function AssetsPage() {
  const { assets } = await getPortfolioSnapshot();
  return <div className="stack"><Header eyebrow="Portfolio" title="Assets" description="Operational asset index. Financial source data stays in the existing Asset Overview."/><div className="assets">{assets.map((a) => <article className="assetCard" key={a.id}><div className="assetHead"><span className="assetId">{a.id}</span><span className={`assetStatus ${a.status === "Under examination" ? "exam" : ""}`}>{a.status}</span></div><h2>{a.name}</h2><p>{a.type} · {a.city}</p><div className="stats"><div><span>Units / rooms</span><strong>{a.units}</strong></div><div><span>Open tasks</span><strong>{a.openTasks}</strong></div><div><span>Projects</span><strong>{a.projects}</strong></div></div><button className="openAsset">Open asset →</button></article>)}</div></div>;
}
