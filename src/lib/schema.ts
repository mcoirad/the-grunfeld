import { z } from "zod";

const gradeSchema = z
  .enum([
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
  ])
  .nullable();

const categorySchema = z.object({
  total: z.number(),
  rating: z.number().nullable(),
  percentiles: z.object({
    rating: z.number().min(0).max(100).nullable(),
    total: z.number().min(0).max(100),
    overall: z.number().min(0).max(100).nullable(),
  }),
  grades: z.object({
    rating: gradeSchema,
    total: gradeSchema.unwrap(),
    overall: gradeSchema,
  }),
  count: z.number().int().nonnegative(),
});

const metricSchema = z.object({
  finalValue: z.number(),
  sourceRank: z.number().positive().nullable(),
  categories: z.object({
    draft: categorySchema,
    trade: categorySchema,
    signing: categorySchema,
  }),
});

export const executiveSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+$/i),
  name: z.string().min(1),
  teams: z
    .array(z.object({ code: z.string().min(2), name: z.string().min(2) }))
    .min(1),
  startYear: z.number().int().min(1940).max(2100),
  endYear: z.number().int().min(1940).max(2100),
  isActive: z.boolean(),
  isNoob: z.boolean(),
  portrait: z.string().nullable(),
  metrics: z.object({ bpm: metricSchema, vorp: metricSchema }),
});

export const executivesSchema = z
  .array(executiveSchema)
  .length(173)
  .superRefine((executives, context) => {
    const slugs = new Set(executives.map(({ slug }) => slug));
    if (slugs.size !== executives.length) {
      context.addIssue({ code: "custom", message: "Executive slugs must be unique" });
    }
    const activeCount = executives.filter(({ isActive }) => isActive).length;
    if (activeCount !== 30) {
      context.addIssue({
        code: "custom",
        message: `Expected 30 active executives, received ${activeCount}`,
      });
    }
  });

export const snapshotMetadataSchema = z.object({
  runId: z.string().min(1),
  backendCommit: z.string().regex(/^[a-f0-9]{40}$/),
  inputTable: z.string().min(1),
  draftEndYear: z.number().int().min(1940).max(2100),
  generatedAt: z.iso.datetime(),
  rowCount: z.literal(173),
  activeCount: z.literal(30),
  sourceFile: z.string().min(1),
  detailSourceDirectory: z.string().min(1),
  detailFileCount: z.literal(173),
  transactionCount: z.number().int().positive(),
  detailSourceRowCount: z.number().int().positive(),
});

const metricValuesSchema = z.object({ bpm: z.number(), vorp: z.number() });

const participantSchema = z.object({
  name: z.string().min(1),
  playerHref: z.string().nullable(),
  direction: z.enum(["in", "out"]),
  teamCode: z.string().nullable(),
  values: metricValuesSchema,
  creditedToDraft: z.boolean(),
});

const transactionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.number().int().nonnegative(),
  date: z.iso.date(),
  type: z.enum(["draft", "trade", "signing"]),
  tenureTeam: z.string().min(2),
  summary: z.string().min(1),
  participants: z.array(participantSchema).min(1),
  values: metricValuesSchema,
  categoryValues: metricValuesSchema,
  runningValues: metricValuesSchema,
});

export const executiveDetailSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+$/i),
  sourceRowCount: z.number().int().positive(),
  tenures: z
    .array(
      z.object({
        teamCode: z.string().min(2),
        startDate: z.iso.date(),
        endDate: z.iso.date().nullable(),
      }),
    )
    .min(1),
  transactions: z.array(transactionSchema).min(1),
});
