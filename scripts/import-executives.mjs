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
    total: parseNumber(record[`${name}_total_${metric}`], `${name} total ${metric}`),
    rating: parseNumber(record[`${name}_rating_${metric}`], `${name} rating ${metric}`, {
      nullable: true,
    }),
    percentiles: {
      rating: parsePercentile(
        record[`${name}_rating_percentile_${metric}`],
        `${name} rating percentile ${metric}`,
      ),
      total: parsePercentile(
        required(record[`${name}_total_percentile_${metric}`], `${name} total percentile ${metric}`),
        `${name} total percentile ${metric}`,
      ),
      overall: parsePercentile(
        record[`${name}_overall_percentile_${metric}`],
        `${name} overall percentile ${metric}`,
      ),
    },
    grades: {
      rating: parseGrade(
        record[`${name}_rating_grade_${metric}`],
        `${name} rating grade ${metric}`,
      ),
      total: required(
        parseGrade(
          record[`${name}_total_grade_${metric}`],
          `${name} total grade ${metric}`,
        ),
        `${name} total grade ${metric}`,
      ),
      overall: parseGrade(
        record[`${name}_overall_grade_${metric}`],
        `${name} overall grade ${metric}`,
      ),
    },
    count: parseNumber(record[countKey], countKey, { integer: true }),
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

const DETAIL_TYPES = new Set(["draft", "trade", "multitrade", "acquisition", "signing"]);

