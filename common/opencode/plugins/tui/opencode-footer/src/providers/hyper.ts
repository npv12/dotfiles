/**
 * Hyper (Charm) provider wrapper.
 *
 * Queries the Hyper /v1/credits endpoint and displays the
 * remaining credit balance as a value entry.
 */

import type {
  QuotaProvider,
  QuotaProviderContext,
  QuotaProviderResult,
  QuotaToastEntry,
} from "../lib/entries.js";
import { hasHyperApiKeyConfigured, queryHyperCredits } from "../lib/hyper.js";
import { attemptedResult, mapNullableProviderResult } from "./result-helpers.js";

function buildHyperEntries(
  result: Extract<NonNullable<Awaited<ReturnType<typeof queryHyperCredits>>>, { success: true }>,
): QuotaToastEntry[] {
  return [
    {
      kind: "value",
      name: "Hyper Credits",
      group: "Charm Hyper",
      label: "Balance:",
      value: String(result.balance),
    },
  ];
}

export const hyperProvider: QuotaProvider = {
  id: "hyper",

  async isAvailable(_ctx: QuotaProviderContext): Promise<boolean> {
    return await hasHyperApiKeyConfigured();
  },

  matchesCurrentModel(_model: string): boolean {
    return false;
  },

  async fetch(ctx: QuotaProviderContext): Promise<QuotaProviderResult> {
    const result = await queryHyperCredits({
      requestTimeoutMs: ctx.config?.requestTimeoutMs,
    });

    return mapNullableProviderResult(result, {
      errorLabel: "Charm Hyper",
      onSuccess: (result) => attemptedResult(buildHyperEntries(result)),
    });
  },
};
