import type { TimestampEntry } from "./types.js";

const TIMESTAMP_REGEX =
  /<!--\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)\s*-->/g;

export function parseContentByTimestamp(content: string): TimestampEntry[] {
  const entries: TimestampEntry[] = [];
  const parts = content.split(TIMESTAMP_REGEX);

  for (let i = 1; i < parts.length; i += 2) {
    const timestamp = parts[i];
    const nextContent = parts[i + 1] || "";

    const contentParts = nextContent.split(TIMESTAMP_REGEX);
    const entryContent = contentParts[0].trim();

    if (entryContent) {
      entries.push({
        timestamp,
        content: entryContent,
      });
    }
  }

  return entries;
}

export function extractTimestamps(content: string): string[] {
  const timestamps: string[] = [];
  let match;

  while ((match = TIMESTAMP_REGEX.exec(content)) !== null) {
    timestamps.push(match[1]);
  }

  return timestamps;
}
