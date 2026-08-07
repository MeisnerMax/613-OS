import type { Asset, DevelopmentWorkPackage, OperationalOverview, Project, Task } from "../../domain";

/**
 * Transition adapters deliberately expose read operations only.
 * Production Google Sheets remain immutable from 613 OS until a later,
 * explicit migration decision introduces a separate write store.
 */
export interface TaskReader {
  listTasks(): Promise<ReadonlyArray<Task>>;
  getTask(id: string): Promise<Task | null>;
}

export interface AssetReader {
  listAssets(): Promise<ReadonlyArray<Asset>>;
  getAsset(id: string): Promise<Asset | null>;
}

export interface ProjectReader {
  listProjects(): Promise<ReadonlyArray<Project>>;
  getProject(id: string): Promise<Project | null>;
  listWorkPackages(projectId: string): Promise<ReadonlyArray<DevelopmentWorkPackage>>;
}

export interface OverviewReader {
  getOverview(): Promise<OperationalOverview>;
}

export type ReadOnlyOperationsSource = TaskReader & AssetReader & ProjectReader & OverviewReader;
