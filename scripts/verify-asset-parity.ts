import { GoogleSheetsAssetReader } from "../src/lib/adapters/read-only/google-sheets-asset-reader";
import { GoogleSheetsReadOnlyClient } from "../src/lib/adapters/read-only/google-sheets-client";
import { mapAssetSheetRow } from "../src/lib/adapters/read-only/mappers";
import { rowsToRecords } from "../src/lib/adapters/read-only/row-utils";
import type { AssetSheetRow } from "../src/lib/adapters/read-only/sheet-row-types";
import { SOURCE_CONTRACTS } from "../src/lib/adapters/read-only/source-contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function comparable(asset: ReturnType<typeof mapAssetSheetRow>) {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    status: asset.status,
    city: asset.city,
    units: asset.units,
  };
}

async function main() {
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  assert(accessToken, "Set GOOGLE_SHEETS_ACCESS_TOKEN to a short-lived token with spreadsheets.readonly scope.");

  const client = new GoogleSheetsReadOnlyClient(async () => accessToken);
  const contract = SOURCE_CONTRACTS.assets;
  const rawValues = await client.getRange(contract.spreadsheetId, contract.tab, contract.readRange);
  const sourceRows = rowsToRecords<AssetSheetRow>(rawValues, contract.headerRow)
    .filter((row) => Boolean(row["Asset ID"]?.trim()));
  const reader = new GoogleSheetsAssetReader(client);
  const liveAssets = await reader.listAssets();

  assert(liveAssets.length === sourceRows.length, `Asset count mismatch: reader=${liveAssets.length}, source=${sourceRows.length}`);

  const sourceById = new Map(sourceRows.map((row) => [row["Asset ID"]!.trim(), comparable(mapAssetSheetRow(row))]));
  const mismatches: string[] = [];
  for (const asset of liveAssets) {
    const expected = sourceById.get(asset.id);
    if (!expected) {
      mismatches.push(`${asset.id}: missing in raw source`);
      continue;
    }
    const actual = comparable(asset);
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (actual[key] !== expected[key]) {
        mismatches.push(`${asset.id}.${key}: ${JSON.stringify(actual[key])} != ${JSON.stringify(expected[key])}`);
      }
    }
  }

  assert(mismatches.length === 0, `Asset parity failed:\n${mismatches.slice(0, 50).join("\n")}`);
  console.log(`ASSET_PARITY_OK count=${liveAssets.length}`);
}

void main();
