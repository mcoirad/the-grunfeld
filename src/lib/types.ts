export type MetricName = "bpm" | "vorp";
export type Population = "current" | "all";
export type DetailLevel = "skim" | "peruse" | "deep";
export type CategoryName = "draft" | "trade" | "signing";

export interface ExecutiveCategoryMetric {
  total: number | null;
  rating: number | null;
  percentile: number | null;
  grade: string | null;
  count: number | null;
}

export interface ExecutiveMetric {
  finalValue: number;
  sourceRank: number | null;
  categories: Record<CategoryName, ExecutiveCategoryMetric>;
}

export interface Executive {
  slug: string;
  name: string;
  teams: Array<{ code: string; name: string }>;
  startYear: number;
  endYear: number;
  isActive: boolean;
  isNoob: boolean;
  portrait: string | null;
  metrics: Record<MetricName, ExecutiveMetric>;
}

export interface SnapshotMetadata {
  runId: string;
  backendCommit: string;
  inputTable: string;
  draftEndYear: number;
  generatedAt: string;
  rowCount: number;
  activeCount: number;
  sourceFile: string;
}

export interface RankedExecutive extends Executive {
  displayRank: number;
  rankPercentile: number;
  populationSize: number;
}

export interface ExplorerState {
  population: Population;
  metric: MetricName;
  detail: DetailLevel;
  team: string;
  query: string;
  executive: string;
}
