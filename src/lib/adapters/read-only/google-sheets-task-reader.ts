import type { Task } from "../../domain";
import type { TaskReader } from "./contracts";
import { GoogleSheetsReadOnlyClient } from "./google-sheets-client";
import { mapTaskSheetRow } from "./mappers";
import { rowsToRecords } from "./row-utils";
import type { TaskSheetRow } from "./sheet-row-types";
import { SOURCE_CONTRACTS } from "./source-contracts";

export class GoogleSheetsTaskReader implements TaskReader {
  constructor(
    private readonly client: GoogleSheetsReadOnlyClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listTasks(): Promise<ReadonlyArray<Task>> {
    const contract = SOURCE_CONTRACTS.tasks;
    const values = await this.client.getRange(
      contract.spreadsheetId,
      contract.tab,
      contract.readRange,
    );
    const rows = rowsToRecords<TaskSheetRow>(values, contract.headerRow);
    return rows
      .filter((row) => Boolean(row.ID?.trim()))
      .map((row) => mapTaskSheetRow(row, this.now()));
  }

  async getTask(id: string): Promise<Task | null> {
    const tasks = await this.listTasks();
    return tasks.find((task) => task.id === id) ?? null;
  }
}
