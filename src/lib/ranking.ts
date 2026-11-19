import type {
  Executive,
  MetricName,
  Population,
  RankedExecutive,
} from "./types";

const alternateMetric: Record<MetricName, MetricName> = {
  bpm: "vorp",
  vorp: "bpm",
};

export function rankExecutives(
  executives: Executive[],
  population: Population,
  metric: MetricName,
): RankedExecutive[] {
  const candidates = executives.filter(
    (executive) => population === "all" || executive.isActive,
  );
  const secondary = alternateMetric[metric];
  const sorted = [...candidates].sort((left, right) => {
    const primaryDifference =
      right.metrics[metric].finalValue - left.metrics[metric].finalValue;
    if (primaryDifference !== 0) return primaryDifference;
    const secondaryDifference =
      right.metrics[secondary].finalValue - left.metrics[secondary].finalValue;
    if (secondaryDifference !== 0) return secondaryDifference;
    return left.name.localeCompare(right.name);
  });

  return sorted.map((executive, index) => ({
    ...executive,
    displayRank: index + 1,
    rankPercentile:
      sorted.length === 1
        ? 100
        : Math.round(((sorted.length - index - 1) / (sorted.length - 1)) * 100),
    populationSize: sorted.length,
  }));
}

export function filterRankedExecutives(
  executives: RankedExecutive[],
  team: string,
  query: string,
): RankedExecutive[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return executives.filter((executive) => {
    const matchesTeam =
      !team || executive.teams.some(({ code }) => code === team);
    const matchesQuery =
      !normalizedQuery ||
      executive.name.toLocaleLowerCase().includes(normalizedQuery);
    return matchesTeam && matchesQuery;
  });
}
