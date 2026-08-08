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

type Hotel57SummaryRow = {
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

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
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

    const hotel57Rows = await sql`
      SELECT
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
      WHERE p.id = 'PRJ-0001'
    ` as Hotel57SummaryRow[];

    const migrationRows = await sql`
      SELECT migration_key, status, expected_count, imported_count
      FROM migration_runs
      WHERE migration_key IN (
        'legacy-asset-import-2026-08-07',
        'legacy-development-hotel57-import-2026-08-07'
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

    const hotel57 = hotel57Rows[0] ? {
      projectCount: Number(hotel57Rows[0].project_count),
      assetId: hotel57Rows[0].asset_id,
      packages: Number(hotel57Rows[0].package_count),
      distinctPackages: Number(hotel57Rows[0].distinct_packages),
      minOrder: hotel57Rows[0].min_order,
      maxOrder: hotel57Rows[0].max_order,
      done: Number(hotel57Rows[0].done),
      inProgress: Number(hotel57Rows[0].in_progress),
      notStarted: Number(hotel57Rows[0].not_started),
    } : null;

    const migrations = Object.fromEntries(migrationRows.map((row) => [row.migration_key, {
      status: row.status,
      expectedCount: Number(row.expected_count),
      importedCount: Number(row.imported_count),
    }]));

    const assetMigration = migrations["legacy-asset-import-2026-08-07"];
    const hotel57Migration = migrations["legacy-development-hotel57-import-2026-08-07"];

    const ok = Boolean(
      task?.total === 75 &&
      task.distinctIds === 75 &&
      assets?.total === 19 &&
      assets.distinctIds === 19 &&
      assets.active === 9 &&
      assets.underExamination === 8 &&
      assets.sold === 2 &&
      hotel57?.projectCount === 1 &&
      hotel57.assetId === "A004" &&
      hotel57.packages === 72 &&
      hotel57.distinctPackages === 72 &&
      hotel57.minOrder === 1 &&
      hotel57.maxOrder === 72 &&
      hotel57.done === 4 &&
      hotel57.inProgress === 6 &&
      hotel57.notStarted === 62 &&
      assetMigration?.status === "completed" &&
      assetMigration.expectedCount === 19 &&
      assetMigration.importedCount === 19 &&
      hotel57Migration?.status === "completed" &&
      hotel57Migration.expectedCount === 72 &&
      hotel57Migration.importedCount === 72
    );

    return json({
      ok,
      authenticated: true,
      databaseConfigured: true,
      assetDatabaseApproved: true,
      developmentDatabaseApproved: true,
      taskBaseline: task,
      assets,
      hotel57,
      migrations,
    }, ok ? 200 : 409);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "WORKSPACE_DOMAIN_NOT_ALLOWED" ? 403 : 500;
    return json({ ok: false, error: code }, status);
  }
}
