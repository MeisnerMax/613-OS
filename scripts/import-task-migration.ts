import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type MigrationTask = {
  id: string; title: string; propertyProject?: string | null; category?: string | null; status: string;
  waitingFor?: string | null; waitingSince?: string | null; priority: string; owner?: string | null;
  support?: string | null; info?: string | null; deadline?: string | null; nextStep?: string | null;
  nextStepBy?: string | null; latestProgress?: string | null; lastActivity?: string | null; source?: string | null;
  sourceCreated?: string | null; flagOriginal?: string | null; sourceEmail?: string | null; documents?: string | null;
  driveFolder?: string | null; description?: string | null; sourceBucket: "DATA" | "ARCHIVE";
};

const snapshotPath = process.env.TASK_MIGRATION_SNAPSHOT?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
assert(snapshotPath, "TASK_MIGRATION_SNAPSHOT is required.");
assert(databaseUrl, "DATABASE_URL is required.");
assert(process.env.TASK_MIGRATION_APPLY === "YES", "Set TASK_MIGRATION_APPLY=YES only after the 75-task snapshot is verified.");

const raw = readFileSync(snapshotPath, "utf8");
const tasks = JSON.parse(raw) as MigrationTask[];
assert(Array.isArray(tasks) && tasks.length === 75, "Expected exactly 75 tasks.");
const ids = new Set(tasks.map((task) => task.id));
assert(ids.size === 75, "Duplicate task IDs detected.");
for (let index = 1; index <= 75; index += 1) assert(ids.has(`TSK-${String(index).padStart(4, "0")}`), `Missing TSK-${String(index).padStart(4, "0")}`);
assert(tasks.filter((task) => task.sourceBucket === "DATA").length === 44, "DATA count mismatch.");
assert(tasks.filter((task) => task.sourceBucket === "ARCHIVE").length === 31, "ARCHIVE count mismatch.");

const checksum = createHash("sha256").update(raw).digest("hex");
const sql = neon(databaseUrl);
const existing = await sql`SELECT count(*)::integer AS count FROM tasks` as Array<{ count: number }>;
assert(existing[0]?.count === 0, `Refusing import: tasks table already contains ${existing[0]?.count ?? "unknown"} rows.`);

const result = await sql.query(`
WITH source AS (SELECT value AS item FROM jsonb_array_elements($1::jsonb)),
inserted AS (
  INSERT INTO tasks (
    id,title,property_project,category,status,waiting_for,waiting_since,priority,owner,support,info,deadline,next_step,next_step_by,
    latest_progress,last_activity,source,source_created,flag_original,source_email,documents,drive_folder,description,source_bucket,legacy_imported_at
  )
  SELECT
    item->>'id', item->>'title', COALESCE(item->>'propertyProject',''), item->>'category', item->>'status', item->>'waitingFor',
    NULLIF(item->>'waitingSince','')::date, item->>'priority', item->>'owner', item->>'support', item->>'info', NULLIF(item->>'deadline','')::date,
    item->>'nextStep', NULLIF(item->>'nextStepBy','')::date, item->>'latestProgress', NULLIF(item->>'lastActivity','')::date, item->>'source',
    NULLIF(item->>'sourceCreated','')::date, item->>'flagOriginal', item->>'sourceEmail', item->>'documents', item->>'driveFolder',
    COALESCE(item->>'description',''), item->>'sourceBucket', now()
  FROM source RETURNING id
), migration AS (
  INSERT INTO migration_runs (migration_key,source_name,expected_count,imported_count,status,checksum,completed_at)
  SELECT 'legacy-task-import-v1','Task_Overview_613Group DATA+ARCHIVE',75,count(*),'complete',$2,now() FROM inserted
  RETURNING imported_count
)
SELECT imported_count FROM migration;
`, [raw, checksum]) as Array<{ imported_count: number }>;
assert(result[0]?.imported_count === 75, `Import returned ${result[0]?.imported_count ?? "no"} rows.`);
console.log(`TASK_MIGRATION_IMPORT_OK count=75 checksum=${checksum.slice(0, 12)}…`);
