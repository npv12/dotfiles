/**
 * Command parsing helper for `/quota_status`.
 *
 * This module provides JSON argument parsing used by the /quota_status
 * slash command and tool handler.
 */

/**
 * Parse optional JSON arguments from a command input string.
 */
export function parseOptionalJsonArgs(input: string | undefined):
  | {
      ok: true;
      value: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
    } {
  const raw = input?.trim() || "";
  if (!raw) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: 'Arguments must be a JSON object (e.g. {"force":true}).' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Failed to parse JSON arguments." };
  }
}
