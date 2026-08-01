/**
 * Hyper (Charm) credit balance fetcher.
 *
 * Queries: GET https://hyper.charm.land/v1/credits
 * Auth: Bearer token in Authorization header.
 * Response: { balance: number }
 */

import type { QuotaError } from "./types.js";
import { sanitizeDisplayText } from "./display-sanitize.js";
import { fetchWithTimeout } from "./http.js";
import {
  resolveHyperApiKey,
  hasHyperApiKey,
  type HyperKeySource,
} from "./hyper-auth.js";

export interface HyperCreditResult {
  balance: number;
}

export type HyperResult =
  | {
      success: true;
      balance: number;
    }
  | QuotaError
  | null;

const HYPER_CREDITS_URL = "https://hyper.charm.land/v1/credits";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseHyperCredits(payload: unknown): HyperCreditResult {
  if (!isRecord(payload)) {
    throw new Error("Hyper credits response returned an unexpected response shape");
  }

  const balance = typeof payload.balance === "number" ? payload.balance : 0;
  return { balance };
}

async function fetchHyperCredits(
  apiKey: string,
  requestTimeoutMs?: number,
): Promise<
  | { success: true; data: HyperCreditResult }
  | { success: false; message: string }
> {
  try {
    const response = await fetchWithTimeout(
      HYPER_CREDITS_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
      requestTimeoutMs,
    );

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: parseHyperCredits(await response.json()),
    };
  } catch (err) {
    return {
      success: false,
      message: sanitizeDisplayText(err instanceof Error ? err.message : String(err)),
    };
  }
}

/**
 * Query Hyper credit balance from the API.
 *
 * @returns A typed result with success/error state, or null if no API key is configured.
 */
export async function queryHyperCredits(options: {
  requestTimeoutMs?: number;
} = {}): Promise<HyperResult> {
  const resolved = await resolveHyperApiKey();
  if (!resolved) return null;

  const result = await fetchHyperCredits(resolved.key, options.requestTimeoutMs);

  if (!result.success) {
    return { success: false, error: result.message };
  }

  return {
    success: true,
    balance: result.data.balance,
  };
}

export {
  getHyperKeyDiagnostics,
  hasHyperApiKey as hasHyperApiKeyConfigured,
  type HyperKeySource,
} from "./hyper-auth.js";
