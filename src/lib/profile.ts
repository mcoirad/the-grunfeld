import type {
  ExecutiveTransaction,
  ImpactTier,
  MetricName,
  ProfileState,
} from "./types";

export const DEFAULT_PROFILE_STATE: ProfileState = {
  metric: "bpm",
  type: "all",
  query: "",
};

export function parseProfileState(search: string): ProfileState {
  const parameters = new URLSearchParams(search);
  const metric = parameters.get("metric");
  const type = parameters.get("type");
  return {
    metric: metric === "vorp" ? "vorp" : "bpm",
    type:
      type === "draft" || type === "trade" || type === "signing" ? type : "all",
    query: parameters.get("q") ?? "",
  };
}

export function serializeProfileState(state: ProfileState): string {
  const parameters = new URLSearchParams();
  if (state.metric !== DEFAULT_PROFILE_STATE.metric) parameters.set("metric", state.metric);
  if (state.type !== DEFAULT_PROFILE_STATE.type) parameters.set("type", state.type);
  if (state.query.trim()) parameters.set("q", state.query.trim());
  const value = parameters.toString();
  return value ? `?${value}` : "";
}

export function filterTransactions(
  transactions: ExecutiveTransaction[],
  type: ProfileState["type"],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return transactions.filter((transaction) => {
    const isDraftCreditedSigning =
      transaction.type === "signing" &&
      transaction.participants.every(({ creditedToDraft }) => creditedToDraft);
    const matchesType =
      type === "all" ||
      (transaction.type === type && !(type === "signing" && isDraftCreditedSigning));
    const matchesQuery =
      !normalizedQuery ||
      transaction.summary.toLocaleLowerCase().includes(normalizedQuery) ||
      transaction.participants.some(({ name }) =>
        name.toLocaleLowerCase().includes(normalizedQuery),
      );
    return matchesType && matchesQuery;
  });
}

export function findHighlights(
  transactions: ExecutiveTransaction[],
  metric: MetricName,
  type: ProfileState["type"] = "all",
) {
  const populated = filterTransactions(transactions, type, "").filter(
    (transaction) => transactionImpact(transaction, metric, type) !== 0,
  );
  const best = populated.reduce<ExecutiveTransaction | null>(
    (winner, transaction) =>
      !winner || transactionImpact(transaction, metric, type) > transactionImpact(winner, metric, type)
        ? transaction
        : winner,
    null,
  );
  const worst = populated.reduce<ExecutiveTransaction | null>(
    (loser, transaction) =>
      !loser || transactionImpact(transaction, metric, type) < transactionImpact(loser, metric, type)
        ? transaction
        : loser,
    null,
  );
  return {
    best: best && transactionImpact(best, metric, type) > 0 ? best : null,
    worst: worst && transactionImpact(worst, metric, type) < 0 ? worst : null,
  };
}

export function transactionImpact(
  transaction: ExecutiveTransaction,
  metric: MetricName,
  type: ProfileState["type"],
) {
  return (type === "all" ? transaction.values : transaction.categoryValues)[metric];
}

export function impactTier(
  transaction: ExecutiveTransaction,
  transactions: ExecutiveTransaction[],
  metric: MetricName,
): ImpactTier {
  const magnitude = Math.abs(transaction.values[metric]);
  if (!magnitude) return "standard";
  let distributions = impactDistributions.get(transactions);
  if (!distributions) {
    distributions = {
      bpm: transactions.map(({ values }) => Math.abs(values.bpm)).filter(Boolean).sort((left, right) => left - right),
      vorp: transactions.map(({ values }) => Math.abs(values.vorp)).filter(Boolean).sort((left, right) => left - right),
    };
    impactDistributions.set(transactions, distributions);
  }
  const magnitudes = distributions[metric];
  let low = 0;
  let high = magnitudes.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (magnitudes[middle] < magnitude) low = middle + 1;
    else high = middle;
  }
  const below = low;
  const percentile = magnitudes.length <= 1 ? 1 : below / (magnitudes.length - 1);
  if (percentile >= 0.95) return "monumental";
  if (percentile >= 0.8) return "major";
  return "standard";
}

const impactDistributions = new WeakMap<
  ExecutiveTransaction[],
  Record<MetricName, number[]>
>();
