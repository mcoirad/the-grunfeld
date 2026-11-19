# Front Office, Ranked

The Grunfeld is a static Astro site that ranks NBA executives by the player value connected to their drafts, trades, and signings. Every executive has a profile with a cumulative performance chart, category comparisons, and a grouped transaction history.

## Local development

This project requires a supported Node release from `package.json`.

```sh
npm ci
npm run dev
```

Astro serves the site at `http://localhost:4321/the-grunfeld/` to match its GitHub Pages base path.

Useful checks:

```sh
npm run check
npm test
npm run build
npm run test:e2e
npm run test:lighthouse
```

## Refreshing the data snapshot

V1 reads a committed, validated snapshot. It does not connect to BigQuery at build time or in the browser.

```sh
npm run data:refresh -- \
  --input data/source/executive_stats_v2.csv \
  --details-dir data/source/executive_details_v2 \
  --run-id analysis-v2-first-20261118 \
  --backend-commit 98ab7e84f6a949ef17bf802dfa28992e69df3232 \
  --input-table the-grunfeld.executive_data.player_advanced_stats_v2 \
  --draft-end-year 2026 \
  --generated-at 2026-11-18T00:00:00Z
```

The importer writes `src/data/executives.json`, `src/data/snapshot.json`, and one normalized detail document per executive under `src/data/executive-details`. When `--details-dir` points outside the committed source directory, it also refreshes the checked-in `data/source/executive_details_v2` snapshot. It groups whole trades, preserves tenure boundaries, validates every metric and transaction, and verifies each final running score against the aggregate executive record.

To refresh directly from a completed backend analysis run, point `--details-dir` at that run’s `exec_data2` directory—not `exec_data`—and keep the remaining provenance arguments aligned with the same run.

The backend analysis publisher still emits Jekyll-shaped artifacts and must not target this Astro branch.

## Portraits

The optimized WebP portraits under `public/images/executives` were derived from the previous frontend’s checked-in images. The source files were removed from this branch after conversion. Executives without a matching portrait receive a branded initials fallback.

To prepare a future portrait batch from an external source directory:

```sh
node scripts/prepare-portraits.mjs /absolute/path/to/headshots
```

## Deployment

Pull requests run validation and build the static site. GitHub Pages deploys only from `master`, so this branch cannot alter the live site until it is explicitly reviewed and merged.

This is an independent fan project and is not affiliated with The Ringer, the NBA, or any NBA team.
