import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE_STATE,
  filterTransactions,
  findHighlights,
  impactTier,
  parseProfileState,
  serializeProfileState,
} from "../../src/lib/profile";
import type { ExecutiveTransaction } from "../../src/lib/types";

function transaction(id: number, type: ExecutiveTransaction["type"], bpm: number): ExecutiveTransaction {
  return {
    id: `test-${id}`,
    sourceId: id,
    date: `202${id}-01-01`,
    type,
    tenureTeam: "BOS",
    summary: `Signed Player ${id}`,
    participants: [
      {
        name: `Player ${id}`,
        playerHref: null,
        direction: "in",
        teamCode: "BOS",
        values: { bpm, vorp: bpm / 10 },
        creditedToDraft: false,
      },
    ],
    values: { bpm, vorp: bpm / 10 },
    runningValues: { bpm, vorp: bpm / 10 },
  };
}

describe("profile state and transaction helpers", () => {
  const transactions = [
    transaction(0, "draft", -10),
    transaction(1, "trade", 1),
    transaction(2, "signing", 20),
  ];

  it("round-trips supported profile URL state and defaults invalid input", () => {
    const state = { metric: "vorp" as const, type: "trade" as const, query: "Player 1" };
    expect(parseProfileState(serializeProfileState(state))).toEqual(state);
    expect(parseProfileState("?metric=ws&type=waiver")).toEqual(DEFAULT_PROFILE_STATE);
  });

  it("filters by move type and participant search", () => {
    expect(filterTransactions(transactions, "trade", "player 1")).toEqual([transactions[1]]);
  });

  it("finds the largest positive and negative grouped moves", () => {
    expect(findHighlights(transactions, "bpm")).toEqual({
      best: transactions[2],
      worst: transactions[0],
    });
  });

  it("assigns impact tiers from absolute within-executive magnitude", () => {
    expect(impactTier(transactions[2], transactions, "bpm")).toBe("monumental");
    expect(impactTier(transactions[1], transactions, "bpm")).toBe("standard");
  });
});
