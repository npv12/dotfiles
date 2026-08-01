import type { QuotaRuntimeContext } from "./quota-runtime-context.js";
import type { QuotaSessionModelContext } from "./quota-runtime-context.js";
import type { QuotaStatusLiveProbe } from "./quota-render-data.js";

import {
  createQuotaProviderRuntimeContext,
  createQuotaRuntimeRequestContext,
} from "./quota-runtime-context.js";
import {
  collectQuotaStatusLiveProbes,
  matchesQuotaProviderCurrentSelection,
} from "./quota-render-data.js";
import { SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE } from "./quota-format-style.js";
import { inspectTuiConfig } from "./tui-config-diagnostics.js";
import { buildQuotaStatusReport } from "./quota-status.js";

/**
 * Shared /quota_status report assembly. Takes an already-resolved runtime
 * context (config + providers + optional session meta) and produces the
 * rendered report. Used by both the server entry (session meta from
 * ctx.session.get) and the TUI entry (session meta from ctx.data.session.get).
 */
export async function buildQuotaStatusReportFromRuntime(params: {
  runtime: QuotaRuntimeContext;
  sessionID?: string;
  sessionMeta?: QuotaSessionModelContext;
  generatedAtMs: number;
}): Promise<string | null> {
  const runtime = params.runtime;
  const runtimeConfig = runtime.config;
  if (!runtimeConfig.enabled) return null;

  const currentSession = params.sessionMeta ?? runtime.session.sessionMeta ?? {};
  const currentModel = currentSession.modelID;
  const currentProviderID = currentSession.providerID;
  const sessionModelLookup: "ok" | "not_found" | "no_session" = !params.sessionID
    ? "no_session"
    : currentModel
      ? "ok"
      : "not_found";

  const isAutoMode = runtimeConfig.enabledProviders === "auto";

  const providers = runtime.providers;
  const providerContext = createQuotaProviderRuntimeContext(runtime);
  const availability = await Promise.all(
    providers.map(async (p) => {
      let ok = false;
      try {
        ok = await p.isAvailable(providerContext);
      } catch {
        ok = false;
      }
      return {
        id: p.id,
        // In auto mode, a provider is effectively "enabled" if it's available.
        enabled: isAutoMode ? ok : runtimeConfig.enabledProviders.includes(p.id),
        available: ok,
        matchesCurrentModel:
          currentModel || currentProviderID
            ? matchesQuotaProviderCurrentSelection({
                provider: p,
                currentModel,
                currentProviderID,
              })
            : undefined,
      };
    }),
  );

  const providersById = new Map(providers.map((provider) => [provider.id, provider] as const));
  const liveProbeProviders = availability.flatMap((item) => {
    if (!item.enabled || !item.available) {
      return [];
    }
    const provider = providersById.get(item.id);
    return provider ? [provider] : [];
  });

  let providerLiveProbes: QuotaStatusLiveProbe[] = [];
  if (liveProbeProviders.length > 0) {
    try {
      providerLiveProbes = await collectQuotaStatusLiveProbes({
        client: runtime.client,
        config: runtimeConfig,
        configMeta: runtime.configMeta,
        request: createQuotaRuntimeRequestContext(runtime),
        formatStyle: SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE,
        providers: liveProbeProviders,
      });
    } catch (error) {
      // Live probes are best-effort; the report still renders availability.
      console.error(
        "[opencode-quota] Failed to collect /quota_status live probes:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const tuiDiagnostics = await inspectTuiConfig({ roots: runtime.roots });

  return await buildQuotaStatusReport({
    tuiDiagnostics,
    configSource: runtime.configMeta.source,
    configPaths: runtime.configMeta.paths,
    globalConfigPaths: runtime.configMeta.globalConfigPaths,
    workspaceConfigPaths: runtime.configMeta.workspaceConfigPaths,
    settingSources: runtime.configMeta.settingSources,
    configIssues: runtime.configMeta.configIssues,
    enabledProviders: runtimeConfig.enabledProviders,
    opencodeGoWindows: runtimeConfig.opencodeGoWindows,
    pricingSnapshotSource: runtimeConfig.pricingSnapshot.source,
    onlyCurrentModel: runtimeConfig.onlyCurrentModel,
    currentModel,
    sessionModelLookup,
    providerAvailability: availability,
    providerLiveProbes,
    generatedAtMs: params.generatedAtMs,
  });
}
