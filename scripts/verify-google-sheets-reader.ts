import { GoogleSheetsReadOnlyClient, GOOGLE_SHEETS_READONLY_SCOPE } from "../src/lib/adapters/read-only/google-sheets-client";
import { GoogleSheetsTaskReader } from "../src/lib/adapters/read-only/google-sheets-task-reader";
import { normalizeSheetHeader, rowsToRecords } from "../src/lib/adapters/read-only/row-utils";
import type { DevelopmentSheetRow } from "../src/lib/adapters/read-only/sheet-row-types";
import { mapDevelopmentSheetRow } from "../src/lib/adapters/read-only/mappers";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const liveShapeRows = [
  ["ID", "Task", "Property / Project", "Category", "Status", "Waiting for", "Waiting since", "Priority", "Owner", "Support", "Info", "Deadline", "Next step", "Next step by", "Latest progress", "Last activity", "Source", "Created", "Flag", "Source email", "Documents", "Drive folder"],
  ["TSK-0029", "Wohnbau Coburg - Steinweg 57 renovation status", "Steinweg 57", "Legal & Authorities", "Waiting", "Okossy / Yoram", "31.07.2026", "High", "Max Meisner", "", "Joseph", "31.07.2026", "Await response from Wohnbau", "", "Waiting for Construction time table", "07.08.2026", "", "31.07.2026", "Deadline overdue"],
  ["TSK-0075", "Goldbergstraße lock change", "613 Group (Company)", "Administration & Finance", "Open", "", "", "High", "Max Meisner", "Ryszard Balcar", "Joseph", "11.08.2026", "Wait for Michael", "", "Task created: Change the Locks", "07.08.2026", "New Task Form", "07.08.2026", "no date"],
];

let observedMethod = "";
let observedUrl = "";
const fakeFetch: typeof fetch = async (input, init) => {
  observedMethod = init?.method ?? "GET";
  observedUrl = String(input);
  return new Response(JSON.stringify({ range: "DATA!A1:V3", majorDimension: "ROWS", values: liveShapeRows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

async function main() {
  assert(GOOGLE_SHEETS_READONLY_SCOPE.endsWith("spreadsheets.readonly"), "OAuth scope is not read-only");
  const client = new GoogleSheetsReadOnlyClient(async () => "test-token", fakeFetch);
  const reader = new GoogleSheetsTaskReader(client, () => new Date("2026-08-07T12:00:00Z"));
  const tasks = await reader.listTasks();
  assert(observedMethod === "GET", `Expected GET, received ${observedMethod}`);
  assert(observedUrl.includes("sheets.googleapis.com/v4/spreadsheets/"), "Unexpected Sheets API URL");
  assert(tasks.length === 2, `Expected 2 tasks, got ${tasks.length}`);
  assert(tasks[0].id === "TSK-0029" && tasks[0].waitingDays === 7, "Live-shape task mapping failed");
  assert(tasks[1].id === "TSK-0075" && tasks[1].status === "Open", "Second task mapping failed");

  assert(normalizeSheetHeader("Dauer\n(KT)") === "Dauer (KT)", "Header newline normalization failed");
  const devRows = rowsToRecords<DevelopmentSheetRow>([
    ["Project header"], [], [], [], [], [], [], [],
    ["ID", "Phase", "Arbeitspaket", "Was genau jetzt zu tun ist", "Verantwortlich", "Start", "Ende", "Dauer\n(KT)", "Status", "Priorität", "Vorher muss vorliegen", "Fertig, wenn", "Direkt danach", "Kalender?", "Planoffset\n(Tage)"],
    ["7", "01 Bestand & Untersuchungen", "3D-Aufmaß des Bestands", "Bestand aufmessen", "Architekt Okossy", "14.07.2026", "11.08.2026", "28", "In Bearbeitung", "Hoch", "Gebäude zugänglich", "Punktwolke und Bestandspläne", "Fotodokumentation und Raumbuch", "Ja", "2"],
  ], 9);
  const workPackage = mapDevelopmentSheetRow(devRows[0]);
  assert(workPackage.priority === "High", `German priority mapping failed: ${workPackage.priority}`);
  assert(workPackage.durationDays === 28 && workPackage.planOffsetDays === 2, "Development numeric mapping failed");

  console.log("GOOGLE_SHEETS_READONLY_READER_VERIFICATION_OK");
}

void main();
