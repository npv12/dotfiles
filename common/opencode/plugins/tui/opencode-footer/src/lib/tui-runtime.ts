import type { CompactStatusState } from "./tui-panel-state.js";
import type { TuiPluginContext } from "../tui-context.js";
import type { CollectQuotaRenderDataResult } from "./quota-render-data.js";
import type { QuotaRuntimeContext } from "./quota-runtime-context.js";
import type { RuntimeContextRootHints } from "./config-file-utils.js";
import type { QuotaToastConfig } from "./types.js";

import { findGitWorktreeRoot, resolveRuntimeContextRoots } from "./config-file-utils.js";
import {
  createQuotaRuntimeRequestContext,
  resolveQuotaRuntimeContext,
} from "./quota-runtime-context.js";
import { collectQuotaRenderData } from "./quota-render-data.js";
import { resolveQuotaFormatStyle } from "./quota-format-style.js";
import { buildCompactQuotaStatusLine } from "./tui-compact-format.js";
import { loadConfiguredProviderIds } from "./opencode-config-providers.js";

const COMPACT_UNAVAILABLE_TEXT = "Quota unavailable";

function getTuiRuntimeRootHints(ctx: TuiPluginContext): RuntimeContextRootHints {
  const directory = ctx.location?.directory;
  const worktreeRoot = directory ? findGitWorktreeRoot(directory) ?? directory : undefined;
  return {
    workspaceRoot: worktreeRoot,
    worktreeRoot,
    activeDirectory: directory,
    fallbackDirectory: process.cwd(),
  };
}

/**
 * The quota engine only needs two client calls: config.get (SDK fallback for
 * experimental.quotaToast — file-backed config is primary) and
 * config.providers (provider availability). opencode2 exposes no config
 * client to TUI plugins, so both are answered from the on-disk opencode
 * config, which the engine already reads natively.
 */
function createTuiQuotaClient(configRoot: string): {
  config: {
    get: () => Promise<{ data?: { experimental?: { quotaToast?: Partial<QuotaToastConfig> } } }>;
    providers: () => Promise<{ data?: { providers: Array<{ id: string }> } }>;
  };
} {
  return {
    config: {
      get: async () => ({ data: {} }),
      providers: async () => {
        const ids = await loadConfiguredProviderIds({ configRootDir: configRoot });
        return { data: { providers: ids.map((id) => ({ id })) } };
      },
    },
  };
}

function getSessionModelMeta(
  ctx: TuiPluginContext,
  sessionID: string,
): { modelID?: string; providerID?: string } {
  try {
    const session = ctx.data.session.get(sessionID);
    if (session?.model) {
      return {
        modelID: session.model.id,
        providerID: session.model.providerID,
      };
    }
  } catch {
    // fall through
  }
  return {};
}

function isCompactEnabled(config: QuotaToastConfig, includeSessionPrompt: boolean): boolean {
  return (
    config.enabled &&
    config.tuiCompactStatus.enabled &&
    (includeSessionPrompt ? config.tuiCompactStatus.sessionPrompt : true)
  );
}

function buildCompactStatusFromData(params: {
  runtime: QuotaRuntimeContext;
  result: CollectQuotaRenderDataResult;
  enabled: boolean;
  maxWidth?: number;
}): CompactStatusState {
  if (!params.enabled) return { status: "disabled" };

  if (params.result.selection?.waitingForCurrentSelection) {
    return { status: "loading" };
  }

  const text = params.result.data
    ? buildCompactQuotaStatusLine({
        data: params.result.data,
        percentDisplayMode: params.runtime.config.percentDisplayMode,
        maxWidth: params.maxWidth ?? params.runtime.config.tuiCompactStatus.maxWidth,
      })
    : "";

  return {
    status: "ready",
    text: text.trim() ? text : COMPACT_UNAVAILABLE_TEXT,
  };
}

async function resolveTuiRuntime(params: {
  ctx: TuiPluginContext;
  sessionID?: string;
}): Promise<QuotaRuntimeContext> {
  const hints = getTuiRuntimeRootHints(params.ctx);
  const roots = resolveRuntimeContextRoots(hints);
  return resolveQuotaRuntimeContext({
    client: createTuiQuotaClient(roots.configRoot),
    roots: hints,
    sessionID: params.sessionID,
    resolveSessionMeta: async (sessionID) => getSessionModelMeta(params.ctx, sessionID),
    includeSessionMeta: (config) => config.onlyCurrentModel,
  });
}

async function collectTuiQuotaRenderData(runtime: QuotaRuntimeContext): Promise<{
  result: CollectQuotaRenderDataResult;
  formatStyle: ReturnType<typeof resolveQuotaFormatStyle>;
}> {
  const formatStyle = resolveQuotaFormatStyle(runtime.config.formatStyle);
  const result = await collectQuotaRenderData({
    client: runtime.client,
    config: runtime.config,
    configMeta: runtime.configMeta,
    request: createQuotaRuntimeRequestContext(runtime),
    surfaceExplicitProviderIssues: true,
    formatStyle,
    providers: runtime.providers,
  });

  return { result, formatStyle };
}

/** Compact quota status for one session (shown under the prompt footer). */
export async function loadTuiCompactStatus(params: {
  ctx: TuiPluginContext;
  sessionID: string;
}): Promise<CompactStatusState> {
  const runtime = await resolveTuiRuntime({ ctx: params.ctx, sessionID: params.sessionID });
  const enabled = isCompactEnabled(runtime.config, true);
  if (!enabled) return { status: "disabled" };

  const { result } = await collectTuiQuotaRenderData(runtime);
  return buildCompactStatusFromData({
    runtime,
    result,
    enabled: true,
  });
}

/** Compact quota status for the home screen (no session). */
export async function loadTuiHomeCompactStatus(params: {
  ctx: TuiPluginContext;
}): Promise<CompactStatusState> {
  const runtime = await resolveTuiRuntime({ ctx: params.ctx });
  const enabled = isCompactEnabled(runtime.config, false) && runtime.config.tuiCompactStatus.homeBottom;
  if (!enabled) return { status: "disabled" };

  // Home has no current session; never restrict to the current model.
  const homeRuntime: QuotaRuntimeContext = {
    ...runtime,
    config: {
      ...runtime.config,
      onlyCurrentModel: false,
    },
    session: {},
  };

  const { result } = await collectTuiQuotaRenderData(homeRuntime);
  return buildCompactStatusFromData({
    runtime: homeRuntime,
    result,
    enabled: true,
  });
}
