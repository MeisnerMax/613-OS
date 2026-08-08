import type { Asset, OperationalOverview, PortfolioSnapshot, Task } from "./domain";
import { MockReadOnlyOperationsSource } from "./adapters/read-only/mock-source";
import { selectTaskProvider } from "./adapters/read-only/provider-selector";
import { selectAssetProvider, selectDevelopmentProvider } from "./adapters/read-only/portfolio-provider-selector";

const transitionSource = new MockReadOnlyOperationsSource();

function sourceAwareOverview(base: OperationalOverview, tasks: ReadonlyArray<Task>, assets: ReadonlyArray<Asset>): OperationalOverview {
  return {
    ...base,
    openTasks: tasks.filter((task) => task.status !== "Done").length,
    overdueTasks: tasks.filter((task) => task.flag === "overdue").length,
    waitingExternal: tasks.filter((task) => task.status === "Waiting").length,
    assetsTracked: assets.length,
    activeAssets: assets.filter((asset) => asset.status === "Active").length,
  };
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const [taskProvider, assetProvider] = await Promise.all([selectTaskProvider(), selectAssetProvider()]);
  const [tasks, assets, projects, baseOverview] = await Promise.all([
    taskProvider.reader.listTasks(),
    assetProvider.reader.listAssets(),
    transitionSource.listProjects(),
    transitionSource.getOverview(),
  ]);

  return {
    tasks: tasks.map((task) => ({ ...task, updates: [...task.updates] })),
    assets: assets.map((asset) => ({ ...asset })),
    projects: [...projects],
    overview: sourceAwareOverview(baseOverview, tasks, assets),
    sourceMode: taskProvider.mode,
  };
}

export async function getAssetById(assetId: string) {
  const provider = await selectAssetProvider();
  return provider.reader.getAsset(assetId);
}

export async function getMigratedDevelopmentProjectIds() {
  const provider = await selectDevelopmentProvider();
  if (!provider.reader) return [];
  return provider.reader.listProjectIds();
}

export async function getProjectWorkPackages(projectId: string) {
  const provider = await selectDevelopmentProvider();
  if (provider.reader) return provider.reader.listWorkPackages(projectId);
  return transitionSource.listWorkPackages(projectId);
}

export async function getDevelopmentProjectDetail(projectId: string) {
  const provider = await selectDevelopmentProvider();
  if (!provider.reader) return null;
  return provider.reader.getProjectDetail(projectId);
}
