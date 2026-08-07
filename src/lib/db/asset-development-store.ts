import type { Asset, DevelopmentProjectDetail, DevelopmentWorkPackage, Priority } from "@/lib/domain";
import { taskDatabase } from "./client";

type AssetRow = {
  id: string;
  name: string;
  asset_type: string;
  status: Asset["status"];
  city: string | null;
  units_rooms: number | null;
  open_tasks: number | string;
  project_count: number | string;
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

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    type: row.asset_type,
    status: row.status,
    city: row.city ?? "—",
    units: Number(row.units_rooms ?? 0),
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
      SELECT a.id, a.name, a.asset_type, a.status, a.city, a.units_rooms,
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
