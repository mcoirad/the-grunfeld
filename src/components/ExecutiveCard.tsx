import type { DetailLevel, MetricName, RankedExecutive } from "../lib/types";

interface ExecutiveCardProps {
  executive: RankedExecutive;
  metric: MetricName;
  detail: DetailLevel;
  basePath: string;
  expanded: boolean;
  onToggle: () => void;
}

const CATEGORY_LABELS = {
  draft: "Drafting",
  trade: "Trades",
  signing: "Signings",
} as const;

function formatValue(value: number | null, maximumFractionDigits = 1) {
  if (value === null) return "Not enough data";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits,
  }).format(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function ExecutiveCard({
  executive,
  metric,
  detail,
  basePath,
  expanded,
  onToggle,
}: ExecutiveCardProps) {
  const selectedMetric = executive.metrics[metric];
  const teamLabel = executive.teams.map(({ code }) => code).join(" · ");
  const tenure = `${executive.startYear}–${executive.isActive ? "present" : executive.endYear}`;
  const detailsId = `report-${executive.slug}`;

  return (
    <article
      class={`executive-card executive-card--${detail}`}
      id={`executive-${executive.slug}`}
      data-testid="executive-card"
    >
      <div class="executive-card__summary">
        <div class="executive-card__rank" aria-label={`Rank ${executive.displayRank}`}>
          <span>{String(executive.displayRank).padStart(2, "0")}</span>
          <small>of {executive.populationSize}</small>
        </div>

        <div class="executive-card__portrait">
          {executive.portrait ? (
            <img
              src={`${basePath}${executive.portrait}`}
              alt={`${executive.name} portrait`}
              loading={executive.displayRank > 5 ? "lazy" : "eager"}
              width="520"
              height="520"
            />
          ) : (
            <span aria-label={`${executive.name} portrait unavailable`}>
              {initials(executive.name)}
            </span>
          )}
        </div>

        <div class="executive-card__identity">
          <p class="eyebrow">{executive.isActive ? "Current executive" : "Front office archive"}</p>
          <h2>{executive.name}</h2>
          <p class="executive-card__team">{teamLabel}</p>
          <p class="executive-card__tenure">{tenure}</p>
        </div>

        <div class="executive-card__score">
          <span>{executive.rankPercentile}</span>
          <small>{metric.toUpperCase()} rank percentile</small>
        </div>

        {detail !== "skim" && (
          <div class="executive-card__grades" aria-label={`${metric.toUpperCase()} report card`}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const category =
                selectedMetric.categories[key as keyof typeof CATEGORY_LABELS];
              return (
                <div class="grade-chip" key={key}>
                  <small>{label}</small>
                  <strong data-empty={!category.grade}>
                    {category.grade ?? "N/A"}
                  </strong>
                </div>
              );
            })}
          </div>
        )}

        {detail !== "deep" && (
          <button
            class="executive-card__toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={onToggle}
          >
            {expanded ? "Close report" : "View report"}
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        )}
      </div>

      {expanded && (
        <div class="executive-card__report" id={detailsId}>
          <div class="report-intro">
            <p class="eyebrow">The front office report</p>
            <p>
              This report separates the player value associated with {executive.name}’s
              drafts, trades, and signings. Percentiles compare the selected record with
              the full executive dataset.
            </p>
          </div>

          <div class="report-grid">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const category =
                selectedMetric.categories[key as keyof typeof CATEGORY_LABELS];
              return (
                <section class="report-category" key={key}>
                  <div class="report-category__heading">
                    <h3>{label}</h3>
                    <span>{category.grade ?? "N/A"}</span>
                  </div>
                  <div class="percentile-track" aria-hidden="true">
                    <span style={{ width: `${category.percentile ?? 0}%` }} />
                  </div>
                  <dl>
                    <div>
                      <dt>Percentile</dt>
                      <dd>
                        {category.percentile === null
                          ? "Not enough data"
                          : `${Math.round(category.percentile)}th`}
                      </dd>
                    </div>
                    <div>
                      <dt>Moves tracked</dt>
                      <dd>{formatValue(category.count, 0)}</dd>
                    </div>
                    <div>
                      <dt>Total value</dt>
                      <dd>{formatValue(category.total)}</dd>
                    </div>
                    <div>
                      <dt>Rating</dt>
                      <dd>{formatValue(category.rating, 2)}</dd>
                    </div>
                  </dl>
                </section>
              );
            })}
          </div>

          {executive.isNoob && (
            <p class="sample-note">
              Small-sample flag: some category ratings are intentionally withheld until
              this executive has enough qualifying moves.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
