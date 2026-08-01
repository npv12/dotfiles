import type { QuotaToastEntry } from "./entries.js";
import { formatGroupedHeader } from "./grouped-header-format.js";

export function normalizeSingleWindowLabelText(value?: string): string {
  return value?.trim().replace(/:+$/u, "").trim() ?? "";
}

export function extractSingleWindowWindowLabel(text: string): string | null {
  const lower = normalizeSingleWindowLabelText(text).toLowerCase();
  if (!lower) return null;

  if (/\b(?:rpm|per minute|minute|minutes)\b/u.test(lower)) return "RPM";
  if (/\b(?:rolling|5h|5 h|5-hour|5 hour|five-hour|five hour)\b/u.test(lower)) return "5h";
  if (/\b(?:hourly|1h|1 h|1-hour|1 hour|hour)\b/u.test(lower)) return "Hourly";
  if (/\b(?:7d|7 d|7-day|7 day|weekly|week)\b/u.test(lower)) return "Weekly";
  if (/\b(?:daily|1d|1 d|1-day|1 day|day)\b/u.test(lower)) return "Daily";
  if (/\b(?:monthly|month)\b/u.test(lower)) return "Monthly";
  if (/\b(?:yearly|annual|annually|year)\b/u.test(lower)) return "Yearly";
  if (/\bmcp\b/u.test(lower)) return "MCP";
  if (/\bcode review\b/u.test(lower)) return "Code Review";

  return null;
}

export function buildSingleWindowPercentEntryDisplayName(entry: QuotaToastEntry): string {
  const name = entry.name.trim();
  const group = entry.group?.trim();
  const windowLabel =
    extractSingleWindowWindowLabel(entry.label ?? "") ??
    extractSingleWindowWindowLabel(entry.name);

  if (name.startsWith("[")) {
    if (!windowLabel) return name;
    return name.toLowerCase().includes(windowLabel.toLowerCase()) ? name : `${name} ${windowLabel}`;
  }

  if (group) {
    const provider = formatGroupedHeader(group);
    return windowLabel ? `${provider} ${windowLabel}` : provider;
  }

  return name;
}
