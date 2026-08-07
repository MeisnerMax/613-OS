import { GoogleSheetsReadOnlyClient } from "@/lib/adapters/read-only/google-sheets-client";
import { GoogleSheetsTaskReader } from "@/lib/adapters/read-only/google-sheets-task-reader";
import { mapTaskSheetRow } from "@/lib/adapters/read-only/mappers";
import { rowsToRecords } from "@/lib/adapters/read-only/row-utils";
import type { TaskSheetRow } from "@/lib/adapters/read-only/sheet-row-types";
import { SOURCE_CONTRACTS } from "@/lib/adapters/read-only/source-contracts";

export type TaskParityResult = {
  ok: boolean;
  sourceCount: number;
  readerCount: number;
  mismatchCount: number;
  mismatchFields: ReadonlyArray<string>;
};

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

export async function verifyTaskParity(
  client: GoogleSheetsReadOnlyClient,
): Promise<TaskParityResult> {
  const contract = SOURCE_CONTRACTS.tasks;
  const rawValues = await client.getRange(
    contract.spreadsheetId,
    contract.tab,
    contract.readRange,
  );
  const sourceRows = rowsToRecords<TaskSheetRow>(rawValues, contract.headerRow)
    .filter((row) => Boolean(row.ID?.trim()));

  const reader = new GoogleSheetsTaskReader(client);
  const liveTasks = await reader.listTasks();
  const sourceById = new Map(
    sourceRows.map((row) => [row.ID!.trim(), comparable(mapTaskSheetRow(row))]),
  );

  const mismatches: string[] = [];
  if (liveTasks.length !== sourceRows.length) {
    mismatches.push("count");
  }

  for (const task of liveTasks) {
    const expected = sourceById.get(task.id);
    if (!expected) {
      mismatches.push(`${task.id}:missing-source`);
      continue;
    }
    const actual = comparable(task);
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (actual[key] !== expected[key]) {
        mismatches.push(`${task.id}:${String(key)}`);
      }
    }
  }

  return {
    ok: mismatches.length === 0,
    sourceCount: sourceRows.length,
    readerCount: liveTasks.length,
    mismatchCount: mismatches.length,
    mismatchFields: mismatches.slice(0, 20),
  };
}
