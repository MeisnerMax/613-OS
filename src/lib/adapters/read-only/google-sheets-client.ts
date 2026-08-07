export const GOOGLE_SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

type AccessTokenProvider = () => Promise<string>;
type FetchLike = typeof fetch;

type GoogleValueRange = {
  range?: string;
  majorDimension?: "ROWS" | "COLUMNS";
  values?: unknown[][];
};

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

export class GoogleSheetsReadOnlyClient {
  constructor(
    private readonly getAccessToken: AccessTokenProvider,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async getRange(spreadsheetId: string, sheetName: string, range: string): Promise<unknown[][]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Google Sheets read-only access token is missing.");

    const a1Range = `${quoteSheetName(sheetName)}!${range}`;
    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(a1Range)}`,
    );
    url.searchParams.set("majorDimension", "ROWS");
    url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
    url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");

    const response = await this.fetcher(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Google Sheets read failed with HTTP ${response.status}.`);
    }

    const payload = await response.json() as GoogleValueRange;
    return Array.isArray(payload.values) ? payload.values : [];
  }
}
