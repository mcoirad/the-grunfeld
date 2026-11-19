import executivesJson from "../data/executives.json";
import snapshotJson from "../data/snapshot.json";
import {
  executiveDetailSchema,
  executivesSchema,
  snapshotMetadataSchema,
} from "./schema";
import type { Executive, ExecutiveDetail, SnapshotMetadata } from "./types";

const detailModules = import.meta.glob<{ default: unknown }>(
  "../data/executive-details/*.json",
  { eager: true },
);

export interface ExecutiveSnapshot {
  executives: Executive[];
  metadata: SnapshotMetadata;
}

export function loadExecutiveSnapshot(): ExecutiveSnapshot {
  const executives = executivesSchema.parse(executivesJson) as Executive[];
  const metadata = snapshotMetadataSchema.parse(snapshotJson) as SnapshotMetadata;
  if (metadata.rowCount !== executives.length) {
    throw new Error("Snapshot metadata does not match executive data");
  }
  return { executives, metadata };
}

export function loadExecutiveDetail(slug: string): ExecutiveDetail {
  const key = `../data/executive-details/${slug}.json`;
  const module = detailModules[key];
  if (!module) throw new Error(`No executive detail snapshot for ${slug}`);
  return executiveDetailSchema.parse(module.default) as ExecutiveDetail;
}
