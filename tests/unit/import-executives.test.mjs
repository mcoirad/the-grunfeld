import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "csv-parse/sync";
import {
  normalizeDetailRecords,
  normalizeRecords,
  validateDetailFiles,
} from "../../scripts/import-executives.mjs";

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
    expect(ainge.metrics.bpm.categories.draft.percentiles.overall).toBeTypeOf("number");
    expect(ainge.metrics.bpm.categories.draft.percentiles.rating).toBeTypeOf("number");
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

describe("executive detail normalization", () => {
  const executive = {
    slug: "testexec",
    teams: [
      { code: "HOU", name: "Houston Rockets" },
      { code: "PHI", name: "Philadelphia 76ers" },
    ],
    metrics: {
      bpm: { finalValue: 7 },
      vorp: { finalValue: 0.7 },
    },
  };
  const row = (overrides = {}) => ({
    name: "Player",
    transaction_date: "2020-01-01 00:00:00",
    transaction_direction: "1",
    team: "HOU",
    href: "/players/p/player01.html",
    transaction_id: "1.0",
    transaction_type: "trade",
    did_bpm_replace_for_draft_transaction: "False",
    draft_bpm: "0",
    draft_vorp: "0",
    actual_bpm: "0",
    actual_vorp: "0",
    running_bpm: "0",
    running_vorp: "0",
    ...overrides,
  });
  const boundary = (date) =>
    row({
      name: "",
      transaction_date: date,
      transaction_direction: "0",
      transaction_id: "",
      transaction_type: "",
    });

  it("groups whole trades, preserves directions, and creates tenure boundaries", () => {
    const detail = normalizeDetailRecords(
      [
        boundary("2020-01-01 00:00:00"),
        row({ name: "Incoming", actual_bpm: "10", actual_vorp: "1", running_bpm: "10", running_vorp: "1" }),
        row({ name: "Outgoing", transaction_direction: "-1", team: "LAL", actual_bpm: "-3", actual_vorp: "-0.3", running_bpm: "7", running_vorp: "0.7" }),
        boundary("2021-01-01 00:00:00"),
        row({ name: "Second Team Player", team: "PHI", transaction_id: "2.0", transaction_type: "signing", transaction_date: "2021-01-02 00:00:00", running_bpm: "7", running_vorp: "0.7" }),
      ],
      executive,
    );
    expect(detail.tenures.map(({ teamCode }) => teamCode)).toEqual(["HOU", "PHI"]);
    expect(detail.transactions).toHaveLength(2);
    expect(detail.transactions[0].values).toEqual({ bpm: 7, vorp: 0.7 });
    expect(detail.transactions[0].categoryValues).toEqual({ bpm: 7, vorp: 0.7 });
    expect(detail.transactions[0].participants.map(({ direction }) => direction)).toEqual(["in", "out"]);
  });

  it("rejects mixed types inside one transaction", () => {
    expect(() =>
      normalizeDetailRecords(
        [
          boundary("2020-01-01 00:00:00"),
          row({ actual_bpm: "7", actual_vorp: "0.7", running_bpm: "7", running_vorp: "0.7" }),
          row({ transaction_type: "signing", running_bpm: "7", running_vorp: "0.7" }),
        ],
        { ...executive, teams: executive.teams.slice(0, 1) },
      ),
    ).toThrow(/mixed date or type/i);
  });

  it("rejects detail totals that do not reconcile with aggregates", () => {
    expect(() =>
      normalizeDetailRecords(
        [boundary("2020-01-01 00:00:00"), row({ running_bpm: "8", running_vorp: "0.7" })],
        { ...executive, teams: executive.teams.slice(0, 1) },
      ),
    ).toThrow(/does not match aggregate/i);
  });

  it("normalizes acquisition and multitrade rows to grouped trades", () => {
    for (const rawType of ["acquisition", "multitrade"]) {
      const detail = normalizeDetailRecords(
        [
          boundary("2020-01-01 00:00:00"),
          row({ transaction_type: rawType, actual_bpm: "7", actual_vorp: "0.7", running_bpm: "7", running_vorp: "0.7" }),
        ],
        { ...executive, teams: executive.teams.slice(0, 1) },
      );
      expect(detail.transactions[0].type).toBe("trade");
    }
  });

  it("assigns category value to the draft choice instead of its rookie signing", () => {
    const detail = normalizeDetailRecords(
      [
        boundary("2020-01-01 00:00:00"),
        row({ transaction_type: "draft", draft_bpm: "7", draft_vorp: "0.7", actual_bpm: "0", actual_vorp: "0" }),
        row({ transaction_id: "2.0", transaction_type: "signing", did_bpm_replace_for_draft_transaction: "True", transaction_date: "2020-01-02 00:00:00", actual_bpm: "7", actual_vorp: "0.7", running_bpm: "7", running_vorp: "0.7" }),
      ],
      { ...executive, teams: executive.teams.slice(0, 1) },
    );
    expect(detail.transactions[0].categoryValues).toEqual({ bpm: 7, vorp: 0.7 });
    expect(detail.transactions[1].categoryValues).toEqual({ bpm: 0, vorp: 0 });
  });

  it("rejects invalid calendar dates and non-numeric impacts", () => {
    expect(() =>
      normalizeDetailRecords(
        [boundary("2020-02-31 00:00:00"), row({ running_bpm: "7", running_vorp: "0.7" })],
        { ...executive, teams: executive.teams.slice(0, 1) },
      ),
    ).toThrow(/invalid date/i);
    expect(() =>
      normalizeDetailRecords(
        [boundary("2020-01-01 00:00:00"), row({ actual_bpm: "not-a-number", running_bpm: "7", running_vorp: "0.7" })],
        { ...executive, teams: executive.teams.slice(0, 1) },
      ),
    ).toThrow(/invalid number/i);
  });

  it("rejects missing and unexpected detail files", () => {
    expect(() => validateDetailFiles(["a.csv"], ["a.csv", "b.csv"])).toThrow(/missing=b\.csv/i);
    expect(() => validateDetailFiles(["a.csv", "extra.csv"], ["a.csv"])).toThrow(/extra=extra\.csv/i);
  });
});
