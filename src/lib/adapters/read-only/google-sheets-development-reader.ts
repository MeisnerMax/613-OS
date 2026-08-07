import type { DevelopmentWorkPackage } from "../../domain";
import { GoogleSheetsReadOnlyClient } from "./google-sheets-client";
import { mapDevelopmentSheetRow } from "./mappers";
import { rowsToRecords } from "./row-utils";
import type { DevelopmentSheetRow } from "./sheet-row-types";
import { SOURCE_CONTRACTS } from "./source-contracts";

const PILOT_PROJECT_TABS: Readonly<Record<string, string>> = {
  "PRJ-0001": "004_Hotel_57",
};

export class GoogleSheetsDevelopmentWorkPackageReader {
  constructor(private readonly client: GoogleSheetsReadOnlyClient) {}

  async listWorkPackages(projectId: string): Promise<ReadonlyArray<DevelopmentWorkPackage>> {
    const tab = PILOT_PROJECT_TABS[projectId];
    if (!tab) return [];

    const contract = SOURCE_CONTRACTS.development;
    if (!contract.tabs.includes(tab as (typeof contract.tabs)[number])) {
      throw new Error(`Development tab ${tab} is outside the read-only source contract.`);
    }

    const values = await this.client.getRange(
      contract.spreadsheetId,
      tab,
      contract.readRange,
    );
    const rows = rowsToRecords<DevelopmentSheetRow>(values, contract.headerRow);
    return rows
      .filter((row) => Boolean(row.ID?.trim()))
      .map(mapDevelopmentSheetRow);
  }
}
