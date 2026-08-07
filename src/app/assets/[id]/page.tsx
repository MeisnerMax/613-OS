import Link from "next/link";
import { Header } from "@/components/ui";
import { getAssetById } from "@/lib/read-model";
import "./asset-detail.css";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    return <div className="stack"><Link className="assetBack" href="/assets">← Back to assets</Link><Header eyebrow="Portfolio" title="Asset not available" description="This asset is not available through the currently approved source."/><div className="panel assetUnavailable">No asset database data was queried outside the approved provider.</div></div>;
  }

  const address = [asset.street, [asset.zipCode, asset.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return <div className="stack">
    <Link className="assetBack" href="/assets">← Back to assets</Link>
    <Header eyebrow={`${asset.id} · ${asset.status}`} title={asset.name} description={`${asset.type}${address ? ` · ${address}` : ""}`} />

    <div className="assetDetailMetrics">
      <Metric label="Units / rooms" value={asset.units ? number.format(asset.units) : "—"} />
      <Metric label="Living area" value={area(asset.livingAreaSqm)} />
      <Metric label="Total area" value={area(asset.totalAreaSqm)} />
      <Metric label="Year built" value={asset.yearBuilt ? String(asset.yearBuilt) : "—"} />
    </div>

    <section className="panel assetDetailSection">
      <div className="sectionTitle"><h2>Operational link status</h2></div>
      <div className="assetDetailGrid"><Detail label="Direct open tasks" value={String(asset.openTasks)} note="Only tasks with an unambiguous object name/address link"/><Detail label="Migrated projects" value={String(asset.projects)} note="Only Development projects already migrated to PostgreSQL"/><Detail label="Status" value={asset.status}/><Detail label="City" value={asset.city}/></div>
    </section>

    <section className="panel assetDetailSection">
      <div className="sectionTitle"><h2>Financial snapshot</h2></div>
      <div className="assetDetailGrid"><Detail label="Asset price" value={eur(asset.assetPrice)}/><Detail label="Property price" value={eur(asset.propertyPrice)}/><Detail label="Renovation cost until 2025" value={eur(asset.renovationCostUntil2025)}/><Detail label="Side costs / year" value={eur(asset.sideCostsYear)}/><Detail label="Market value 2021" value={eur(asset.marketValue2021)}/><Detail label="Market value 2026" value={eur(asset.marketValue2026)}/></div>
      <p className="assetSnapshotNote">Read-only migration snapshot from Asset_Overview_v4. No source Sheet is modified by this view.</p>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="assetDetailItem"><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>;
}

function eur(value?: number) { return value === undefined ? "—" : money.format(value); }
function area(value?: number) { return value === undefined ? "—" : `${number.format(value)} m²`; }
