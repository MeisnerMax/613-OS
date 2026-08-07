export const SOURCE_CONTRACTS = {
  tasks: {
    name: "Task_Overview_613Group",
    spreadsheetId: "1XZltYAP4XqOABB3fN1BgK4M19VfikUFh4dAZzznc3g8",
    tab: "DATA",
    headerRow: 1,
    readRange: "A1:V1000",
    access: "read-only",
    headers: [
      "ID", "Task", "Property / Project", "Category", "Status", "Waiting for",
      "Waiting since", "Priority", "Owner", "Support", "Info", "Deadline",
      "Next step", "Next step by", "Latest progress", "Last activity", "Source",
      "Created", "Flag", "Source email", "Documents", "Drive folder",
    ],
  },
  assets: {
    name: "Asset_Overview_v4",
    spreadsheetId: "1nWPgdwqmh326gbKf28q6YNR_eGvtAtjsvBLmsAwvqhQ",
    tab: "Asset_Master",
    headerRow: 3,
    readRange: "A1:T1000",
    access: "read-only",
    headers: [
      "Asset ID", "Object Name", "Asset Type", "Status", "Street", "ZIP Code",
      "City", "Year Built", "Living Area sqm", "Total Area sqm", "Units / Rooms",
      "Side Costs / Y", "Asset Price", "Property Price", "Renovation Cost until 2025",
      "Market Value 2021", "Market Value 2026", "Source Row", "", "Sheet (helper)",
    ],
  },
  development: {
    name: "Development_Projects_DE",
    spreadsheetId: "1l5XslvGB6-JvXbq9ZkNU_U6joVtgDMw7dkqFQAVaWD4",
    tabs: ["004_Hotel_57", "008_AdamRiese", "012_OldPost", "005_Hahnmühle", "010_Square"],
    headerRow: 9,
    readRange: "A1:O1000",
    access: "read-only",
    headers: [
      "ID", "Phase", "Arbeitspaket", "Was genau jetzt zu tun ist", "Verantwortlich",
      "Start", "Ende", "Dauer (KT)", "Status", "Priorität", "Vorher muss vorliegen",
      "Fertig, wenn", "Direkt danach", "Kalender?", "Planoffset (Tage)",
    ],
  },
} as const;

export type SourceContractName = keyof typeof SOURCE_CONTRACTS;