function parseDate(value, label) {
  const date = String(value ?? "").slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid date in ${label}: ${value}`);
  }
  return date;
}

function metricValues(record) {
  return {
    bpm: parseNumber(record.actual_bpm, "actual_bpm"),
    vorp: parseNumber(record.actual_vorp, "actual_vorp"),
  };
}

function uniqueNames(participants) {
  return [...new Set(participants.map(({ name }) => name))];
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? "Unknown assets";
  if (names.length === 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function summarizeTransaction(type, participants) {
  const names = uniqueNames(participants);
  if (type === "draft") return `Drafted ${joinNames(names)}`;
  if (type === "signing") {
    const rookieCredit = participants.some(({ creditedToDraft }) => creditedToDraft);
    return `${rookieCredit ? "Rookie contract for" : "Signed"} ${joinNames(names)}`;
  }
  const incoming = uniqueNames(participants.filter(({ direction }) => direction === "in"));
  const outgoing = uniqueNames(participants.filter(({ direction }) => direction === "out"));
  const clauses = [];
  if (incoming.length) clauses.push(`Added ${joinNames(incoming)}`);
  if (outgoing.length) clauses.push(`Sent out ${joinNames(outgoing)}`);
  return clauses.join("; ") || `Trade involving ${joinNames(names)}`;
}

export function normalizeDetailRecords(records, executive) {
  if (!records.length) throw new Error(`No detail rows for ${executive.slug}`);
  const boundaries = [];
  const groups = new Map();
  let tenureIndex = -1;

  records.forEach((record, rowIndex) => {
    const noId = record.transaction_id === "" || record.transaction_id == null;
    const isBoundary = noId && !record.name && !record.transaction_type;
    if (isBoundary) {
      tenureIndex += 1;
      if (tenureIndex >= executive.teams.length) {
        throw new Error(`Too many tenure boundaries for ${executive.slug}`);
      }
      boundaries.push({
        teamCode: "",
        startDate: parseDate(record.transaction_date, `${executive.slug} tenure row ${rowIndex + 2}`),
        endDate: null,
      });
      return;
    }
    if (tenureIndex < 0) throw new Error(`Missing initial tenure boundary for ${executive.slug}`);
    if (noId) throw new Error(`Transaction without an ID for ${executive.slug} row ${rowIndex + 2}`);
    if (!DETAIL_TYPES.has(record.transaction_type)) {
      throw new Error(`Invalid transaction type for ${executive.slug}: ${record.transaction_type}`);
    }
    const sourceId = parseNumber(record.transaction_id, "transaction_id");
    if (!Number.isInteger(sourceId) || sourceId < 0) {
      throw new Error(`Invalid transaction ID for ${executive.slug}: ${record.transaction_id}`);
    }
    const entry = groups.get(sourceId) ?? {
      sourceId,
      tenureIndex,
      records: [],
      order: rowIndex,
    };
    if (entry.tenureIndex !== tenureIndex) {
      throw new Error(`Transaction ${sourceId} crosses tenures for ${executive.slug}`);
    }
    entry.records.push(record);
    groups.set(sourceId, entry);
  });

  if (!boundaries.length || boundaries.length > executive.teams.length) {
    throw new Error(`Invalid tenure boundary count for ${executive.slug}: ${boundaries.length}`);
  }
  const validTeams = new Set(executive.teams.map(({ code }) => code));
  const assignedTeams = new Set();
  boundaries.forEach((tenure, index) => {
    const counts = new Map();
    for (const group of groups.values()) {
      if (group.tenureIndex !== index) continue;
      for (const record of group.records) {
        const direction = Number(record.transaction_direction);
        if (direction !== 1 || !validTeams.has(record.team)) continue;
        counts.set(record.team, (counts.get(record.team) ?? 0) + 1);
      }
    }
    const rankedCandidates = [...counts.entries()].sort((left, right) => right[1] - left[1]);
    const inferred = rankedCandidates.find(([code]) => !assignedTeams.has(code))?.[0];
    const fallback = executive.teams.find(({ code }) => !assignedTeams.has(code))?.code;
    tenure.teamCode = inferred ?? fallback ?? executive.teams.at(-1).code;
    assignedTeams.add(tenure.teamCode);
  });
  boundaries.forEach((tenure, index) => {
    tenure.endDate = boundaries[index + 1]?.startDate ?? null;
  });

  const transactions = [...groups.values()]
    .sort((left, right) => left.order - right.order)
    .map((group) => {
      const dates = new Set(
        group.records.map((record) => parseDate(record.transaction_date, `${executive.slug} transaction ${group.sourceId}`)),
      );
      const rawTypes = new Set(group.records.map(({ transaction_type }) => transaction_type));
      if (dates.size !== 1 || rawTypes.size !== 1) {
        throw new Error(`Mixed date or type in transaction ${group.sourceId} for ${executive.slug}`);
      }
      const rawType = [...rawTypes][0];
      const type = rawType === "multitrade" || rawType === "acquisition" ? "trade" : rawType;
      const participants = group.records.map((record) => {
        const directionValue = parseNumber(record.transaction_direction, "transaction_direction");
        if (directionValue !== 1 && directionValue !== -1) {
          throw new Error(`Invalid direction in transaction ${group.sourceId} for ${executive.slug}`);
        }
        return {
          name: required(record.name, `participant name for ${executive.slug}`),
          playerHref: record.href || null,
          direction: directionValue === 1 ? "in" : "out",
          teamCode: record.team || null,
          values: metricValues(record),
          creditedToDraft: record.did_bpm_replace_for_draft_transaction
            ? parseBoolean(record.did_bpm_replace_for_draft_transaction, "draft credit")
            : false,
        };
      });
      const last = group.records.at(-1);
      const values = participants.reduce(
        (sum, participant) => ({
          bpm: sum.bpm + participant.values.bpm,
          vorp: sum.vorp + participant.values.vorp,
        }),
        { bpm: 0, vorp: 0 },
      );
      const draftValues = group.records.reduce(
        (sum, record) => ({
          bpm: sum.bpm + parseNumber(record.draft_bpm, "draft_bpm"),
          vorp: sum.vorp + parseNumber(record.draft_vorp, "draft_vorp"),
        }),
        { bpm: 0, vorp: 0 },
      );
      const signingValues = participants.reduce(
        (sum, participant) => participant.creditedToDraft ? sum : ({
          bpm: sum.bpm + participant.values.bpm,
          vorp: sum.vorp + participant.values.vorp,
        }),
        { bpm: 0, vorp: 0 },
      );
      return {
        id: `${executive.slug}-${group.sourceId}`,
        sourceId: group.sourceId,
        date: [...dates][0],
        type,
        tenureTeam: boundaries[group.tenureIndex].teamCode,
        summary: summarizeTransaction(type, participants),
        participants,
        values,
        categoryValues: type === "draft" ? draftValues : type === "signing" ? signingValues : values,
        runningValues: {
          bpm: parseNumber(last.running_bpm, "running_bpm"),
          vorp: parseNumber(last.running_vorp, "running_vorp"),
        },
      };
    });

  const last = records.at(-1);
  for (const metricName of ["bpm", "vorp"]) {
    const detailValue = parseNumber(last[`running_${metricName}`], `final running ${metricName}`);
    const aggregateValue = executive.metrics[metricName].finalValue;
    if (Math.abs(detailValue - aggregateValue) > 0.02) {
      throw new Error(
        `${executive.slug} detail ${metricName} ${detailValue} does not match aggregate ${aggregateValue}`,
      );
    }
  }

  return {
    slug: executive.slug,
    sourceRowCount: records.length,
    tenures: boundaries,
    transactions,
  };
}

function replaceDirectory(target, populate) {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const staging = fs.mkdtempSync(path.join(parent, `.${path.basename(target)}-`));
  populate(staging);
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(staging, target);
}

function writeJsonAtomic(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, target);
}

export function validateDetailFiles(detailFiles, expectedFiles) {
  const missing = expectedFiles.filter((filename) => !detailFiles.includes(filename));
  const extra = detailFiles.filter((filename) => !expectedFiles.includes(filename));
  if (missing.length || extra.length) {
    throw new Error(`Detail file mismatch; missing=${missing.join(",")}, extra=${extra.join(",")}`);
  }
}

export function importExecutives(options) {
  const input = path.resolve(ROOT, required(options.input, "input"));
  const detailsInput = path.resolve(ROOT, required(options["details-dir"], "details-dir"));
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
  const executiveBySlug = new Map(executives.map((executive) => [executive.slug, executive]));
  const detailFiles = fs
    .readdirSync(detailsInput)
    .filter((filename) => filename.endsWith(".csv"))
    .sort();
  const expectedFiles = [...executiveBySlug.keys()].map((slug) => `${slug}.csv`).sort();
  validateDetailFiles(detailFiles, expectedFiles);

  const details = detailFiles.map((filename) => {
    const slug = path.basename(filename, ".csv");
    const detailRecords = parse(fs.readFileSync(path.join(detailsInput, filename), "utf8"), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: false,
    });
    return normalizeDetailRecords(detailRecords, executiveBySlug.get(slug));
  });

  const sourceDetailDirectory = path.join(ROOT, "data/source/executive_details_v2");
  if (path.resolve(detailsInput) !== path.resolve(sourceDetailDirectory)) {
    replaceDirectory(sourceDetailDirectory, (staging) => {
      for (const filename of detailFiles) {
        fs.copyFileSync(path.join(detailsInput, filename), path.join(staging, filename));
      }
    });
  }
  const normalizedDetailDirectory = path.join(ROOT, "src/data/executive-details");
  replaceDirectory(normalizedDetailDirectory, (staging) => {
    for (const detail of details) {
      fs.writeFileSync(
        path.join(staging, `${detail.slug}.json`),
        `${JSON.stringify(detail, null, 2)}\n`,
      );
    }
  });

  const snapshot = {
    runId,
    backendCommit,
    inputTable,
    draftEndYear,
    generatedAt,
    rowCount: executives.length,
    activeCount: executives.filter((executive) => executive.isActive).length,
    sourceFile: path.relative(ROOT, input),
    detailSourceDirectory: path.relative(ROOT, sourceDetailDirectory),
    detailFileCount: details.length,
    transactionCount: details.reduce((sum, detail) => sum + detail.transactions.length, 0),
    detailSourceRowCount: details.reduce((sum, detail) => sum + detail.sourceRowCount, 0),
  };

  writeJsonAtomic(
    path.join(ROOT, "src/data/executives.json"),
    executives,
  );
  writeJsonAtomic(
    path.join(ROOT, "src/data/snapshot.json"),
    snapshot,
  );

  return { executives, details, snapshot };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = importExecutives(readArgs(process.argv.slice(2)));
  process.stdout.write(
    `Imported ${result.snapshot.rowCount} executives, ${result.snapshot.transactionCount} grouped transactions (${result.snapshot.activeCount} active) from ${result.snapshot.runId}.\n`,
  );
}
