import type { OperationalOverview, PortfolioSnapshot, Task } from "./domain";
import { MockReadOnlyOperationsSource } from "./adapters/read-only/mock-source";
import { selectTaskProvider } from "./adapters/read-only/provider-selector";

const transitionSource = new MockReadOnlyOperationsSource();

function taskAwareOverview(base: OperationalOverview, tasks: ReadonlyArray<Task>): OperationalOverview {
  return {
    ...base,
    openTasks: tasks.filter((task) => task.status !== "Done").length,
    overdueTasks: tasks.filter((task) => task.flag === "overdue").length,
    waitingExternal: tasks.filter((task) => task.status === "Waiting").length,
  };
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const taskProvider = await selectTaskProvider();
  const [tasks, assets, projects, baseOverview] = await Promise.all([
    taskProvider.reader.listTasks(),
    transitionSource.listAssets(),
    transitionSource.listProjects(),
    transitionSource.getOverview(),
  ]);

  return {
    tasks: tasks.map((task) => ({ ...task, updates: [...task.updates] })),
    assets: [...assets],
    projects: [...projects],
    overview: taskAwareOverview(baseOverview, tasks),
    sourceMode: taskProvider.mode,
  };
}

export async function getProjectWorkPackages(projectId: string) {
  return transitionSource.listWorkPackages(projectId);
}
