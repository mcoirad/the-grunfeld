import { useEffect, useMemo, useState } from "preact/hooks";
import { ExecutiveCard } from "./ExecutiveCard";
import { filterRankedExecutives, rankExecutives } from "../lib/ranking";
import {
  DEFAULT_EXPLORER_STATE,
  parseExplorerState,
  serializeExplorerState,
} from "../lib/state";
import type {
  DetailLevel,
  Executive,
  ExplorerState,
  MetricName,
  Population,
} from "../lib/types";

interface RankingsExplorerProps {
  executives: Executive[];
  basePath: string;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset class="segmented-control">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            type="button"
            class={value === option.value ? "is-active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function RankingsExplorer({ executives, basePath }: RankingsExplorerProps) {
  const [state, setState] = useState<ExplorerState>(DEFAULT_EXPLORER_STATE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const parsed = parseExplorerState(window.location.search);
    setState(parsed);
    if (parsed.executive) setExpanded(new Set([parsed.executive]));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const query = serializeExplorerState(state);
    window.history.replaceState({}, "", `${window.location.pathname}${query}`);
  }, [hydrated, state]);

  const teams = useMemo(
    () =>
      [...new Set(executives.flatMap((executive) => executive.teams.map(({ code }) => code)))].sort(),
    [executives],
  );
  const ranked = useMemo(
    () => rankExecutives(executives, state.population, state.metric),
    [executives, state.population, state.metric],
  );
  const visible = useMemo(
    () => filterRankedExecutives(ranked, state.team, state.query),
    [ranked, state.team, state.query],
  );

  function update<K extends keyof ExplorerState>(key: K, value: ExplorerState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleCard(slug: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    update("executive", state.executive === slug ? "" : slug);
  }

  function resetFilters() {
    setState((current) => ({ ...current, team: "", query: "", executive: "" }));
    setExpanded(new Set());
  }

  return (
    <section
      class="rankings-explorer"
      aria-labelledby="rankings-title"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <div class="depth-panel">
        <div>
          <p class="eyebrow">Choose your depth</p>
          <h2>How much do you want to know?</h2>
        </div>
        <SegmentedControl<DetailLevel>
          label="Detail level"
          value={state.detail}
          options={[
            { value: "skim", label: "Skim" },
            { value: "peruse", label: "Peruse" },
            { value: "deep", label: "Deep dive" },
          ]}
          onChange={(detail) => update("detail", detail)}
        />
      </div>

      <div class="ranking-heading">
        <div>
          <p class="eyebrow">The rankings</p>
          <h2 id="rankings-title">
            {state.population === "current" ? "Who’s building now" : "The complete front office archive"}
          </h2>
        </div>
        <p>
          {visible.length} of {ranked.length} executives shown · sorted by {state.metric.toUpperCase()}
        </p>
      </div>

      <div class="control-deck" aria-label="Ranking controls">
        <SegmentedControl<Population>
          label="Population"
          value={state.population}
          options={[
            { value: "current", label: "Current" },
            { value: "all", label: "All-time" },
          ]}
          onChange={(population) => update("population", population)}
        />
        <SegmentedControl<MetricName>
          label="Metric"
          value={state.metric}
          options={[
            { value: "bpm", label: "BPM" },
            { value: "vorp", label: "VORP" },
          ]}
          onChange={(metric) => update("metric", metric)}
        />
        <label class="select-control">
          <span>Team</span>
          <select value={state.team} onChange={(event) => update("team", event.currentTarget.value)}>
            <option value="">All teams</option>
            {teams.map((team) => (
              <option value={team} key={team}>
                {team}
              </option>
            ))}
          </select>
        </label>
        <label class="search-control">
          <span>Find an executive</span>
          <input
            type="search"
            value={state.query}
            placeholder="Search by name"
            onInput={(event) =>
              update("query", (event.target as HTMLInputElement).value)
            }
          />
        </label>
      </div>

      <div class="executive-list" aria-live="polite">
        {visible.map((executive) => (
          <ExecutiveCard
            executive={executive}
            metric={state.metric}
            detail={state.detail}
            basePath={basePath}
            expanded={state.detail === "deep" || expanded.has(executive.slug)}
            onToggle={() => toggleCard(executive.slug)}
            profileHref={`${basePath}executives/${executive.slug}/${
              state.metric === "vorp" ? "?metric=vorp" : ""
            }`}
            key={executive.slug}
          />
        ))}
      </div>

      {!visible.length && (
        <div class="empty-state">
          <p class="eyebrow">No matches</p>
          <h3>That front office is off the board.</h3>
          <button type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      )}
    </section>
  );
}
