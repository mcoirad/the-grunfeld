import { describe, expect, it } from "vitest";
import { loadExecutiveDetail, loadExecutiveSnapshot } from "../../src/lib/data";
import { executivesSchema } from "../../src/lib/schema";

describe("committed executive snapshot", () => {
  it("matches the declared row counts and schema", () => {
    const { executives, metadata } = loadExecutiveSnapshot();
    expect(executives).toHaveLength(173);
    expect(executives.filter(({ isActive }) => isActive)).toHaveLength(30);
    expect(metadata.runId).toBe("analysis-v2-first-20261118");
  });

  it("rejects duplicate slugs", () => {
    const { executives } = loadExecutiveSnapshot();
    const duplicate = executives.map((executive, index) =>
      index === 1 ? { ...executive, slug: executives[0].slug } : executive,
    );
    expect(() => executivesSchema.parse(duplicate)).toThrow(/unique/i);
  });

  it("preserves insufficient-sample values as null instead of zero", () => {
    const { executives } = loadExecutiveSnapshot();
    const nullable = executives.find((executive) =>
      Object.values(executive.metrics.bpm.categories).some(
        (category) => category.percentiles.overall === null,
      ),
    );
    expect(nullable).toBeDefined();
    expect(nullable?.isNoob).toBe(true);
  });

  it("loads grouped detail data that reconciles to the aggregate snapshot", () => {
    const { executives, metadata } = loadExecutiveSnapshot();
    const detail = loadExecutiveDetail("moreyda99x");
    const morey = executives.find(({ slug }) => slug === "moreyda99x");
    expect(metadata.detailFileCount).toBe(173);
    expect(metadata.transactionCount).toBe(16192);
    expect(detail.tenures.map(({ teamCode }) => teamCode)).toEqual(["HOU", "PHI"]);
    expect(detail.transactions.at(-1)?.runningValues.bpm).toBeCloseTo(
      morey?.metrics.bpm.finalValue ?? 0,
      5,
    );
  });
});
