import { NextResponse } from "next/server";
import { require613WorkspaceSession, requireTaskDatabaseWritesEnabled } from "@/lib/db/authz";
import { taskDatabase } from "@/lib/db/client";
import { PostgresTaskStore } from "@/lib/db/task-store";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  let testId: string | null = null;
  let actorEmail: string | null = null;
  let startedAt: string | null = null;

  try {
    const session = await require613WorkspaceSession();
    requireTaskDatabaseWritesEnabled();
    if (!session.email) throw new Error("SESSION_EMAIL_REQUIRED");
    const email = session.email;
    actorEmail = email;
    startedAt = new Date().toISOString();

    const sql = taskDatabase();
    const baselineRows = await sql`SELECT COUNT(*)::int AS count FROM tasks WHERE deleted_at IS NULL` as Array<{ count: number | string }>;
    const baselineCount = Number(baselineRows[0]?.count ?? 0);

    if (baselineCount !== 75) {
      return json({
        ok: false,
        authenticated: true,
        writesEnabled: true,
        error: "WRITE_PROBE_BASELINE_NOT_75",
        baselineCount,
      }, 409);
    }

    const nonce = `${Date.now()}`;
    const marker = `613 OS write verification ${nonce}`;
    const updateBody = `Temporary write-path verification ${nonce}`;
    const store = new PostgresTaskStore();

    const created = await store.createTask({
      title: marker,
      asset: "System Verification",
      category: "System",
      status: "Open",
      priority: "Low",
      owner: email,
      description: "Temporary task. Automatically removed after verification.",
    }, { email });

    if (!created) throw new Error("WRITE_PROBE_CREATE_FAILED");
    testId = created.id;

    const updated = await store.updateTask(testId, { description: marker }, { email });
    if (!updated || updated.description !== marker) throw new Error("WRITE_PROBE_UPDATE_FAILED");

    const withUpdate = await store.addUpdate(testId, updateBody, { email });
    if (!withUpdate || !withUpdate.updates.includes(updateBody)) throw new Error("WRITE_PROBE_COMMENT_FAILED");

    const auditRows = await sql.query(
      `SELECT action, COUNT(*)::int AS count
       FROM activity_events
       WHERE entity_id = $1 AND actor_email = $2 AND created_at >= $3::timestamptz
       GROUP BY action`,
      [testId, email, startedAt],
    ) as Array<{ action: string; count: number | string }>;

    const auditCounts = new Map(auditRows.map((row) => [row.action, Number(row.count)]));
    const auditOk = (auditCounts.get("task.created") ?? 0) >= 1
      && (auditCounts.get("task.updated") ?? 0) >= 1
      && (auditCounts.get("task.update_added") ?? 0) >= 1;

    if (!auditOk) throw new Error("WRITE_PROBE_AUDIT_FAILED");

    const updateRows = await sql.query(
      "SELECT COUNT(*)::int AS count FROM task_updates WHERE task_id = $1 AND body = $2",
      [testId, updateBody],
    ) as Array<{ count: number | string }>;
    const updatePersisted = Number(updateRows[0]?.count ?? 0) === 1;
    if (!updatePersisted) throw new Error("WRITE_PROBE_UPDATE_PERSISTENCE_FAILED");

    await sql`DELETE FROM tasks WHERE id=${testId} AND source_bucket='WEBAPP'`;
    await sql.query(
      "DELETE FROM activity_events WHERE entity_id = $1 AND actor_email = $2 AND created_at >= $3::timestamptz",
      [testId, email, startedAt],
    );

    const finalRows = await sql`SELECT COUNT(*)::int AS count FROM tasks WHERE deleted_at IS NULL` as Array<{ count: number | string }>;
    const finalCount = Number(finalRows[0]?.count ?? 0);
    const residueRows = await sql.query(
      "SELECT COUNT(*)::int AS count FROM tasks WHERE id = $1",
      [testId],
    ) as Array<{ count: number | string }>;
    const residueCount = Number(residueRows[0]?.count ?? 0);

    const ok = finalCount === baselineCount && residueCount === 0;
    return json({
      ok,
      authenticated: true,
      writesEnabled: true,
      testTaskId: testId,
      checks: {
        create: true,
        update: true,
        taskUpdate: true,
        auditTrail: true,
        cleanup: ok,
      },
      baselineCount,
      finalCount,
    }, ok ? 200 : 500);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (testId && actorEmail) {
      try {
        const sql = taskDatabase();
        await sql`DELETE FROM tasks WHERE id=${testId} AND source_bucket='WEBAPP'`;
        if (startedAt) {
          await sql.query(
            "DELETE FROM activity_events WHERE entity_id = $1 AND actor_email = $2 AND created_at >= $3::timestamptz",
            [testId, actorEmail, startedAt],
          );
        }
      } catch {
        return json({
          ok: false,
          error: code,
          cleanup: false,
          testTaskId: testId,
        }, 500);
      }
    }

    const status = code === "AUTH_REQUIRED" || code === "SESSION_EMAIL_REQUIRED"
      ? 401
      : code === "WORKSPACE_DOMAIN_NOT_ALLOWED"
        ? 403
        : code === "TASK_DATABASE_WRITES_DISABLED"
          ? 503
          : 500;

    return json({
      ok: false,
      error: code,
      cleanup: true,
      testTaskId: testId,
    }, status);
  }
}
