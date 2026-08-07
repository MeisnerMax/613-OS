export type TaskStatus = "Open" | "In progress" | "Waiting" | "Done";
export type Priority = "High" | "Medium" | "Low";
export type Health = "On track" | "At risk" | "Delayed";

export type Task = {
  id: string;
  title: string;
  asset: string;
  category?: string;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  support?: string;
  info?: string;
  waitingFor?: string;
  waitingSince?: string;
  waitingDays?: number;
  deadline?: string;
  nextStep?: string;
  nextStepBy?: string;
  description: string;
  flag?: "overdue" | "waiting" | "attention";
  updates: string[];
  version?: number;
};

export type Asset = {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Under examination" | "Sold";
  city: string;
  units: number;
  openTasks: number;
  projects: number;
};

export type Project = {
  id: string;
  asset: string;
  phase: string;
  progress: number;
  health: Health;
  completion: string;
  nextMilestone: string;
};

export type DevelopmentProjectDetail = {
  id: string;
  assetId: string;
  name: string;
  status: string;
  startDate?: string;
  plannedEndDate?: string;
  asOfDate?: string;
  currentFocus?: string;
  currentOwner?: string;
  currentStartDate?: string;
  currentCompletionEvidence?: string;
};

export type DevelopmentWorkPackage = {
  sourceId: string;
  phase: string;
  title: string;
  action: string;
  owner?: string;
  start?: string;
  end?: string;
  durationDays?: number;
  status: string;
  priority: Priority;
  dependency?: string;
  completionEvidence?: string;
  nextPackage?: string;
  calendar: boolean;
  planOffsetDays?: number;
};

export type OperationalOverview = {
  openTasks: number;
  overdueTasks: number;
  waitingExternal: number;
  activeProjects: number;
  projectsNeedingAttention: number;
  assetsTracked: number;
  activeAssets: number;
};

export type PortfolioSnapshot = {
  tasks: Task[];
  assets: Asset[];
  projects: Project[];
  overview: OperationalOverview;
  sourceMode: "mock-read-only" | "google-sheets-read-only" | "postgres";
};
