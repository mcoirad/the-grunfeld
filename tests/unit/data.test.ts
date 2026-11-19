import { describe, expect, it } from "vitest";
import { loadExecutiveSnapshot } from "../../src/lib/data";
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
        (category) => category.percentile === null,
      ),
    );
    expect(nullable).toBeDefined();
    expect(nullable?.isNoob).toBe(true);
  });
});
