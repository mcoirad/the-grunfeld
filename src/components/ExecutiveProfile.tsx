import executivesJson from "../data/executives.json";
import { useEffect, useMemo, useState } from "preact/hooks";
import { rankExecutives } from "../lib/ranking";
import {
  DEFAULT_PROFILE_STATE,
  filterTransactions,
  findHighlights,
  impactTier,
  parseProfileState,
  serializeProfileState,
} from "../lib/profile";
import type {
  CategoryName,
  Executive,
  ExecutiveDetail,
  ExecutiveTransaction,
  MetricName,
  ProfileState,
} from "../lib/types";

const ALL_EXECUTIVES = executivesJson as Executive[];
const CATEGORY_LABELS: Record<CategoryName, string> = {
  draft: "Drafting",
  trade: "Trades",
  signing: "Signings",
};

function formatValue(value: number, metric: MetricName, signed = false) {
  const formatted = new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: metric === "vorp" ? 1 : 0,
  }).format(value);
  return signed && value > 0 ? `+${formatted}` : formatted;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
}

function MetricControl({
  metric,
  onChange,
}: {
  metric: MetricName;
  onChange: (metric: MetricName) => void;
}) {
  return (
    <fieldset class="segmented-control profile-metric-control">
      <legend>Metric</legend>
      <div>
        {(["bpm", "vorp"] as const).map((option) => (
          <button
            type="button"
            class={metric === option ? "is-active" : ""}
            aria-pressed={metric === option}
            onClick={() => onChange(option)}
            key={option}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TenureChart({
  detail,
  metric,
}: {
  detail: ExecutiveDetail;
  metric: MetricName;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const width = 1000;
  const height = 430;
  const padding = { top: 34, right: 32, bottom: 58, left: 82 };
  const timestamps = detail.transactions.map(({ date }) => Date.parse(`${date}T00:00:00Z`));
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const values = [0, ...detail.transactions.map(({ runningValues }) => runningValues[metric])];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueSpan = maxValue - minValue || 1;
  const timeSpan = maxTime - minTime || 1;
  const x = (date: string) =>
    padding.left +
    ((Date.parse(`${date}T00:00:00Z`) - minTime) / timeSpan) *
      (width - padding.left - padding.right);
  const y = (value: number) =>
    padding.top +
    ((maxValue - value) / valueSpan) * (height - padding.top - padding.bottom);
  const path = detail.transactions
    .map((transaction, index) =>
      `${index ? "L" : "M"} ${x(transaction.date).toFixed(2)} ${y(
        transaction.runningValues[metric],
      ).toFixed(2)}`,
    )
    .join(" ");
  const yTicks = Array.from({ length: 5 }, (_, index) => minValue + (valueSpan * index) / 4);
  const startYear = new Date(minTime).getUTCFullYear();
  const endYear = new Date(maxTime).getUTCFullYear();
  const yearStep = Math.max(1, Math.ceil((endYear - startYear) / 5));
  const years = [];
  for (let year = startYear; year <= endYear; year += yearStep) years.push(year);
  if (years.at(-1) !== endYear) years.push(endYear);
  const active = detail.transactions.find(({ id }) => id === activeId) ?? null;

  return (
    <div class="tenure-chart" data-testid="tenure-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="tenure-chart-title tenure-chart-desc">
        <title id="tenure-chart-title">Cumulative {metric.toUpperCase()}-derived transaction value</title>
        <desc id="tenure-chart-desc">
          A chronological line showing cumulative player value after each recorded roster move.
        </desc>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              class={Math.abs(tick) < valueSpan / 100 ? "chart-zero" : "chart-grid"}
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text class="chart-axis-label" x={padding.left - 12} y={y(tick) + 5} text-anchor="end">
              {formatValue(tick, metric)}
            </text>
          </g>
        ))}
        {minValue < 0 && maxValue > 0 && (
          <line
            class="chart-zero"
            x1={padding.left}
            x2={width - padding.right}
            y1={y(0)}
            y2={y(0)}
          />
        )}
        {years.map((year) => {
          const yearX =
            padding.left +
            ((Date.UTC(year, 0, 1) - minTime) / timeSpan) *
              (width - padding.left - padding.right);
          return (
            <text class="chart-axis-label" x={yearX} y={height - 18} text-anchor="middle" key={year}>
              {year}
            </text>
          );
        })}
        {detail.tenures.map((tenure, index) => (
          <g key={`${tenure.teamCode}-${tenure.startDate}`}>
            {index > 0 && <line class="chart-tenure" x1={x(tenure.startDate)} x2={x(tenure.startDate)} y1={padding.top} y2={height - padding.bottom} />}
            <text class="chart-tenure-label" x={x(tenure.startDate) + 7} y={padding.top + 14}>{tenure.teamCode}</text>
          </g>
        ))}
        <path class="chart-line" d={path} />
        {detail.transactions.map((transaction) => {
          const tier = impactTier(transaction, detail.transactions, metric);
          const notable = tier !== "standard";
          if (!notable) return null;
          return (
            <circle
              class={`chart-point chart-point--${tier} chart-point--${
                transaction.values[metric] < 0 ? "negative" : "positive"
              }`}
              cx={x(transaction.date)}
              cy={y(transaction.runningValues[metric])}
              r={tier === "monumental" ? 8 : tier === "major" ? 5 : 2.2}
              tabIndex={0}
              aria-label={`${formatDate(transaction.date)}. ${transaction.summary}. ${formatValue(
                transaction.values[metric],
                metric,
                true,
              )}.`}
              onMouseEnter={() => setActiveId(transaction.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(transaction.id)}
              onBlur={() => setActiveId(null)}
              key={transaction.id}
            />
          );
        })}
        {active && (
          <g class="chart-tooltip" pointer-events="none">
            <rect
              x={Math.min(x(active.date) + 12, width - 330)}
              y={Math.max(y(active.runningValues[metric]) - 76, 8)}
              width="300"
              height="64"
              rx="0"
            />
            <text
              x={Math.min(x(active.date) + 26, width - 316)}
              y={Math.max(y(active.runningValues[metric]) - 50, 34)}
            >
              <tspan>{active.summary.slice(0, 42)}</tspan>
              <tspan x={Math.min(x(active.date) + 26, width - 316)} dy="21">
                {formatDate(active.date)} · {formatValue(active.values[metric], metric, true)} · running {formatValue(active.runningValues[metric], metric)}
              </tspan>
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function CategoryComparison({
  executive,
  metric,
  category,
}: {
  executive: Executive;
  metric: MetricName;
  category: CategoryName;
}) {
  const target = executive.metrics[metric].categories[category];
  if (target.percentiles.rating === null || target.percentiles.overall === null) {
    return (
      <article class="comparison-card comparison-card--empty">
        <p class="eyebrow">{CATEGORY_LABELS[category]}</p>
        <h3>Not enough data</h3>
        <p>This executive does not have a qualifying efficiency rating for this category.</p>
      </article>
    );
  }
  const points = ALL_EXECUTIVES.flatMap((candidate) => {
    const values = candidate.metrics[metric].categories[category].percentiles;
    return values.rating === null
      ? []
      : [{ executive: candidate, x: values.total, y: values.rating }];
  });
  const plot = { left: 42, top: 20, width: 278, height: 250 };
  const selectedPoint = points.find(({ executive: candidate }) => candidate.slug === executive.slug);
  const peerPath = points
    .filter(({ executive: candidate }) => candidate.slug !== executive.slug)
    .map(({ x, y }) => {
      const pointX = plot.left + (x / 100) * plot.width;
      const pointY = plot.top + plot.height - (y / 100) * plot.height;
      return `M${(pointX - 2).toFixed(1)} ${(pointY - 2).toFixed(1)}h4v4h-4z`;
    })
    .join("");
  return (
    <article class="comparison-card">
      <div class="comparison-card__heading">
        <div>
          <p class="eyebrow">{CATEGORY_LABELS[category]}</p>
          <h3>{target.grades.overall}</h3>
        </div>
        <p>{Math.round(target.percentiles.overall)}th percentile overall</p>
      </div>
      <svg viewBox="0 0 350 315" role="img" aria-label={`${CATEGORY_LABELS[category]} peer comparison`}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line class="comparison-grid" x1={plot.left} x2={plot.left + plot.width} y1={plot.top + plot.height - (tick / 100) * plot.height} y2={plot.top + plot.height - (tick / 100) * plot.height} />
            <line class="comparison-grid" y1={plot.top} y2={plot.top + plot.height} x1={plot.left + (tick / 100) * plot.width} x2={plot.left + (tick / 100) * plot.width} />
          </g>
        ))}
        <path class="comparison-point" d={peerPath} />
        {selectedPoint && (
          <circle
            class="comparison-point is-selected"
            cx={plot.left + (selectedPoint.x / 100) * plot.width}
            cy={plot.top + plot.height - (selectedPoint.y / 100) * plot.height}
            r="8"
          >
            <title>{executive.name}: {Math.round(selectedPoint.x)} total / {Math.round(selectedPoint.y)} efficiency</title>
          </circle>
        )}
        <text class="comparison-axis" x={plot.left + plot.width / 2} y="306" text-anchor="middle">Total value percentile</text>
        <text class="comparison-axis" transform="rotate(-90 13 145)" x="13" y="145" text-anchor="middle">Efficiency percentile</text>
      </svg>
      <dl class="comparison-card__stats">
        <div><dt>Total</dt><dd>{Math.round(target.percentiles.total)}</dd></div>
        <div><dt>Efficiency</dt><dd>{Math.round(target.percentiles.rating)}</dd></div>
        <div><dt>Moves</dt><dd>{target.count}</dd></div>
      </dl>
    </article>
  );
}

function HighlightCard({
  label,
  transaction,
  metric,
}: {
  label: string;
  transaction: ExecutiveTransaction | null;
  metric: MetricName;
}) {
  return (
    <article class={`move-highlight move-highlight--${label === "Biggest win" ? "positive" : "negative"}`}>
      <p class="eyebrow">{label}</p>
      {transaction ? (
        <>
          <strong>{formatValue(transaction.values[metric], metric, true)}</strong>
          <h3>{transaction.summary}</h3>
          <p>{formatDate(transaction.date)} · {transaction.type} · {transaction.tenureTeam}</p>
        </>
      ) : (
        <h3>No qualifying move</h3>
      )}
    </article>
  );
}

export function ExecutiveProfile({
  executive,
  detail,
  metadataRunId,
  basePath,
}: {
  executive: Executive;
  detail: ExecutiveDetail;
  metadataRunId: string;
  basePath: string;
}) {
  const [state, setState] = useState<ProfileState>(DEFAULT_PROFILE_STATE);
  const [limit, setLimit] = useState(30);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(parseProfileState(window.location.search));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.history.replaceState({}, "", `${window.location.pathname}${serializeProfileState(state)}`);
  }, [hydrated, state]);

  const metric = executive.metrics[state.metric];
  const allTimeRank = rankExecutives(ALL_EXECUTIVES, "all", state.metric).find(({ slug }) => slug === executive.slug);
  const currentRank = executive.isActive
    ? rankExecutives(ALL_EXECUTIVES, "current", state.metric).find(({ slug }) => slug === executive.slug)
    : null;
  const highlights = useMemo(
    () => findHighlights(detail.transactions, state.metric),
    [detail.transactions, state.metric],
  );
  const filtered = useMemo(
    () => filterTransactions(detail.transactions, state.type, state.query).toReversed(),
    [detail.transactions, state.type, state.query],
  );
  const visible = filtered.slice(0, limit);
  const visibleByTeam = detail.tenures
    .toReversed()
    .map((tenure) => ({
      tenure,
      transactions: visible.filter(({ tenureTeam }) => tenureTeam === tenure.teamCode),
    }))
    .filter(({ transactions }) => transactions.length);
  const careerStartYear = detail.tenures[0]?.startDate.slice(0, 4) ?? executive.startYear;
  const careerEndYear = detail.transactions.at(-1)?.date.slice(0, 4) ?? executive.endYear;

  function update<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    if (key === "type" || key === "query") setLimit(30);
  }

  return (
    <div class="executive-profile" data-hydrated={hydrated ? "true" : "false"}>
      <section class="profile-hero">
        <a class="profile-back" href={`${basePath}?metric=${state.metric}#executive-${executive.slug}`}>Back to rankings</a>
        <div class="profile-hero__portrait">
          {executive.portrait ? (
            <img src={`${basePath}${executive.portrait}`} alt={`${executive.name} portrait`} width="520" height="520" />
          ) : (
            <span aria-label={`${executive.name} portrait unavailable`}>{initials(executive.name)}</span>
          )}
        </div>
        <div class="profile-hero__identity">
          <p class="eyebrow">The front office file</p>
          <h1>{executive.name}</h1>
          <p>{executive.teams.map(({ name }) => name).join(" · ")}</p>
          <p>{careerStartYear}–{executive.isActive ? "present" : careerEndYear}</p>
        </div>
        <div class="profile-hero__score">
          <MetricControl metric={state.metric} onChange={(value) => update("metric", value)} />
          <strong>{formatValue(metric.finalValue, state.metric)}</strong>
          <span>Cumulative {state.metric === "bpm" ? "BPM-derived" : "VORP"} value</span>
          <dl>
            <div><dt>All-time</dt><dd>#{allTimeRank?.displayRank} of 173</dd></div>
            {currentRank && <div><dt>Current</dt><dd>#{currentRank.displayRank} of 30</dd></div>}
          </dl>
        </div>
      </section>

      <section class="profile-report-card" aria-label={`${executive.name} report card`}>
        {(Object.keys(CATEGORY_LABELS) as CategoryName[]).map((category) => (
          <div key={category}>
            <span>{CATEGORY_LABELS[category]}</span>
            <strong>{metric.categories[category].grades.overall ?? "N/A"}</strong>
            <small>{metric.categories[category].percentiles.overall === null ? "Not enough data" : `${Math.round(metric.categories[category].percentiles.overall)}th percentile`}</small>
          </div>
        ))}
      </section>

      <section class="profile-chart-section" aria-labelledby="performance-title">
        <div class="section-heading section-heading--dark">
          <p class="eyebrow">Performance over time</p>
          <h2 id="performance-title">Every move leaves a mark.</h2>
          <p>The line tracks cumulative player value after each recorded transaction. Larger points mark the most consequential changes.</p>
        </div>
        <TenureChart detail={detail} metric={state.metric} />
      </section>

      <section class="profile-comparisons" aria-labelledby="comparisons-title">
        <div class="section-heading">
          <p class="eyebrow">The grade report</p>
          <h2 id="comparisons-title">Volume meets efficiency.</h2>
          <p>Each plot compares career value with per-move efficiency across the full 173-executive dataset.</p>
        </div>
        <div class="comparison-grid-cards">
          {(Object.keys(CATEGORY_LABELS) as CategoryName[]).map((category) => (
            <CategoryComparison executive={executive} metric={state.metric} category={category} key={category} />
          ))}
        </div>
      </section>

      <section class="profile-moves" aria-labelledby="moves-title">
        <div class="section-heading section-heading--orange">
          <p class="eyebrow">The transaction tape</p>
          <h2 id="moves-title">The wins. The losses. Everything between.</h2>
        </div>
        <div class="move-highlights">
          <HighlightCard label="Biggest win" transaction={highlights.best} metric={state.metric} />
          <HighlightCard label="Biggest loss" transaction={highlights.worst} metric={state.metric} />
        </div>
        <div class="timeline-controls" aria-label="Transaction filters">
          <fieldset class="segmented-control">
            <legend>Move type</legend>
            <div>
              {(["all", "draft", "trade", "signing"] as const).map((type) => (
                <button type="button" class={state.type === type ? "is-active" : ""} aria-pressed={state.type === type} onClick={() => update("type", type)} key={type}>
                  {type === "all" ? "All" : CATEGORY_LABELS[type]}
                </button>
              ))}
            </div>
          </fieldset>
          <label class="search-control">
            <span>Find a player or pick</span>
            <input type="search" value={state.query} placeholder="Search the transaction tape" onInput={(event) => update("query", event.currentTarget.value)} />
          </label>
          <p>{filtered.length} grouped transactions</p>
        </div>
        <div class="transaction-timeline" aria-live="polite">
          {visibleByTeam.map(({ tenure, transactions }) => (
            <section class="tenure-group" key={`${tenure.teamCode}-${tenure.startDate}`}>
              <header>
                <strong>{tenure.teamCode}</strong>
                <span>{tenure.startDate.slice(0, 4)}–{tenure.endDate?.slice(0, 4) ?? (executive.isActive ? "present" : executive.endYear)}</span>
              </header>
              {transactions.map((transaction) => {
                const tier = impactTier(transaction, detail.transactions, state.metric);
                const draftCredit = transaction.participants.some(({ creditedToDraft }) => creditedToDraft);
                return (
                  <article class={`timeline-event timeline-event--${tier}`} data-testid="timeline-event" key={transaction.id}>
                    <div class="timeline-event__marker" aria-hidden="true" />
                    <div class="timeline-event__meta">
                      <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                      <span>{CATEGORY_LABELS[transaction.type]} · {transaction.tenureTeam}</span>
                    </div>
                    <div class="timeline-event__body">
                      <h3>{transaction.summary}</h3>
                      {draftCredit && <p class="draft-credit">Rookie-contract value from this entry is credited to drafting in the category report.</p>}
                    </div>
                    <strong class={transaction.values[state.metric] < 0 ? "is-negative" : "is-positive"}>
                      {formatValue(transaction.values[state.metric], state.metric, true)}
                    </strong>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
        {!visible.length && <div class="profile-empty"><h3>No transactions match those filters.</h3></div>}
        {visible.length < filtered.length && (
          <button class="load-more" type="button" onClick={() => setLimit((current) => current + 30)}>
            Show 30 more
          </button>
        )}
      </section>

      <aside class="profile-methodology">
        <strong>How to read this page</strong>
        <p>BPM is shown as the analysis’s cumulative BPM-derived player value, not raw single-season BPM. Whole trades combine every incoming and outgoing row sharing a transaction ID. Missing efficiency ratings remain unscored.</p>
        <span>Snapshot {metadataRunId} · {detail.transactions.length} grouped moves</span>
      </aside>
    </div>
  );
}
