import { mapAssetSheetRow, mapDevelopmentSheetRow, mapTaskSheetRow } from "../src/lib/adapters/read-only/mappers";
import { SOURCE_CONTRACTS } from "../src/lib/adapters/read-only/source-contracts";
import type { AssetSheetRow, DevelopmentSheetRow, TaskSheetRow } from "../src/lib/adapters/read-only/sheet-row-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const taskRow: TaskSheetRow = {
  ID: "TSK-0029",
  Task: "Wohnbau Coburg - Steinweg 57 renovation status",
  "Property / Project": "Steinweg 57",
  Status: "Waiting",
  "Waiting for": "Okossy / Yoram",
  "Waiting since": "31.07.2026",
  Priority: "High",
  Owner: "Max Meisner",
  Deadline: "31.07.2026",
  "Next step": "Await response from Wohnbau",
  "Latest progress": "Waiting for Construction time table",
  Flag: "Deadline overdue",
};
const mappedTask = mapTaskSheetRow(taskRow, new Date("2026-08-07T12:00:00Z"));
assert(mappedTask.id === "TSK-0029", "Task ID mapping failed");
assert(mappedTask.status === "Waiting", "Task status mapping failed");
assert(mappedTask.waitingDays === 7, `Waiting-days mapping failed: ${mappedTask.waitingDays}`);
assert(mappedTask.flag === "overdue", "Task flag mapping failed");

const assetRow: AssetSheetRow = {
  "Asset ID": "A004",
  "Object Name": "Hotel 57",
  "Asset Type": "Hotel",
  Status: "Under examination",
  City: "Coburg",
  "Units / Rooms": "17",
};
const mappedAsset = mapAssetSheetRow(assetRow, { openTasks: 3, projects: 1 });
assert(mappedAsset.id === "A004" && mappedAsset.units === 17, "Asset mapping failed");
assert(mappedAsset.openTasks === 3 && mappedAsset.projects === 1, "Asset join counts failed");

const workPackageRow: DevelopmentSheetRow = {
  ID: "7",
  Phase: "01 Bestand & Untersuchungen",
  Arbeitspaket: "3D-Aufmaß des Bestands",
  "Was genau jetzt zu tun ist": "Bestand per Laserscan aufmessen.",
  Verantwortlich: "Architekt Okossy",
  Start: "14.07.2026",
  Ende: "11.08.2026",
  "Dauer (KT)": "28",
  Status: "In Bearbeitung",
  "Priorität": "High",
  "Kalender?": "Ja",
  "Planoffset (Tage)": "2",
};
const mappedPackage = mapDevelopmentSheetRow(workPackageRow);
assert(mappedPackage.sourceId === "7" && mappedPackage.durationDays === 28, "Development mapping failed");
assert(mappedPackage.calendar === true && mappedPackage.planOffsetDays === 2, "Development flags failed");

for (const contract of Object.values(SOURCE_CONTRACTS)) {
  assert(contract.access === "read-only", `Source ${contract.name} is not marked read-only`);
}

console.log("READ_ONLY_ADAPTER_VERIFICATION_OK");
