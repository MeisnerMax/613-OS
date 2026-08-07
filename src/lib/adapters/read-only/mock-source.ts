import { assets, projects, tasks } from "../../data";
import type { DevelopmentWorkPackage, OperationalOverview } from "../../domain";
import type { ReadOnlyOperationsSource } from "./contracts";

const HOTEL_57_WORK_PACKAGES: DevelopmentWorkPackage[] = [
  {
    sourceId: "7",
    phase: "01 Bestand & Untersuchungen",
    title: "3D-Aufmaß des Bestands",
    action: "Alle Geschosse, Dach, Fassaden, Höhen und Verformungen per Laserscan aufmessen.",
    owner: "Architekt Okossy",
    start: "14.07.2026",
    end: "11.08.2026",
    durationDays: 28,
    status: "In Bearbeitung",
    priority: "High",
    dependency: "Gebäude zugänglich",
    completionEvidence: "Punktwolke und Bestandspläne",
    nextPackage: "Fotodokumentation und Raumbuch",
    calendar: true,
    planOffsetDays: 2,
  },
  {
    sourceId: "8",
    phase: "01 Bestand & Untersuchungen",
    title: "Fotos und Raumbuch",
    action: "Jeden Raum fotografieren und Bauteile, Schäden, historische Ausstattung und Maße erfassen.",
    owner: "Asset Manager Meisner",
    start: "07.08.2026",
    end: "22.08.2026",
    durationDays: 15,
    status: "In Bearbeitung",
    priority: "High",
    dependency: "Bestandsaufmaß",
    completionEvidence: "Raumbuch mit Schadenskartierung",
    nextPackage: "Denkmalpflegerische Bestandsanalyse",
    calendar: true,
    planOffsetDays: 26,
  },
];

const OVERVIEW: OperationalOverview = {
  openTasks: 43,
  overdueTasks: 3,
  waitingExternal: 10,
  activeProjects: 5,
  projectsNeedingAttention: 3,
  assetsTracked: 19,
  activeAssets: 9,
};

export class MockReadOnlyOperationsSource implements ReadOnlyOperationsSource {
  async listTasks() { return tasks.map((task) => ({ ...task, updates: [...task.updates] })); }
  async getTask(id: string) { return (await this.listTasks()).find((task) => task.id === id) ?? null; }

  async listAssets() { return assets.map((asset) => ({ ...asset })); }
  async getAsset(id: string) { return (await this.listAssets()).find((asset) => asset.id === id) ?? null; }

  async listProjects() { return projects.map((project) => ({ ...project })); }
  async getProject(id: string) { return (await this.listProjects()).find((project) => project.id === id) ?? null; }
  async listWorkPackages(projectId: string) {
    if (projectId !== "PRJ-0001") return [];
    return HOTEL_57_WORK_PACKAGES.map((item) => ({ ...item }));
  }

  async getOverview() { return { ...OVERVIEW }; }
}
