import type { Asset, DevelopmentProjectDetail, DevelopmentWorkPackage, Priority } from "@/lib/domain";
import { taskDatabase } from "./client";

type DbNumber = number | string | null;

type AssetRow = {
  id: string;
  name: string;
  asset_type: string;
  status: Asset["status"];
  street: string | null;
  zip_code: string | null;
  city: string | null;
  year_built: DbNumber;
  living_area_sqm: DbNumber;
  total_area_sqm: DbNumber;
  units_rooms: DbNumber;
  side_costs_year: DbNumber;
  asset_price: DbNumber;
  property_price: DbNumber;
  renovation_cost_until_2025: DbNumber;
  market_value_2021: DbNumber;
  market_value_2026: DbNumber;
  open_tasks: DbNumber;
  project_count: DbNumber;
};

type ProjectRow = {
  id: string;
  asset_id: string;
  name: string;
  status: string;
  start_date: string | null;
  planned_end_date: string | null;
  as_of_date: string | null;
  current_focus: string | null;
  current_owner: string | null;
  current_start_date: string | null;
  current_completion_evidence: string | null;
};

type WorkPackageRow = {
  source_id: string;
  phase: string;
  title: string;
  action: string;
  owner: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  status: string;
  priority: Priority;
  dependency: string | null;
  completion_evidence: string | null;
  next_package: string | null;
  calendar: boolean;
  plan_offset_days: number | null;
};

function optionalNumber(value: DbNumber): number | undefined {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    type: row.asset_type,
    status: row.status,
    street: row.street ?? undefined,
    zipCode: row.zip_code ?? undefined,
    city: row.city ?? "—",
    yearBuilt: optionalNumber(row.year_built),
    livingAreaSqm: optionalNumber(row.living_area_sqm),
    totalAreaSqm: optionalNumber(row.total_area_sqm),
    units: optionalNumber(row.units_rooms) ?? 0,
    sideCostsYear: optionalNumber(row.side_costs_year),
    assetPrice: optionalNumber(row.asset_price),
    propertyPrice: optionalNumber(row.property_price),
    renovationCostUntil2025: optionalNumber(row.renovation_cost_until_2025),
    marketValue2021: optionalNumber(row.market_value_2021),
    marketValue2026: optionalNumber(row.market_value_2026),
    openTasks: Number(row.open_tasks ?? 0),
    projects: Number(row.project_count ?? 0),
  };
}

function mapProject(row: ProjectRow): DevelopmentProjectDetail {
  return {
    id: row.id,
    assetId: row.asset_id,
    name: row.name,
    status: row.status,
    startDate: row.start_date ?? undefined,
    plannedEndDate: row.planned_end_date ?? undefined,
    asOfDate: row.as_of_date ?? undefined,
    currentFocus: row.current_focus ?? undefined,
    currentOwner: row.current_owner ?? undefined,
    currentStartDate: row.current_start_date ?? undefined,
    currentCompletionEvidence: row.current_completion_evidence ?? undefined,
  };
}

function mapWorkPackage(row: WorkPackageRow): DevelopmentWorkPackage {
  return {
    sourceId: row.source_id,
    phase: row.phase,
    title: row.title,
    action: row.action,
    owner: row.owner ?? undefined,
    start: row.start_date ?? undefined,
    end: row.end_date ?? undefined,
    durationDays: row.duration_days ?? undefined,
    status: row.status,
    priority: row.priority,
    dependency: row.dependency ?? undefined,
    completionEvidence: row.completion_evidence ?? undefined,
    nextPackage: row.next_package ?? undefined,
    calendar: row.calendar,
    planOffsetDays: row.plan_offset_days ?? undefined,
  };
}

export class PostgresAssetDevelopmentStore {
  async listAssets(): Promise<ReadonlyArray<Asset>> {
    const sql = taskDatabase();
    const rows = await sql`
      SELECT a.id, a.name, a.asset_type, a.status, a.street, a.zip_code, a.city, a.year_built,
        a.living_area_sqm, a.total_area_sqm, a.units_rooms, a.side_costs_year, a.asset_price,
        a.property_price, a.renovation_cost_until_2025, a.market_value_2021, a.market_value_2026,
        (SELECT count(*) FROM tasks t
          WHERE t.deleted_at IS NULL AND t.status <> 'Done'
            AND (lower(trim(t.property_project)) = lower(trim(a.name))
              OR (a.street IS NOT NULL AND lower(trim(t.property_project)) = lower(trim(a.street))))) AS open_tasks,
        (SELECT count(*) FROM development_projects p WHERE p.asset_id = a.id) AS project_count
      FROM assets a
      ORDER BY COALESCE(a.legacy_source_row, 100000), a.id` as AssetRow[];
    return rows.map(mapAsset);
  }

  async getAsset(id: string): Promise<Asset | null> {
    const assets = await this.listAssets();
    return assets.find((asset) => asset.id === id) ?? null;
  }

  async getProjectDetail(projectId: string): Promise<DevelopmentProjectDetail | null> {
    const sql = taskDatabase();
    const rows = await sql`
      SELECT id, asset_id, name, status, start_date::text, planned_end_date::text, as_of_date::text,
        current_focus, current_owner, current_start_date::text, current_completion_evidence
      FROM development_projects
      WHERE id=${projectId}
      LIMIT 1` as ProjectRow[];
    return rows[0] ? mapProject(rows[0]) : null;
  }

  async listWorkPackages(projectId: string): Promise<ReadonlyArray<DevelopmentWorkPackage>> {
    const sql = taskDatabase();
    const rows = await sql`
      SELECT source_id, phase, title, action, owner, start_date::text, end_date::text, duration_days,
        status, priority, dependency, completion_evidence, next_package, calendar, plan_offset_days
      FROM development_work_packages
      WHERE project_id=${projectId}
      ORDER BY source_order` as WorkPackageRow[];
    return rows.map(mapWorkPackage);
  }
}
