import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPLORER_STATE,
  parseExplorerState,
  serializeExplorerState,
} from "../../src/lib/state";

describe("explorer URL state", () => {
  it("uses safe defaults for missing or invalid values", () => {
    expect(parseExplorerState("?metric=winshares&population=retired&detail=everything")).toEqual(
      DEFAULT_EXPLORER_STATE,
    );
  });

  it("round-trips supported controls", () => {
    const state = {
      population: "all" as const,
      metric: "vorp" as const,
      detail: "deep" as const,
      team: "BOS",
      query: "Danny Ainge",
      executive: "aingeda01x",
    };
    expect(parseExplorerState(serializeExplorerState(state))).toEqual(state);
  });

  it("omits default values from share URLs", () => {
    expect(serializeExplorerState(DEFAULT_EXPLORER_STATE)).toBe("");
  });
});
