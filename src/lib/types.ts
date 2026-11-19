export type MetricName = "bpm" | "vorp";
export type Population = "current" | "all";
export type DetailLevel = "skim" | "peruse" | "deep";
export type CategoryName = "draft" | "trade" | "signing";
export type TransactionType = CategoryName;
export type ImpactTier = "standard" | "major" | "monumental";

export interface PercentileSet {
  rating: number | null;
  total: number;
  overall: number | null;
}

export interface GradeSet {
  rating: string | null;
  total: string;
  overall: string | null;
}

export interface ExecutiveCategoryMetric {
  total: number;
  rating: number | null;
  percentiles: PercentileSet;
  grades: GradeSet;
  count: number;
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
  detailSourceDirectory: string;
  detailFileCount: number;
  transactionCount: number;
  detailSourceRowCount: number;
}

export interface MetricValues {
  bpm: number;
  vorp: number;
}

export interface ExecutiveParticipant {
  name: string;
  playerHref: string | null;
  direction: "in" | "out";
  teamCode: string | null;
  values: MetricValues;
  creditedToDraft: boolean;
}

export interface ExecutiveTransaction {
  id: string;
  sourceId: number;
  date: string;
  type: TransactionType;
  tenureTeam: string;
  summary: string;
  participants: ExecutiveParticipant[];
  values: MetricValues;
  categoryValues: MetricValues;
  runningValues: MetricValues;
}

export interface ExecutiveTenure {
  teamCode: string;
  startDate: string;
  endDate: string | null;
}

export interface ExecutiveDetail {
  slug: string;
  sourceRowCount: number;
  tenures: ExecutiveTenure[];
  transactions: ExecutiveTransaction[];
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

export interface ProfileState {
  metric: MetricName;
  type: TransactionType | "all";
  query: string;
}
