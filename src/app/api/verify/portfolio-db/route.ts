import { NextResponse } from "next/server";
import { require613WorkspaceSession } from "@/lib/db/authz";
import { isTaskDatabaseConfigured, taskDatabase } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type CountValue = number | string;

type TaskBaselineRow = {
  total: CountValue;
  distinct_ids: CountValue;
};

type AssetSummaryRow = {
  total: CountValue;
  distinct_ids: CountValue;
  active: CountValue;
  under_examination: CountValue;
  sold: CountValue;
};

type DevelopmentTotalsRow = {
  projects: CountValue;
  packages: CountValue;
};

type ProjectSummaryRow = {
  id: string;
  project_count: CountValue;
  asset_id: string | null;
  package_count: CountValue;
  distinct_packages: CountValue;
  min_order: number | null;
  max_order: number | null;
  done: CountValue;
  in_progress: CountValue;
  not_started: CountValue;
};

type MigrationRow = {
  migration_key: string;
  status: string;
  expected_count: CountValue;
  imported_count: CountValue;
};

type ProjectSummary = {
  projectCount: number;
  assetId: string | null;
  packages: number;
  distinctPackages: number;
  minOrder: number | null;
  maxOrder: number | null;
  done: number;
  inProgress: number;
  notStarted: number;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function mapProjectSummary(row: ProjectSummaryRow): ProjectSummary {
  return {
    projectCount: Number(row.project_count),
    assetId: row.asset_id,
    packages: Number(row.package_count),
    distinctPackages: Number(row.distinct_packages),
    minOrder: row.min_order,
    maxOrder: row.max_order,
    done: Number(row.done),
    inProgress: Number(row.in_progress),
    notStarted: Number(row.not_started),
  };
}

export async function GET() {
  try {
    await require613WorkspaceSession();

    const assetDatabaseApproved = process.env.OPS_ASSET_DB_APPROVED === "true";
    const developmentDatabaseApproved = process.env.OPS_DEVELOPMENT_DB_APPROVED === "true";
    const databaseConfigured = isTaskDatabaseConfigured();

    if (!databaseConfigured || !assetDatabaseApproved || !developmentDatabaseApproved) {
      return json({
        ok: false,
        authenticated: true,
        databaseConfigured,
        assetDatabaseApproved,
        developmentDatabaseApproved,
        error: "Portfolio database runtime is not fully enabled for verification.",
      }, 503);
    }

    const sql = taskDatabase();
    const taskRows = await sql`
      SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids
      FROM tasks
      WHERE deleted_at IS NULL
    ` as TaskBaselineRow[];

    const assetRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT id)::int AS distinct_ids,
        COUNT(*) FILTER (WHERE status = 'Active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'Under examination')::int AS under_examination,
        COUNT(*) FILTER (WHERE status = 'Sold')::int AS sold
      FROM assets
    ` as AssetSummaryRow[];

    const developmentRows = await sql`
      SELECT
        (SELECT COUNT(*) FROM development_projects)::int AS projects,
        (SELECT COUNT(*) FROM development_work_packages)::int AS packages
    ` as DevelopmentTotalsRow[];

    const projectRows = await sql`
      SELECT
        p.id,
        COUNT(DISTINCT p.id)::int AS project_count,
        MIN(p.asset_id) AS asset_id,
        COUNT(w.source_id)::int AS package_count,
        COUNT(DISTINCT w.source_id)::int AS distinct_packages,
        MIN(w.source_order)::int AS min_order,
        MAX(w.source_order)::int AS max_order,
        COUNT(*) FILTER (WHERE w.status = 'Erledigt')::int AS done,
        COUNT(*) FILTER (WHERE w.status = 'In Bearbeitung')::int AS in_progress,
        COUNT(*) FILTER (WHERE w.status = 'Nicht begonnen')::int AS not_started
      FROM development_projects p
      LEFT JOIN development_work_packages w ON w.project_id = p.id
      WHERE p.id IN ('PRJ-0001', 'PRJ-0002', 'PRJ-0003', 'PRJ-0004')
      GROUP BY p.id
      ORDER BY p.id
    ` as ProjectSummaryRow[];

    const migrationRows = await sql`
      SELECT migration_key, status, expected_count, imported_count
      FROM migration_runs
      WHERE migration_key IN (
        'legacy-asset-import-2026-08-07',
        'legacy-development-hotel57-import-2026-08-07',
        'legacy-development-hahnmuehle-import-2026-08-08',
        'legacy-development-square-import-2026-08-08',
        'legacy-development-adamriese-import-2026-08-08'
      )
      ORDER BY migration_key
    ` as MigrationRow[];

    const task = taskRows[0] ? {
      total: Number(taskRows[0].total),
      distinctIds: Number(taskRows[0].distinct_ids),
    } : null;

    const assets = assetRows[0] ? {
      total: Number(assetRows[0].total),
      distinctIds: Number(assetRows[0].distinct_ids),
      active: Number(assetRows[0].active),
      underExamination: Number(assetRows[0].under_examination),
      sold: Number(assetRows[0].sold),
    } : null;

    const development = developmentRows[0] ? {
      projects: Number(developmentRows[0].projects),
      packages: Number(developmentRows[0].packages),
    } : null;

    const projectSummaries = new Map(projectRows.map((row) => [row.id, mapProjectSummary(row)]));
    const hotel57 = projectSummaries.get("PRJ-0001") ?? null;
    const hahnmuehle = projectSummaries.get("PRJ-0002") ?? null;
    const square = projectSummaries.get("PRJ-0003") ?? null;
    const adamRiese = projectSummaries.get("PRJ-0004") ?? null;

    const migrations = Object.fromEntries(migrationRows.map((row) => [row.migration_key, {
      status: row.status,
      expectedCount: Number(row.expected_count),
      importedCount: Number(row.imported_count),
    }]));

    const assetMigration = migrations["legacy-asset-import-2026-08-07"];
    const hotel57Migration = migrations["legacy-development-hotel57-import-2026-08-07"];
    const hahnmuehleMigration = migrations["legacy-development-hahnmuehle-import-2026-08-08"];
    const squareMigration = migrations["legacy-development-square-import-2026-08-08"];
    const adamRieseMigration = migrations["legacy-development-adamriese-import-2026-08-08"];

    const ok = Boolean(
      task?.total === 75 &&
      task.distinctIds === 75 &&
      assets?.total === 19 &&
      assets.distinctIds === 19 &&
      assets.active === 9 &&
      assets.underExamination === 8 &&
      assets.sold === 2 &&
      development?.projects === 4 &&
      development.packages === 288 &&
      hotel57?.projectCount === 1 &&
      hotel57.assetId === "A004" &&
      hotel57.packages === 72 &&
      hotel57.distinctPackages === 72 &&
      hotel57.minOrder === 1 &&
      hotel57.maxOrder === 72 &&
      hotel57.done === 4 &&
      hotel57.inProgress === 6 &&
      hotel57.notStarted === 62 &&
      hahnmuehle?.projectCount === 1 &&
      hahnmuehle.assetId === "A005" &&
      hahnmuehle.packages === 72 &&
      hahnmuehle.distinctPackages === 72 &&
      hahnmuehle.minOrder === 1 &&
      hahnmuehle.maxOrder === 72 &&
      hahnmuehle.done === 3 &&
      hahnmuehle.inProgress === 7 &&
      hahnmuehle.notStarted === 62 &&
      square?.projectCount === 1 &&
      square.assetId === "A010" &&
      square.packages === 72 &&
      square.distinctPackages === 72 &&
      square.minOrder === 1 &&
      square.maxOrder === 72 &&
      square.done === 3 &&
      square.inProgress === 5 &&
      square.notStarted === 64 &&
      adamRiese?.projectCount === 1 &&
      adamRiese.assetId === "A008" &&
      adamRiese.packages === 72 &&
      adamRiese.distinctPackages === 72 &&
      adamRiese.minOrder === 1 &&
      adamRiese.maxOrder === 72 &&
      adamRiese.done === 4 &&
      adamRiese.inProgress === 2 &&
      adamRiese.notStarted === 66 &&
      assetMigration?.status === "completed" &&
      assetMigration.expectedCount === 19 &&
      assetMigration.importedCount === 19 &&
      hotel57Migration?.status === "completed" &&
      hotel57Migration.expectedCount === 72 &&
      hotel57Migration.importedCount === 72 &&
      hahnmuehleMigration?.status === "completed" &&
      hahnmuehleMigration.expectedCount === 72 &&
      hahnmuehleMigration.importedCount === 72 &&
      squareMigration?.status === "completed" &&
      squareMigration.expectedCount === 72 &&
      squareMigration.importedCount === 72 &&
      adamRieseMigration?.status === "completed" &&
      adamRieseMigration.expectedCount === 72 &&
      adamRieseMigration.importedCount === 72
    );

    return json({
      ok,
      authenticated: true,
      databaseConfigured: true,
      assetDatabaseApproved: true,
      developmentDatabaseApproved: true,
      taskBaseline: task,
      assets,
      development,
      hotel57,
      hahnmuehle,
      square,
      adamRiese,
      migrations,
    }, ok ? 200 : 409);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "WORKSPACE_DOMAIN_NOT_ALLOWED" ? 403 : 500;
    return json({ ok: false, error: code }, status);
  }
}
