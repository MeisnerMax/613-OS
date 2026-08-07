import { GoogleSheetsAssetReader } from "../src/lib/adapters/read-only/google-sheets-asset-reader";
import { GoogleSheetsReadOnlyClient } from "../src/lib/adapters/read-only/google-sheets-client";
import { GoogleSheetsDevelopmentWorkPackageReader } from "../src/lib/adapters/read-only/google-sheets-development-reader";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assetRows = [
  ["Asset Master"],
  [],
  ["Asset ID", "Object Name", "Asset Type", "Status", "Street", "ZIP Code", "City", "Year Built", "Living Area sqm", "Total Area sqm", "Units / Rooms", "Side Costs / Y", "Asset Price", "Property Price", "Renovation Cost until 2025", "Market Value 2021", "Market Value 2026", "Source Row", "", "Sheet (helper)"],
  ["A001", "Allee 7", "Apartment building", "Active", "Allee 7", "96450", "Coburg", "1862", "2.050,84", "5.050,00", "16", "34.260,25 €", "1.300.000,00 €", "", "1.562.992,78 €", "3.200.000,00 €", "9.330.000,00 €", "3", "", "A001 Allee 7"],
  ["A004", "Hotel 57", "Hotel", "Under examination", "Steinweg 57", "96450", "Coburg", "1740", "643,03", "720,00", "17", "2.319,70 €", "222.360,00 €", "", "18.622,17 €", "", "579.000,00 €", "6", "", "A004 Hotel 57"],
];

const hotel57Rows = [
  ["Hotel 57 – Bauprojektplan und Gantt-Steuerung"],
  [], [], [], [], [], [], [],
  ["ID", "Phase", "Arbeitspaket", "Was genau jetzt zu tun ist", "Verantwortlich", "Start", "Ende", "Dauer\n(KT)", "Status", "Priorität", "Vorher muss vorliegen", "Fertig, wenn", "Direkt danach", "Kalender?", "Planoffset\n(Tage)"],
  ["7", "01 Bestand & Untersuchungen", "3D-Aufmaß des Bestands", "Alle Geschosse per Laserscan aufmessen.", "Architekt Okossy", "14.07.2026", "11.08.2026", "28", "In Bearbeitung", "Hoch", "Gebäude zugänglich", "Punktwolke und Bestandspläne", "Fotodokumentation und Raumbuch", "Ja", "2"],
  ["8", "01 Bestand & Untersuchungen", "Fotos und Raumbuch", "Jeden Raum fotografieren.", "Asset Manager Meisner", "07.08.2026", "22.08.2026", "15", "In Bearbeitung", "Hoch", "Bestandsaufmaß", "Raumbuch mit Schadenskartierung", "Denkmalpflegerische Bestandsanalyse", "Ja", "26"],
];

let requestCount = 0;
const methods: string[] = [];
const urls: string[] = [];
const fakeFetch: typeof fetch = async (input, init) => {
  methods.push(init?.method ?? "GET");
  urls.push(String(input));
  const values = requestCount++ === 0 ? assetRows : hotel57Rows;
  return new Response(JSON.stringify({ majorDimension: "ROWS", values }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

async function main() {
  const client = new GoogleSheetsReadOnlyClient(async () => "test-token", fakeFetch);
  const assetReader = new GoogleSheetsAssetReader(client);
  const developmentReader = new GoogleSheetsDevelopmentWorkPackageReader(client);

  const assets = await assetReader.listAssets();
  assert(assets.length === 2, `Expected 2 assets, got ${assets.length}`);
  assert(assets[0].id === "A001" && assets[0].units === 16, "Asset_Master first row mapping failed.");
  assert(assets[1].id === "A004" && assets[1].status === "Under examination", "Hotel 57 asset mapping failed.");
  assert(assets[1].openTasks === 0 && assets[1].projects === 0, "Source-only asset reader must not invent joined counts.");

  const packages = await developmentReader.listWorkPackages("PRJ-0001");
  assert(packages.length === 2, `Expected 2 Hotel 57 work packages, got ${packages.length}`);
  assert(packages[0].sourceId === "7" && packages[0].durationDays === 28, "Hotel 57 duration mapping failed.");
  assert(packages[0].priority === "High" && packages[0].calendar === true, "Hotel 57 priority/calendar mapping failed.");
  assert(packages[1].planOffsetDays === 26, "Hotel 57 plan offset mapping failed.");

  const unknown = await developmentReader.listWorkPackages("PRJ-UNKNOWN");
  assert(unknown.length === 0, "Unknown project IDs must not read an uncontracted development tab.");
  assert(requestCount === 2, `Expected exactly 2 read requests, got ${requestCount}`);
  assert(methods.every((method) => method === "GET"), `Non-GET method detected: ${methods.join(", ")}`);
  assert(urls.every((url) => url.includes("sheets.googleapis.com/v4/spreadsheets/")), "Unexpected Google Sheets endpoint.");

  console.log("GOOGLE_SHEETS_OPERATIONAL_READERS_VERIFICATION_OK");
}

void main();
