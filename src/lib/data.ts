import executivesJson from "../data/executives.json";
import snapshotJson from "../data/snapshot.json";
import { executivesSchema, snapshotMetadataSchema } from "./schema";
import type { Executive, SnapshotMetadata } from "./types";

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
