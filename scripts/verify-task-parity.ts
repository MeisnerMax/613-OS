import { GoogleSheetsReadOnlyClient } from "../src/lib/adapters/read-only/google-sheets-client";
import { GoogleSheetsTaskReader } from "../src/lib/adapters/read-only/google-sheets-task-reader";
import { mapTaskSheetRow } from "../src/lib/adapters/read-only/mappers";
import { rowsToRecords } from "../src/lib/adapters/read-only/row-utils";
import type { TaskSheetRow } from "../src/lib/adapters/read-only/sheet-row-types";
import { SOURCE_CONTRACTS } from "../src/lib/adapters/read-only/source-contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function comparable(task: ReturnType<typeof mapTaskSheetRow>) {
  return {
    id: task.id,
    title: task.title,
    asset: task.asset,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    waitingFor: task.waitingFor ?? "",
    deadline: task.deadline ?? "",
    nextStep: task.nextStep ?? "",
    flag: task.flag ?? "",
  };
}

async function main() {
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  assert(accessToken, "Set GOOGLE_SHEETS_ACCESS_TOKEN to a short-lived token with spreadsheets.readonly scope.");

  const client = new GoogleSheetsReadOnlyClient(async () => accessToken);
  const contract = SOURCE_CONTRACTS.tasks;
  const rawValues = await client.getRange(contract.spreadsheetId, contract.tab, contract.readRange);
  const sourceRows = rowsToRecords<TaskSheetRow>(rawValues, contract.headerRow).filter((row) => Boolean(row.ID?.trim()));
  const reader = new GoogleSheetsTaskReader(client);
  const liveTasks = await reader.listTasks();

  assert(liveTasks.length === sourceRows.length, `Task count mismatch: reader=${liveTasks.length}, source=${sourceRows.length}`);

  const sourceById = new Map(sourceRows.map((row) => [row.ID!.trim(), comparable(mapTaskSheetRow(row))]));
  const mismatches: string[] = [];
  for (const task of liveTasks) {
    const expected = sourceById.get(task.id);
    if (!expected) {
      mismatches.push(`${task.id}: missing in raw source`);
      continue;
    }
    const actual = comparable(task);
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (actual[key] !== expected[key]) mismatches.push(`${task.id}.${key}: ${JSON.stringify(actual[key])} != ${JSON.stringify(expected[key])}`);
    }
  }

  assert(mismatches.length === 0, `Task parity failed:\n${mismatches.slice(0, 50).join("\n")}`);
  console.log(`TASK_PARITY_OK count=${liveTasks.length}`);
}

void main();
