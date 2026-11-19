import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALID_GRADES = new Set([
  "S",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
  "F-",
]);

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    values[key.slice(2)] = value;
    index += 1;
  }
  return values;
}

function required(value, label) {
  if (!value) throw new Error(`Missing required option --${label}`);
  return value;
}

function parseList(value, label) {
  if (!value) return [];
  const items = [...value.matchAll(/'([^']*)'|"([^"]*)"/g)].map(
    (match) => match[1] ?? match[2],
  );
  if (!items.length && value !== "[]") {
    throw new Error(`Could not parse ${label}: ${value}`);
  }
  return items;
}

function parseBoolean(value, label) {
  if (value === "True" || value === "true") return true;
  if (value === "False" || value === "false") return false;
  throw new Error(`Invalid boolean in ${label}: ${value}`);
}

function parseNumber(value, label, { nullable = false, integer = false } = {}) {
  if (value === "" || value === undefined || value === null || value === "nan") {
    if (nullable) return null;
    throw new Error(`Missing number in ${label}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    throw new Error(`Invalid number in ${label}: ${value}`);
  }
  return parsed;
}

function parsePercentile(value, label) {
  const parsed = parseNumber(value, label, { nullable: true });
  if (parsed !== null && (parsed < 0 || parsed > 100)) {
    throw new Error(`Percentile out of range in ${label}: ${value}`);
  }
  return parsed;
}

function parseGrade(value, label) {
  if (!value) return null;
  if (!VALID_GRADES.has(value)) {
    throw new Error(`Invalid grade in ${label}: ${value}`);
  }
  return value;
}

function category(record, name, metric) {
  const countKey = name === "trade" ? "trade_num" : `${name}_num_players`;
  return {
    total: parseNumber(record[`${name}_total_${metric}`], `${name} total ${metric}`, {
      nullable: true,
    }),
    rating: parseNumber(record[`${name}_rating_${metric}`], `${name} rating ${metric}`, {
      nullable: true,
    }),
    percentile: parsePercentile(
      record[`${name}_overall_percentile_${metric}`],
      `${name} percentile ${metric}`,
    ),
    grade: parseGrade(
      record[`${name}_overall_grade_${metric}`],
      `${name} grade ${metric}`,
    ),
    count: parseNumber(record[countKey], countKey, { nullable: true, integer: true }),
  };
}

function metric(record, name) {
  return {
    finalValue: parseNumber(record[`final_${name}`], `final ${name}`),
    sourceRank: parseNumber(record[`${name}_rank`], `${name} rank`, {
      nullable: true,
    }),
    categories: {
      draft: category(record, "draft", name),
      trade: category(record, "trade", name),
      signing: category(record, "signing", name),
    },
  };
}

export function normalizeRecords(records, { portraitDirectory }) {
  const slugs = new Set();
  const executives = records.map((record, index) => {
    const href = required(record.href, `href on CSV row ${index + 2}`);
    const slug = path.basename(href, path.extname(href));
    if (!/^[a-z0-9]+$/i.test(slug)) throw new Error(`Invalid slug: ${slug}`);
    if (slugs.has(slug)) throw new Error(`Duplicate executive slug: ${slug}`);
    slugs.add(slug);

    const codes = parseList(record.team_shortcode, `team_shortcode for ${slug}`);
    const names = parseList(record.team, `team for ${slug}`);
    if (codes.length !== names.length) {
      throw new Error(`Team code/name mismatch for ${slug}`);
    }

    const portraitFile = path.join(portraitDirectory, `${slug}.webp`);
    return {
      slug,
      name: required(record.name, `name for ${slug}`),
      teams: codes.map((code, teamIndex) => ({ code, name: names[teamIndex] })),
      startYear: parseNumber(record.start_year, `start_year for ${slug}`, { integer: true }),
      endYear: parseNumber(record.end_year, `end_year for ${slug}`, { integer: true }),
      isActive: parseBoolean(record.is_active, `is_active for ${slug}`),
      isNoob: parseBoolean(record.is_noob, `is_noob for ${slug}`),
      portrait: fs.existsSync(portraitFile)
        ? `images/executives/${slug}.webp`
        : null,
      metrics: {
        bpm: metric(record, "bpm"),
        vorp: metric(record, "vorp"),
      },
    };
  });

  if (executives.length !== 173) {
    throw new Error(`Expected 173 executives, received ${executives.length}`);
  }
  const activeCount = executives.filter((executive) => executive.isActive).length;
  if (activeCount !== 30) {
    throw new Error(`Expected 30 active executives, received ${activeCount}`);
  }
  return executives.sort((left, right) => left.name.localeCompare(right.name));
}

export function importExecutives(options) {
  const input = path.resolve(ROOT, required(options.input, "input"));
  const runId = required(options["run-id"], "run-id");
  const backendCommit = required(options["backend-commit"], "backend-commit");
  const inputTable = required(options["input-table"], "input-table");
  const draftEndYear = parseNumber(
    required(options["draft-end-year"], "draft-end-year"),
    "draft-end-year",
    { integer: true },
  );
  const generatedAt = required(options["generated-at"], "generated-at");
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new Error(`Invalid --generated-at timestamp: ${generatedAt}`);
  }

  const records = parse(fs.readFileSync(input, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: false,
  });
  const portraitDirectory = path.join(ROOT, "public/images/executives");
  const executives = normalizeRecords(records, { portraitDirectory });
  const snapshot = {
    runId,
    backendCommit,
    inputTable,
    draftEndYear,
    generatedAt,
    rowCount: executives.length,
    activeCount: executives.filter((executive) => executive.isActive).length,
    sourceFile: path.relative(ROOT, input),
  };

  fs.mkdirSync(path.join(ROOT, "src/data"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "src/data/executives.json"),
    `${JSON.stringify(executives, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(ROOT, "src/data/snapshot.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  return { executives, snapshot };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = importExecutives(readArgs(process.argv.slice(2)));
  process.stdout.write(
    `Imported ${result.snapshot.rowCount} executives (${result.snapshot.activeCount} active) from ${result.snapshot.runId}.\n`,
  );
}
