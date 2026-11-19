import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "csv-parse/sync";
import { normalizeRecords } from "../../scripts/import-executives.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const records = parse(
  fs.readFileSync(path.join(root, "data/source/executive_stats_v2.csv"), "utf8"),
  { columns: true, skip_empty_lines: true },
);
const portraitDirectory = path.join(root, "public/images/executives");

describe("executive CSV normalization", () => {
  it("parses team arrays, stable slugs, metrics, and portraits", () => {
    const normalized = normalizeRecords(records, { portraitDirectory });
    const ainge = normalized.find(({ slug }) => slug === "aingeda01x");
    expect(ainge.teams.map(({ code }) => code)).toEqual(["BOS", "UTA"]);
    expect(ainge.metrics.bpm.categories.draft.percentile).toBeTypeOf("number");
    expect(ainge.portrait).toBe("images/executives/aingeda01x.webp");
  });

  it("rejects invalid percentiles", () => {
    const invalid = records.map((record, index) =>
      index === 0 ? { ...record, draft_overall_percentile_bpm: "101" } : record,
    );
    expect(() => normalizeRecords(invalid, { portraitDirectory })).toThrow(
      /out of range/i,
    );
  });

  it("rejects duplicate executive slugs", () => {
    const duplicate = records.map((record, index) =>
      index === 1 ? { ...record, href: records[0].href } : record,
    );
    expect(() => normalizeRecords(duplicate, { portraitDirectory })).toThrow(
      /duplicate/i,
    );
  });
});
