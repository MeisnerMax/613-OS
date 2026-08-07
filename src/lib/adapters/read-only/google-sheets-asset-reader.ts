import type { Asset } from "../../domain";
import type { AssetReader } from "./contracts";
import { GoogleSheetsReadOnlyClient } from "./google-sheets-client";
import { mapAssetSheetRow } from "./mappers";
import { rowsToRecords } from "./row-utils";
import type { AssetSheetRow } from "./sheet-row-types";
import { SOURCE_CONTRACTS } from "./source-contracts";

export class GoogleSheetsAssetReader implements AssetReader {
  constructor(private readonly client: GoogleSheetsReadOnlyClient) {}

  async listAssets(): Promise<ReadonlyArray<Asset>> {
    const contract = SOURCE_CONTRACTS.assets;
    const values = await this.client.getRange(
      contract.spreadsheetId,
      contract.tab,
      contract.readRange,
    );
    const rows = rowsToRecords<AssetSheetRow>(values, contract.headerRow);
    return rows
      .filter((row) => Boolean(row["Asset ID"]?.trim()))
      .map((row) => mapAssetSheetRow(row));
  }

  async getAsset(id: string): Promise<Asset | null> {
    const assets = await this.listAssets();
    return assets.find((asset) => asset.id === id) ?? null;
  }
}
