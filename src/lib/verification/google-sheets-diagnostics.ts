import { SOURCE_CONTRACTS } from "@/lib/adapters/read-only/source-contracts";

export type GoogleSheetsDiagnosticResult = {
  ok: boolean;
  httpStatus: number;
  googleStatus?: string;
  reason?: string;
  message?: string;
};

type GoogleErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

export async function diagnoseGoogleSheetsReadOnly(accessToken: string): Promise<GoogleSheetsDiagnosticResult> {
  const contract = SOURCE_CONTRACTS.tasks;
  const a1Range = `${quoteSheetName(contract.tab)}!A1:A1`;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(contract.spreadsheetId)}/values/${encodeURIComponent(a1Range)}`,
  );
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.ok) {
    return { ok: true, httpStatus: response.status };
  }

  let payload: GoogleErrorPayload = {};
  try {
    payload = await response.json() as GoogleErrorPayload;
  } catch {
    // Keep the diagnostic intentionally minimal when Google returns a non-JSON body.
  }

  const googleError = payload.error;
  const firstError = googleError?.errors?.[0];
  return {
    ok: false,
    httpStatus: response.status,
    googleStatus: googleError?.status,
    reason: firstError?.reason,
    message: googleError?.message ?? firstError?.message,
  };
}
