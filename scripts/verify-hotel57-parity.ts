import { GoogleSheetsReadOnlyClient } from "../src/lib/adapters/read-only/google-sheets-client";
import { GoogleSheetsDevelopmentWorkPackageReader } from "../src/lib/adapters/read-only/google-sheets-development-reader";
import { mapDevelopmentSheetRow } from "../src/lib/adapters/read-only/mappers";
import { rowsToRecords } from "../src/lib/adapters/read-only/row-utils";
import type { DevelopmentSheetRow } from "../src/lib/adapters/read-only/sheet-row-types";
import { SOURCE_CONTRACTS } from "../src/lib/adapters/read-only/source-contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function comparable(item: ReturnType<typeof mapDevelopmentSheetRow>) {
  return {
    sourceId: item.sourceId,
    phase: item.phase,
    title: item.title,
    action: item.action,
    owner: item.owner ?? "",
    start: item.start ?? "",
    end: item.end ?? "",
    durationDays: item.durationDays ?? 0,
    status: item.status,
    priority: item.priority,
    dependency: item.dependency ?? "",
    completionEvidence: item.completionEvidence ?? "",
    nextPackage: item.nextPackage ?? "",
    calendar: item.calendar,
    planOffsetDays: item.planOffsetDays ?? 0,
  };
}

async function main() {
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  assert(accessToken, "Set GOOGLE_SHEETS_ACCESS_TOKEN to a short-lived token with spreadsheets.readonly scope.");

  const client = new GoogleSheetsReadOnlyClient(async () => accessToken);
  const contract = SOURCE_CONTRACTS.development;
  const tab = "004_Hotel_57";
  const rawValues = await client.getRange(contract.spreadsheetId, tab, contract.readRange);
  const sourceRows = rowsToRecords<DevelopmentSheetRow>(rawValues, contract.headerRow)
    .filter((row) => Boolean(row.ID?.trim()));
  const reader = new GoogleSheetsDevelopmentWorkPackageReader(client);
  const livePackages = await reader.listWorkPackages("PRJ-0001");

  assert(livePackages.length === sourceRows.length, `Hotel 57 count mismatch: reader=${livePackages.length}, source=${sourceRows.length}`);

  const sourceById = new Map(sourceRows.map((row) => [row.ID!.trim(), comparable(mapDevelopmentSheetRow(row))]));
  const mismatches: string[] = [];
  for (const item of livePackages) {
    const expected = sourceById.get(item.sourceId);
    if (!expected) {
      mismatches.push(`${item.sourceId}: missing in raw source`);
      continue;
    }
    const actual = comparable(item);
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (actual[key] !== expected[key]) {
        mismatches.push(`${item.sourceId}.${key}: ${JSON.stringify(actual[key])} != ${JSON.stringify(expected[key])}`);
      }
    }
  }

  assert(mismatches.length === 0, `Hotel 57 parity failed:\n${mismatches.slice(0, 50).join("\n")}`);
  console.log(`HOTEL57_PARITY_OK count=${livePackages.length}`);
}

void main();
