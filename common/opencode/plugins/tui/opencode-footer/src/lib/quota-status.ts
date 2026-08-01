import { stat } from "fs/promises";

import { getAuthPath, getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
import { getOpencodeRuntimeDirs } from "./opencode-runtime-paths.js";
import { resolveOpenAIOAuth } from "./openai.js";
import {
  getPricingSnapshotHealth,
  getPricingRefreshPolicy,
  getPricingSnapshotMeta,
  getPricingSnapshotSource,
  getRuntimePricingRefreshStatePath,
  getRuntimePricingSnapshotPath,
  listProviders,
  getProviderModelCount,
  hasProvider as snapshotHasProvider,
  readPricingRefreshState,
} from "./modelsdev-pricing.js";
import { getProviders } from "../providers/registry.js";
import { getPackageVersion } from "./version.js";
import { getOpenCodeDbStats } from "./opencode-storage.js";
import { aggregateUsage } from "./quota-stats.js";
import { renderPlainTextReport, type ReportKvRow, type ReportSection } from "./report-document.js";
import { totalTokenBuckets } from "./token-buckets.js";
import {
  sanitizeSingleLineDisplaySnippet,
  sanitizeSingleLineDisplayText,
  sanitizeDisplayText,
  sanitizeQuotaProviderResult,
} from "./display-sanitize.js";
import {
  QUOTA_TOAST_SETTING_SOURCE_KEYS,
  type LoadConfigIssue,
  type QuotaToastSettingSources,
} from "./config.js";
import { getQuotaProviderDisplayLabel } from "./provider-metadata.js";
import type { QuotaProviderResult, QuotaToastEntry, QuotaToastError } from "./entries.js";
import { isValueEntry } from "./entries.js";
import type { OpenCodeGoWindow, OpenCodeGoWindowKey, PricingSnapshotSource } from "./types.js";
import {
  getOpenCodeGoConfigDiagnostics,
  resolveOpenCodeGoConfigCached,
  DEFAULT_OPENCODE_GO_CONFIG_CACHE_MAX_AGE_MS,
} from "./opencode-go-config.js";
import { queryOpenCodeGoQuota } from "./opencode-go.js";

type PricingCoverageByProvider = {
  pricedKeysSeen: number;
  mappedMissingKeysSeen: number;
  unpricedKeysSeen: number;
};

const STATUS_SAMPLE_LIMIT = 5;
const STATUS_LIVE_ENTRY_LIMIT = 2;
const STATUS_LIVE_ERROR_LIMIT = 2;
const STATUS_LIVE_ROW_MAX_LENGTH = 120;
const OPENCODE_GO_STATUS_WINDOW_ORDER: OpenCodeGoWindowKey[] = ["rolling", "weekly", "monthly"];
const OPENCODE_GO_STATUS_WINDOW_FIELDS: Record<OpenCodeGoWindowKey, string> = {
  rolling: "rollingUsage",
  weekly: "weeklyUsage",
  monthly: "monthlyUsage",
};

type ProviderLiveProbe = {
  providerId: string;
  result: QuotaProviderResult;
};

function joinOrNone(values: string[]): string {
  return values.length > 0 ? values.join(" | ") : "(none)";
}

function formatOpenCodeGoWindowSelection(windows: OpenCodeGoWindowKey[]): string {
  return windows.join(",");
}

function isDefaultOpenCodeGoStatusWindowSelection(windows: OpenCodeGoWindowKey[]): boolean {
  const selected = new Set(windows);
  return (
    selected.size === OPENCODE_GO_STATUS_WINDOW_ORDER.length &&
    OPENCODE_GO_STATUS_WINDOW_ORDER.every((window) => selected.has(window))
  );
}

function formatOpenCodeGoMissingWindows(windows: OpenCodeGoWindowKey[]): string {
  return windows.map((window) => `${window} (${OPENCODE_GO_STATUS_WINDOW_FIELDS[window]})`).join(", ");
}

function formatOpenCodeGoUsage(window: OpenCodeGoWindow): string {
  return `percent_used=${window.usagePercent} percent_remaining=${window.percentRemaining} reset_in_sec=${window.resetInSec} reset_at=${window.resetTimeIso}`;
}

function formatSettingSources(sources: QuotaToastSettingSources | undefined): string {
  if (!sources) return "(none)";

  const parts = QUOTA_TOAST_SETTING_SOURCE_KEYS.filter(
    (key) => typeof sources[key] === "string" && sources[key].length > 0,
  ).map((key) => `${key}<=${sources[key]}`);

  return parts.length > 0 ? parts.join(" | ") : "(none)";
}

function getConfigPrecedenceLabel(configSource: string): string {
  switch (configSource) {
    case "files":
      return "global defaults -> workspace overrides";
    case "sdk":
      return "sdk fallback (no file-backed config)";
    case "defaults":
      return "built-in defaults only";
    default:
      return configSource;
  }
}

function createKvSection(id: string, title: string, rows: ReportKvRow[]): ReportSection {
  return {
    id,
    title,
    blocks: [{ kind: "kv", rows }],
  };
}

function createLinesSection(id: string, title: string, lines: string[]): ReportSection {
  return {
    id,
    title,
    blocks: [{ kind: "lines", lines }],
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function fmtInt(n: number): string {
  return Math.trunc(n).toLocaleString("en-US");
}

function normalizeLiveProbeText(value: string): string {
  return sanitizeSingleLineDisplayText(value).replace(/:+$/u, "").toLowerCase();
}

function isRedundantLiveProbeDescriptor(providerId: string, value?: string): boolean {
  if (!value) return true;

  const normalized = normalizeLiveProbeText(value);
  if (!normalized) return true;

  return (
    normalized === normalizeLiveProbeText(providerId) ||
    normalized === normalizeLiveProbeText(getQuotaProviderDisplayLabel(providerId))
  );
}

function findProviderLiveProbe(
  providerId: string,
  probes?: ProviderLiveProbe[],
): ProviderLiveProbe | undefined {
  return probes?.find((probe) => probe.providerId === providerId);
}

function appendProviderCompactLiveProbeRows(
  rows: ReportKvRow[],
  providerId: string,
  probes?: ProviderLiveProbe[],
): void {
  appendCompactLiveProbeRows(rows, providerId, findProviderLiveProbe(providerId, probes));
}

function getCompactLiveProbeDescriptor(providerId: string, entry: QuotaToastEntry): string | undefined {
  const candidates = [entry.label, entry.name, entry.group];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const cleaned = sanitizeSingleLineDisplayText(candidate);
    if (!cleaned || isRedundantLiveProbeDescriptor(providerId, cleaned)) {
      continue;
    }
    return cleaned;
  }
  return undefined;
}

function formatCompactLiveProbeEntry(providerId: string, entry: QuotaToastEntry): string {
  const parts: string[] = [];
  const descriptor = getCompactLiveProbeDescriptor(providerId, entry);
  if (descriptor) {
    parts.push(descriptor);
  }

  if (isValueEntry(entry)) {
    parts.push(`value=${sanitizeSingleLineDisplayText(entry.value)}`);
  } else {
    if (entry.right) {
      parts.push(sanitizeSingleLineDisplayText(entry.right));
    }
    const percentRemaining = Number.isFinite(entry.percentRemaining)
      ? Math.max(0, Math.min(100, Math.round(entry.percentRemaining)))
      : 0;
    parts.push(`percent_remaining=${percentRemaining}`);
  }

  if (entry.resetTimeIso) {
    parts.push(`reset_at=${sanitizeSingleLineDisplayText(entry.resetTimeIso)}`);
  }

  return sanitizeSingleLineDisplaySnippet(parts.join(" "), STATUS_LIVE_ROW_MAX_LENGTH);
}

function formatCompactLiveProbeError(providerId: string, error: QuotaToastError): string {
  const label = isRedundantLiveProbeDescriptor(providerId, error.label)
    ? ""
    : sanitizeSingleLineDisplayText(error.label);
  const message = sanitizeSingleLineDisplayText(error.message);
  return sanitizeSingleLineDisplaySnippet(
    label ? `${label}: ${message}` : message,
    STATUS_LIVE_ROW_MAX_LENGTH,
  );
}

function appendCompactLiveProbeRows(
  rows: ReportKvRow[],
  providerId: string,
  probe?: ProviderLiveProbe,
): void {
  if (!probe) return;

  const result = sanitizeQuotaProviderResult(probe.result);
  const entryCount = Math.min(result.entries.length, STATUS_LIVE_ENTRY_LIMIT);
  const errorCount = Math.min(result.errors.length, STATUS_LIVE_ERROR_LIMIT);
  const state =
    result.entries.length > 0 ? "success" : result.errors.length > 0 ? "error" : "no_data";

  rows.push({ key: "live_probe", value: state });

  for (let index = 0; index < entryCount; index += 1) {
    rows.push({
      key: `live_entry_${index + 1}`,
      value: formatCompactLiveProbeEntry(providerId, result.entries[index]!),
    });
  }

  for (let index = 0; index < errorCount; index += 1) {
    rows.push({
      key: `live_error_${index + 1}`,
      value: formatCompactLiveProbeError(providerId, result.errors[index]!),
    });
  }

  const suppressedCount =
    Math.max(0, result.entries.length - entryCount) + Math.max(0, result.errors.length - errorCount);
  if (suppressedCount > 0) {
    rows.push({
      key: "live_more",
      value: `+${suppressedCount} additional rows suppressed`,
    });
  }
}

function computePricingCoverageFromAgg(agg: Awaited<ReturnType<typeof aggregateUsage>>): {
  byProvider: Map<string, PricingCoverageByProvider>;
  totals: { pricedKeysSeen: number; mappedMissingKeysSeen: number; unpricedKeysSeen: number };
} {
  const byProvider = new Map<string, PricingCoverageByProvider>();
  let pricedKeysSeen = 0;
  let mappedMissingKeysSeen = 0;
  let unpricedKeysSeen = 0;

  // Priced keys seen in history
  for (const row of agg.byModel) {
    const p = row.key.provider;
    const existing = byProvider.get(p) ?? {
      pricedKeysSeen: 0,
      mappedMissingKeysSeen: 0,
      unpricedKeysSeen: 0,
    };
    existing.pricedKeysSeen += 1;
    byProvider.set(p, existing);
    pricedKeysSeen += 1;
  }

  // Keys that mapped to an official provider/model but were missing pricing
  for (const row of agg.unknown) {
    const p = row.key.mappedProvider;
    if (!p || !row.key.mappedModel) continue;
    const existing = byProvider.get(p) ?? {
      pricedKeysSeen: 0,
      mappedMissingKeysSeen: 0,
      unpricedKeysSeen: 0,
    };
    existing.mappedMissingKeysSeen += 1;
    byProvider.set(p, existing);
    mappedMissingKeysSeen += 1;
  }

  // Mapped keys that we explicitly consider unpriced
  for (const row of agg.unpriced) {
    const p = row.key.mappedProvider;
    const existing = byProvider.get(p) ?? {
      pricedKeysSeen: 0,
      mappedMissingKeysSeen: 0,
      unpricedKeysSeen: 0,
    };
    existing.unpricedKeysSeen += 1;
    byProvider.set(p, existing);
    unpricedKeysSeen += 1;
  }

  return { byProvider, totals: { pricedKeysSeen, mappedMissingKeysSeen, unpricedKeysSeen } };
}

function supportedProviderPricingRow(params: {
  id: string;
  agg: Awaited<ReturnType<typeof aggregateUsage>>;
  snapshotProviders: string[];
}): { id: string; pricing: "yes" | "partial" | "no"; notes: string } {
  const id = params.id;

  if (id === "opencode-go") {
    return {
      id,
      pricing: "no",
      notes: "subscription percentage quota via dashboard scraping (not token-priced)",
    };
  }

  // Providers that correspond directly to models.dev providers.
  if (params.snapshotProviders.includes(id)) {
    return { id, pricing: "yes", notes: "models.dev snapshot provider" };
  }

  // Connector providers: pricing exists when model IDs can be mapped into snapshot pricing keys.
  // Use local history as the source of truth.
  const hasAnyUsage = params.agg.bySourceProvider.some((p) => p.providerID === id);
  const hasAnyUnknown = params.agg.unknown.some((u) => u.key.sourceProviderID === id);

  // Note: agg.byModel is already mapped to official pricing keys, not source provider IDs.
  // So for connector providers we infer pricing availability based on whether we saw usage at all
  // and whether it was mappable.
  if (!hasAnyUsage && !hasAnyUnknown) {
    return { id, pricing: "no", notes: "no local usage observed" };
  }

  if (hasAnyUnknown) {
    return {
      id,
      pricing: "partial",
      notes: "some models not in snapshot (see unpriced_models / unknown_pricing)",
    };
  }

  return {
    id,
    pricing: "yes",
    notes: "model IDs map into snapshot pricing",
  };
}

export async function buildQuotaStatusReport(params: {
  configSource: string;
  configPaths: string[];
  globalConfigPaths?: string[];
  workspaceConfigPaths?: string[];
  settingSources?: QuotaToastSettingSources;
  configIssues?: LoadConfigIssue[];
  /** @deprecated compatibility only; not rendered */
  networkSettingSources?: Record<string, string>;
  tuiDiagnostics?: {
    workspaceRoot: string;
    configRoot: string;
    configured: boolean;
    inferredSelectedPath: string | null;
    presentPaths: string[];
    candidatePaths: string[];
    quotaPluginConfigured: boolean;
    quotaPluginConfigPaths: string[];
  };
  enabledProviders: string[] | "auto";
  opencodeGoWindows?: OpenCodeGoWindowKey[];
  pricingSnapshotSource: PricingSnapshotSource;
  onlyCurrentModel: boolean;
  currentModel?: string;
  /** Whether a session was available for model lookup */
  sessionModelLookup?: "ok" | "not_found" | "no_session";
  providerAvailability: Array<{
    id: string;
    enabled: boolean;
    available: boolean;
    matchesCurrentModel?: boolean;
  }>;
  providerLiveProbes?: ProviderLiveProbe[];
  generatedAtMs?: number;
}): Promise<string> {
  const version = await getPackageVersion();
  const v = version ?? "unknown";
  const modelDisplay = params.currentModel
    ? params.currentModel
    : params.sessionModelLookup === "not_found"
      ? "(error: session.get returned no modelID)"
      : params.sessionModelLookup === "no_session"
        ? "(no session available)"
        : "(unknown)";
  const sections: ReportSection[] = [];

  // === toast diagnostics ===
  const toastLines: string[] = [
    `- configSource: ${params.configSource}`,
    `- configPaths: ${joinOrNone(params.configPaths)}`,
    `- precedence: ${getConfigPrecedenceLabel(params.configSource)}`,
    `- global_config_paths: ${joinOrNone(params.globalConfigPaths ?? [])}`,
    `- workspace_config_paths: ${joinOrNone(params.workspaceConfigPaths ?? [])}`,
    `- setting_sources: ${formatSettingSources(params.settingSources)}`,
    `- enabledProviders: ${params.enabledProviders === "auto" ? "(auto)" : params.enabledProviders.length ? params.enabledProviders.join(",") : "(none)"}`,
    `- onlyCurrentModel: ${params.onlyCurrentModel ? "true" : "false"}`,
    `- currentModel: ${modelDisplay}`,
  ];
  if (params.configIssues?.length) {
    toastLines.push("- config_errors:");
    for (const issue of params.configIssues) {
      toastLines.push(
        `  - ${sanitizeSingleLineDisplayText(issue.path)} ${sanitizeSingleLineDisplayText(issue.key)}: ${sanitizeSingleLineDisplayText(issue.message)}`,
      );
    }
  }
  if (params.tuiDiagnostics) {
    toastLines.push("");
    toastLines.push("tui:");
    toastLines.push(`- workspace_root: ${params.tuiDiagnostics.workspaceRoot}`);
    toastLines.push(`- config_root: ${params.tuiDiagnostics.configRoot}`);
    toastLines.push(`- config_configured: ${params.tuiDiagnostics.configured ? "true" : "false"}`);
    toastLines.push(
      `- inferred_selected_config_path: ${params.tuiDiagnostics.inferredSelectedPath ?? "(none)"}`,
    );
    toastLines.push(`- present_config_paths: ${joinOrNone(params.tuiDiagnostics.presentPaths)}`);
    toastLines.push(`- candidate_config_paths: ${joinOrNone(params.tuiDiagnostics.candidatePaths)}`);
    toastLines.push(
      `- quota_plugin_configured: ${params.tuiDiagnostics.quotaPluginConfigured ? "true" : "false"}`,
    );
    toastLines.push(`- quota_plugin_paths: ${joinOrNone(params.tuiDiagnostics.quotaPluginConfigPaths)}`);
  }
  toastLines.push("- providers:");
  for (const p of params.providerAvailability) {
    const bits: string[] = [];
    bits.push(p.enabled ? "enabled" : "disabled");
    bits.push(p.available ? "available" : "unavailable");
    if (p.matchesCurrentModel !== undefined) {
      bits.push(`matchesCurrentModel=${p.matchesCurrentModel ? "yes" : "no"}`);
    }
    toastLines.push(`  - ${p.id}: ${bits.join(" ")}`);
  }
  sections.push(createLinesSection("toast", "toast:", toastLines));

  // === paths ===
  const pathsRows: ReportKvRow[] = [];
  const runtime = getOpencodeRuntimeDirs();
  pathsRows.push({
    key: "opencode_dirs",
    value: `data=${runtime.dataDir} config=${runtime.configDir} cache=${runtime.cacheDir} state=${runtime.stateDir}`,
  });
  const authCandidates = getAuthPaths();
  const authPresent: string[] = [];
  await Promise.all(
    authCandidates.map(async (p) => {
      try {
        await stat(p);
        authPresent.push(p);
      } catch {
        // ignore missing/unreadable
      }
    }),
  );
  pathsRows.push({
    key: "auth.json",
    value: `preferred=${getAuthPath()} present=${joinOrNone(authPresent)} candidates=${joinOrNone(authCandidates)}`,
  });

  const authData = await readAuthFileCached({ maxAgeMs: 5_000 });
  const openaiAuth = resolveOpenAIOAuth(authData);
  sections.push(createKvSection("paths", "paths:", pathsRows));

  // === openai ===
  const openaiRows: ReportKvRow[] = [
    { key: "auth_configured", value: openaiAuth.state === "configured" ? "true" : "false" },
    {
      key: "auth_source",
      value: openaiAuth.state === "configured" ? openaiAuth.sourceKey : "(none)",
    },
  ];
  const openaiTokenStatus =
    openaiAuth.state !== "configured"
      ? "(none)"
      : openaiAuth.expiresAt && openaiAuth.expiresAt < Date.now()
        ? "expired"
        : "valid";
  openaiRows.push({ key: "token_status", value: openaiTokenStatus });
  openaiRows.push({
    key: "token_expires_at",
    value:
      openaiAuth.state === "configured" && openaiAuth.expiresAt
        ? new Date(openaiAuth.expiresAt).toISOString()
        : "(none)",
  });
  openaiRows.push({
    key: "account_email",
    value:
      openaiAuth.state === "configured" && openaiAuth.email
        ? sanitizeDisplayText(openaiAuth.email)
        : "(none)",
  });
  openaiRows.push({
    key: "account_id",
    value:
      openaiAuth.state === "configured" && openaiAuth.accountId
        ? sanitizeDisplayText(openaiAuth.accountId)
        : "(none)",
  });
  appendProviderCompactLiveProbeRows(openaiRows, "openai", params.providerLiveProbes);
  sections.push(createKvSection("openai", "openai:", openaiRows));

  // === opencode_go ===
  const openCodeGoRows: ReportKvRow[] = [];
  const openCodeGoDiag = await getOpenCodeGoConfigDiagnostics();
  openCodeGoRows.push({ key: "config_state", value: openCodeGoDiag.state });
  openCodeGoRows.push({ key: "config_source", value: openCodeGoDiag.source ?? "(none)" });
  if (openCodeGoDiag.missing) {
    openCodeGoRows.push({ key: "config_missing", value: openCodeGoDiag.missing });
  }
  if (openCodeGoDiag.error) {
    openCodeGoRows.push({ key: "config_error", value: sanitizeDisplayText(openCodeGoDiag.error) });
  }
  openCodeGoRows.push({ key: "config_checked_paths", value: joinOrNone(openCodeGoDiag.checkedPaths) });
  const openCodeGoSelectedWindows = params.opencodeGoWindows ?? OPENCODE_GO_STATUS_WINDOW_ORDER;
  openCodeGoRows.push({
    key: "selected_windows",
    value: formatOpenCodeGoWindowSelection(openCodeGoSelectedWindows),
  });
  if (openCodeGoDiag.state === "configured") {
    const openCodeGoConfig = await resolveOpenCodeGoConfigCached({
      maxAgeMs: DEFAULT_OPENCODE_GO_CONFIG_CACHE_MAX_AGE_MS,
    });
    if (openCodeGoConfig.state !== "configured") {
      openCodeGoRows.push({
        key: "live_fetch_error",
        value: "OpenCode Go config became unavailable before fetch",
      });
    } else {
      const openCodeGoQuota = await queryOpenCodeGoQuota(
        openCodeGoConfig.config.workspaceId,
        openCodeGoConfig.config.authCookie,
      );
      if (!openCodeGoQuota) {
        openCodeGoRows.push({ key: "live_fetch_error", value: "OpenCode Go returned null" });
      } else if (!openCodeGoQuota.success) {
        openCodeGoRows.push({ key: "live_fetch_error", value: openCodeGoQuota.error });
      } else {
        for (const window of OPENCODE_GO_STATUS_WINDOW_ORDER) {
          const usage = openCodeGoQuota[window];
          if (!usage) continue;

          openCodeGoRows.push({
            key: `${window}_usage`,
            value: formatOpenCodeGoUsage(usage),
          });
        }

        const missingSelectedWindows = openCodeGoSelectedWindows.filter((window) => !openCodeGoQuota[window]);
        if (
          missingSelectedWindows.length > 0 &&
          !isDefaultOpenCodeGoStatusWindowSelection(openCodeGoSelectedWindows)
        ) {
          openCodeGoRows.push({
            key: "live_fetch_error",
            value: `Selected OpenCode Go dashboard window(s) missing: ${formatOpenCodeGoMissingWindows(missingSelectedWindows)}`,
          });
        }
      }
    }
  }
  appendProviderCompactLiveProbeRows(openCodeGoRows, "opencode-go", params.providerLiveProbes);
  sections.push(createKvSection("opencode_go", "opencode_go:", openCodeGoRows));

  // === storage scan ===
  const dbStats = await getOpenCodeDbStats();
  sections.push(
    createKvSection("storage", "storage:", [
      { key: "sessions_in_db", value: fmtInt(dbStats.sessionCount) },
      { key: "messages_in_db", value: fmtInt(dbStats.messageCount) },
      { key: "assistant_messages_in_db", value: fmtInt(dbStats.assistantMessageCount) },
    ]),
  );

  // === pricing snapshot ===
  const agg = await aggregateUsage({});
  const meta = getPricingSnapshotMeta();
  const providers = listProviders();
  const coverage = computePricingCoverageFromAgg(agg);
  const refreshPolicy = getPricingRefreshPolicy();
  const autoRefreshDays = Math.round(refreshPolicy.maxAgeMs / (24 * 60 * 60 * 1000));
  const health = getPricingSnapshotHealth({
    maxAgeMs: refreshPolicy.maxAgeMs,
  });
  const snapshotSource = getPricingSnapshotSource();
  const runtimeSnapshotPath = getRuntimePricingSnapshotPath();
  const refreshStatePath = getRuntimePricingRefreshStatePath();
  const pricingRefreshState = await readPricingRefreshState();

  const pricingRows: ReportKvRow[] = [
    {
      key: "pricing",
      value: `source=${meta.source} active_source=${snapshotSource} generated_at=${new Date(meta.generatedAt).toISOString()} units=${meta.units}`,
    },
    {
      key: "selection",
      value: `configured=${params.pricingSnapshotSource} active=${snapshotSource}`,
    },
  ];
  if (params.pricingSnapshotSource === "bundled") {
    pricingRows.push({
      key: "selection_note",
      value: "bundled config pins the packaged snapshot and ignores runtime refresh for active pricing",
    });
  } else if (params.pricingSnapshotSource === "runtime" && snapshotSource !== "runtime") {
    pricingRows.push({
      key: "selection_note",
      value:
        "runtime config requested the local runtime snapshot, but bundled fallback is active because no valid runtime snapshot is available",
    });
  }
  pricingRows.push({
    key: "runtime_paths",
    value: `snapshot=${runtimeSnapshotPath} refresh_state=${refreshStatePath}`,
  });
  pricingRows.push({
    key: "staleness",
    value: `age_ms=${fmtInt(health.ageMs)} max_age_ms=${fmtInt(health.maxAgeMs)} stale=${health.stale ? "true" : "false"}`,
  });
  pricingRows.push({
    key: "refresh_policy",
    value: `auto_refresh_days=${fmtInt(autoRefreshDays)}`,
  });
  if (pricingRefreshState) {
    pricingRows.push({
      key: "refresh",
      value: `last_attempt_at=${pricingRefreshState.lastAttemptAt ? new Date(pricingRefreshState.lastAttemptAt).toISOString() : "(none)"} last_success_at=${pricingRefreshState.lastSuccessAt ? new Date(pricingRefreshState.lastSuccessAt).toISOString() : "(none)"} last_failure_at=${pricingRefreshState.lastFailureAt ? new Date(pricingRefreshState.lastFailureAt).toISOString() : "(none)"} last_result=${pricingRefreshState.lastResult ?? "(none)"}`,
    });
    if (pricingRefreshState.lastError) {
      pricingRows.push({ key: "refresh_error", value: pricingRefreshState.lastError });
    }
  } else {
    pricingRows.push({ key: "refresh", value: "(no runtime refresh state yet)" });
  }
  pricingRows.push({ key: "providers", value: providers.join(",") });
  pricingRows.push({
    key: "coverage_seen",
    value: `priced_keys=${fmtInt(coverage.totals.pricedKeysSeen)} mapped_but_missing=${fmtInt(coverage.totals.mappedMissingKeysSeen)} unpriced_keys=${fmtInt(coverage.totals.unpricedKeysSeen)}`,
  });
  for (const p of providers) {
    const c = coverage.byProvider.get(p) ?? {
      pricedKeysSeen: 0,
      mappedMissingKeysSeen: 0,
      unpricedKeysSeen: 0,
    };
    pricingRows.push({
      key: p,
      value: `models=${fmtInt(getProviderModelCount(p))} priced_models_seen=${fmtInt(c.pricedKeysSeen)} mapped_but_missing_models_seen=${fmtInt(c.mappedMissingKeysSeen)} unpriced_models_seen=${fmtInt(c.unpricedKeysSeen)}`,
      indent: 1,
    });
  }
  sections.push(createKvSection("pricing_snapshot", "pricing_snapshot:", pricingRows));

  // === supported providers pricing ===
  const supported = getProviders().map((p) => p.id);
  const supportedRows: ReportKvRow[] = supported.map((id) => {
    const row = supportedProviderPricingRow({ id, agg, snapshotProviders: providers });
    return {
      key: row.id,
      value: `pricing=${row.pricing} (${row.notes})`,
    };
  });
  sections.push(
    createKvSection("supported_providers_pricing", "supported_providers_pricing:", supportedRows),
  );

  // === unpriced models ===
  const unpricedRows: ReportKvRow[] = [];
  if (agg.unpriced.length === 0) {
    unpricedRows.push({ key: "none" });
  } else {
    unpricedRows.push({
      key: "keys",
      value: `${fmtInt(agg.unpriced.length)} tokens_total=${fmtInt(totalTokenBuckets(agg.totals.unpriced))}`,
    });
    for (const row of agg.unpriced.slice(0, STATUS_SAMPLE_LIMIT)) {
      const src = `${row.key.sourceProviderID}/${row.key.sourceModelID}`;
      const mapped = `${row.key.mappedProvider}/${row.key.mappedModel}`;
      unpricedRows.push({
        key: src,
        value: `mapped=${mapped} tokens=${fmtInt(totalTokenBuckets(row.tokens))} msgs=${fmtInt(row.messageCount)} reason=${row.key.reason}`,
      });
    }
    if (agg.unpriced.length > STATUS_SAMPLE_LIMIT) {
      unpricedRows.push({ key: `... (${fmtInt(agg.unpriced.length - STATUS_SAMPLE_LIMIT)} more)` });
    }
  }
  sections.push(createKvSection("unpriced_models", "unpriced_models:", unpricedRows));

  // === unknown pricing ===
  const unknownRows: ReportKvRow[] = [];
  if (agg.unknown.length === 0) {
    unknownRows.push({ key: "none" });
  } else {
    unknownRows.push({
      key: "keys",
      value: `${fmtInt(agg.unknown.length)} tokens_total=${fmtInt(totalTokenBuckets(agg.totals.unknown))}`,
    });
    for (const row of agg.unknown.slice(0, STATUS_SAMPLE_LIMIT)) {
      const src = `${row.key.sourceProviderID}/${row.key.sourceModelID}`;
      const mappedBase =
        row.key.mappedProvider && row.key.mappedModel
          ? `${row.key.mappedProvider}/${row.key.mappedModel}`
          : "(none)";
      const candidates =
        row.key.providerCandidates && row.key.providerCandidates.length > 0
          ? ` candidates=${row.key.providerCandidates.join(",")}`
          : "";
      unknownRows.push({
        key: src,
        value: `mapped=${mappedBase}${candidates} tokens=${fmtInt(totalTokenBuckets(row.tokens))} msgs=${fmtInt(row.messageCount)}`,
      });
    }
    if (agg.unknown.length > STATUS_SAMPLE_LIMIT) {
      unknownRows.push({ key: `... (${fmtInt(agg.unknown.length - STATUS_SAMPLE_LIMIT)} more)` });
    }
  }
  sections.push(createKvSection("unknown_pricing", "unknown_pricing:", unknownRows));

  return renderPlainTextReport({
    heading: {
      title: `Quota Status (opencode-quota v${v}) (/quota_status)`,
      generatedAtMs: params.generatedAtMs,
    },
    sections,
  });
}
