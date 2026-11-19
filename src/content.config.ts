import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const executives = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/executives" }),
  schema: z.object({
    slug: z.string(),
    dek: z.string().optional(),
    updatedAt: z.coerce.date(),
  }),
});

export const collections = { executives };
