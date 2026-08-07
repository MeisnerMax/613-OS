import { NextResponse } from "next/server";
import { require613WorkspaceSession, taskDatabaseWritesEnabled } from "@/lib/db/authz";
import { isTaskDatabaseConfigured, taskDatabase } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type SummaryRow = {
  total: number | string;
  distinct_ids: number | string;
  min_id: string | null;
  max_id: string | null;
  data_count: number | string;
  archive_count: number | string;
};

type MigrationRow = {
  status: string;
  expected_count: number | string;
  imported_count: number | string;
};

export async function GET() {
  try {
    await require613WorkspaceSession();

    const databaseApproved = process.env.OPS_TASK_DB_APPROVED === "true";
    if (!isTaskDatabaseConfigured() || !databaseApproved) {
      return NextResponse.json({
        ok: false,
        authenticated: true,
        databaseConfigured: isTaskDatabaseConfigured(),
        databaseApproved,
        writesEnabled: taskDatabaseWritesEnabled(),
        error: "Task database runtime is not fully enabled for verification.",
      }, { status: 503 });
    }

    const sql = taskDatabase();
    const summaryRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT id)::int AS distinct_ids,
        MIN(id) AS min_id,
        MAX(id) AS max_id,
        COUNT(*) FILTER (WHERE source_bucket = 'DATA')::int AS data_count,
        COUNT(*) FILTER (WHERE source_bucket = 'ARCHIVE')::int AS archive_count
      FROM tasks
      WHERE deleted_at IS NULL
    ` as SummaryRow[];

    const migrationRows = await sql`
      SELECT status, expected_count, imported_count
      FROM migration_runs
      WHERE migration_key = 'task-sheet-to-postgres-2026-08-07'
      LIMIT 1
    ` as MigrationRow[];

    const row = summaryRows[0];
    const migration = migrationRows[0];
    const summary = row ? {
      total: Number(row.total),
      distinctIds: Number(row.distinct_ids),
      minId: row.min_id,
      maxId: row.max_id,
      dataCount: Number(row.data_count),
      archiveCount: Number(row.archive_count),
    } : null;
    const migrationSummary = migration ? {
      status: migration.status,
      expectedCount: Number(migration.expected_count),
      importedCount: Number(migration.imported_count),
    } : null;

    const ok = Boolean(
      summary &&
      summary.total === 75 &&
      summary.distinctIds === 75 &&
      summary.minId === "TSK-0001" &&
      summary.maxId === "TSK-0075" &&
      summary.dataCount === 44 &&
      summary.archiveCount === 31 &&
      migrationSummary?.status === "completed" &&
      migrationSummary.expectedCount === 75 &&
      migrationSummary.importedCount === 75
    );

    return NextResponse.json({
      ok,
      authenticated: true,
      databaseConfigured: true,
      databaseApproved: true,
      writesEnabled: taskDatabaseWritesEnabled(),
      summary,
      migration: migrationSummary,
    }, { status: ok ? 200 : 409 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "WORKSPACE_DOMAIN_NOT_ALLOWED" ? 403 : 500;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
