import { describe, expect, it } from "vitest";
import { filterRankedExecutives, rankExecutives } from "../../src/lib/ranking";
import type { Executive } from "../../src/lib/types";

function executive(
  slug: string,
  name: string,
  bpm: number,
  vorp: number,
  isActive = true,
  team = "BOS",
): Executive {
  const category = {
    total: 1,
    rating: 1,
    percentiles: { total: 50, rating: 50, overall: 50 },
    grades: { total: "C", rating: "C", overall: "C" },
    count: 1,
  };
  return {
    slug,
    name,
    teams: [{ code: team, name: team }],
    startYear: 2020,
    endYear: 2026,
    isActive,
    isNoob: false,
    portrait: null,
    metrics: {
      bpm: {
        finalValue: bpm,
        sourceRank: null,
        categories: { draft: category, trade: category, signing: category },
      },
      vorp: {
        finalValue: vorp,
        sourceRank: null,
        categories: { draft: category, trade: category, signing: category },
      },
    },
  };
}

describe("rankExecutives", () => {
  const records = [
    executive("alpha", "Alpha", 20, 3),
    executive("beta", "Beta", 20, 5),
    executive("gamma", "Gamma", 10, 50, false, "NYK"),
  ];

  it("ranks within the selected population and uses the alternate metric as a tie-breaker", () => {
    const ranked = rankExecutives(records, "current", "bpm");
    expect(ranked.map(({ slug, displayRank }) => [slug, displayRank])).toEqual([
      ["beta", 1],
      ["alpha", 2],
    ]);
    expect(ranked.map(({ rankPercentile }) => rankPercentile)).toEqual([100, 0]);
  });

  it("includes former executives in the all-time population", () => {
    expect(rankExecutives(records, "all", "vorp").map(({ slug }) => slug)).toEqual([
      "gamma",
      "beta",
      "alpha",
    ]);
  });

  it("filters without renumbering the population", () => {
    const ranked = rankExecutives(records, "all", "bpm");
    const filtered = filterRankedExecutives(ranked, "NYK", "");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].displayRank).toBe(3);
  });
});
