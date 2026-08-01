/**
 * OpenCode Quota — server plugin surface (opencode2 Promise-plugin API).
 *
 * Ported from the v1 `QuotaToastPlugin` (server entry of @npv12/opencode-quota).
 * The v1 server did: toasts on session.idle/compacted/question (via
 * client.tui.showToast), the /quota_status slash command + quota_status tool,
 * deferred toast retries, and local request-plan quota recording for
 * qwen/alibaba/cursor. opencode2 server plugins have no toast channel, slash
 * commands are TUI-side (keymap), and the trimmed provider set (opencode-go,
 * hyper, openai) has no local request-plan quota — so this surface keeps only
 * the quota_status tool, with the report injected into the transcript via
 * ctx.session.synthetic (the v2 equivalent of the v1 noReply + ignored parts
 * injection). Toasts and the /quota_status command live in the TUI entry
 * (src/tui.tsx).
 */

import type { PluginContext, ToolInfo } from "./context.js";
import type { LoadConfigMeta } from "./lib/config.js";
import { createLoadConfigMeta } from "./lib/config.js";
import { DEFAULT_CONFIG, type QuotaToastConfig } from "./lib/types.js";
import { resolveQuotaRuntimeContext } from "./lib/quota-runtime-context.js";
import { findGitWorktreeRoot, getEffectiveConfigRoot } from "./lib/config-file-utils.js";
import { createQuotaClientAdapter } from "./lib/quota-client-adapter.js";
import { maybeRefreshPricingSnapshot } from "./lib/modelsdev-pricing.js";
import { buildQuotaStatusReportFromRuntime } from "./lib/status-report.js";
import { sanitizeDisplayText } from "./lib/display-sanitize.js";

const STATUS_SERVICE = "opencode-quota";

interface QuotaPluginState {
  config: QuotaToastConfig;
  configMeta: LoadConfigMeta;
  configLoaded: boolean;
  configInFlight: Promise<void> | null;
}

function createPluginState(): QuotaPluginState {
  return {
    config: DEFAULT_CONFIG,
    configMeta: createLoadConfigMeta(),
    configLoaded: false,
    configInFlight: null,
  };
}

export { createQuotaClientAdapter } from "./lib/quota-client-adapter.js";

function getPluginRuntimeRootHints() {
  const cwd = process.cwd();
  const workspaceRoot = findGitWorktreeRoot(cwd) ?? cwd;
  const configRoot = getEffectiveConfigRoot(workspaceRoot);
  return {
    workspaceRoot,
    configRoot,
    fallbackDirectory: cwd,
  };
}

async function getSessionModelMeta(
  ctx: PluginContext,
  sessionID?: string,
): Promise<{ modelID?: string; providerID?: string }> {
  if (!sessionID) return {};
  try {
    const session = await ctx.session.get({ sessionID });
    if (session?.model) {
      return {
        modelID: session.model.id,
        providerID: session.model.providerID,
      };
    }
  } catch {
    // ignore lookup failures; treat as no session meta
  }
  return {};
}

async function refreshConfig(ctx: PluginContext, state: QuotaPluginState): Promise<void> {
  if (state.configInFlight) return state.configInFlight;

  state.configInFlight = (async () => {
    try {
      const runtime = await resolveQuotaRuntimeContext({
        client: createQuotaClientAdapter(getPluginRuntimeRootHints()),
        roots: getPluginRuntimeRootHints(),
      });
      state.configMeta = runtime.configMeta;
      state.config = runtime.config;
      state.configLoaded = true;
    } catch {
      // Leave configLoaded=false so we can retry on next trigger.
      state.config = DEFAULT_CONFIG;
      state.configMeta = createLoadConfigMeta();
    } finally {
      state.configInFlight = null;
    }
  })();

  return state.configInFlight;
}

async function buildStatusReport(params: {
  ctx: PluginContext;
  state: QuotaPluginState;
  sessionID?: string;
  generatedAtMs: number;
}): Promise<string | null> {
  const { ctx, state } = params;

  if (!state.configLoaded) {
    await refreshConfig(ctx, state);
  }
  if (!state.config.enabled) return null;

  await maybeRefreshPricingSnapshot({
    reason: "status",
    snapshotSelection: state.config.pricingSnapshot.source,
  }).catch(() => undefined);

  const sessionMeta = await getSessionModelMeta(ctx, params.sessionID);
  const runtime = await resolveQuotaRuntimeContext({
    client: createQuotaClientAdapter(getPluginRuntimeRootHints()),
    roots: getPluginRuntimeRootHints(),
    sessionID: params.sessionID,
    sessionMeta,
  });

  return buildQuotaStatusReportFromRuntime({
    runtime,
    sessionID: params.sessionID,
    sessionMeta,
    generatedAtMs: params.generatedAtMs,
  });
}

export function createQuotaStatusTool(ctx: PluginContext, state: QuotaPluginState): ToolInfo {
  return {
    name: "quota_status",
    description:
      "Diagnostics for quota compact status + pricing + local storage. Shows provider availability, live quota probes, and pricing snapshot health.",
    input: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    options: { codemode: false },
    async execute(_input, toolContext) {
      const out = await buildStatusReport({
        ctx,
        state,
        sessionID: toolContext.sessionID,
        generatedAtMs: Date.now(),
      });
      if (!out) return { content: "" };

      // Show the report in the transcript without feeding it to the model:
      // synthetic messages render for the user but stay out of model context
      // (the v2 equivalent of the v1 noReply + ignored parts injection).
      try {
        await ctx.session.synthetic({
          sessionID: toolContext.sessionID,
          text: sanitizeDisplayText(out),
          description: "quota_status",
        });
      } catch (error) {
        console.error(
          `[${STATUS_SERVICE}] Failed to inject quota_status report:`,
          error instanceof Error ? error.message : String(error),
        );
      }
      return { content: "" };
    },
  };
}

export const QuotaToastPlugin = async (ctx: PluginContext): Promise<void> => {
  const state = createPluginState();

  await ctx.tool.transform((draft) => {
    draft.add(createQuotaStatusTool(ctx, state));
  });
};
