/**
 * Provider registry.
 *
 * Add new providers here; everything else should stay provider-agnostic.
 *
 * Trimmed port: opencode-go, hyper, and openai (covers Codex models/quota).
 * All other upstream providers were dropped at port time — see README.
 */

import type { QuotaProvider } from "../lib/entries.js";
import { openaiProvider } from "./openai.js";
import { opencodeGoProvider } from "./opencode-go.js";
import { hyperProvider } from "./hyper.js";

export function getProviders(): QuotaProvider[] {
  // Order here defines display ordering.
  return [openaiProvider, opencodeGoProvider, hyperProvider];
}
