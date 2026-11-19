import type { ExplorerState } from "./types";

export const DEFAULT_EXPLORER_STATE: ExplorerState = {
  population: "current",
  metric: "bpm",
  detail: "peruse",
  team: "",
  query: "",
  executive: "",
};

export function parseExplorerState(search: string): ExplorerState {
  const parameters = new URLSearchParams(search);
  const population = parameters.get("population");
  const metric = parameters.get("metric");
  const detail = parameters.get("detail");
  return {
    population: population === "all" ? "all" : "current",
    metric: metric === "vorp" ? "vorp" : "bpm",
    detail:
      detail === "skim" || detail === "deep" || detail === "peruse"
        ? detail
        : "peruse",
    team: parameters.get("team")?.toUpperCase() ?? "",
    query: parameters.get("q") ?? "",
    executive: parameters.get("executive") ?? "",
  };
}

export function serializeExplorerState(state: ExplorerState): string {
  const parameters = new URLSearchParams();
  if (state.population !== DEFAULT_EXPLORER_STATE.population) {
    parameters.set("population", state.population);
  }
  if (state.metric !== DEFAULT_EXPLORER_STATE.metric) {
    parameters.set("metric", state.metric);
  }
  if (state.detail !== DEFAULT_EXPLORER_STATE.detail) {
    parameters.set("detail", state.detail);
  }
  if (state.team) parameters.set("team", state.team);
  if (state.query.trim()) parameters.set("q", state.query.trim());
  if (state.executive) parameters.set("executive", state.executive);
  const serialized = parameters.toString();
  return serialized ? `?${serialized}` : "";
}
