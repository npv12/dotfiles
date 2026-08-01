/** @jsxImportSource @opentui/solid */

// OpenCode Quota — TUI plugin entry (opencode2 next-16664/16665 module shape
// { id, setup }). Ported from the v1 TUI entry of @npv12/opencode-quota,
// with the opencode-tps prompt stats folded in.
//
// Surfaces:
//
//   - "prompt.footer.end" slot (per-session): renders TWO subdued lines —
//     the TPS/TTFT stats (folded in from opencode-tps; that plugin is
//     disabled in cli.json) and the quota compact status. The slot renders
//     with mode "replace" (only the last registration renders), so this
//     plugin owns it; the built-in "opencode.prompt-footer" content
//     (subagents · shells · context · cost) was already superseded by
//     opencode-tps before this port.
//   - "home.footer" slot: quota compact status for the home screen (mode
//     "replace" — supersedes the built-in version line; no other plugin
//     uses the slot).
//   - "/quota_status" command via ctx.keymap.layer: builds the full report
//     for the focused session and injects it into the transcript via
//     ctx.client.session.synthetic (transient, read-only, not model-visible).
//
// next-16664/16665 load external plugins with their own solid-js copy, so
// signals created here are invisible to the host renderer and slot bodies
// never re-run. Like opencode-tps and opencode-session-recap, the ticks +
// event listeners push text straight into the renderables via their
// `content`/`visible` setters. keymap.layer reads the Keymap context, so the
// command is registered from inside a slot body, not from setup.

import type { TuiPluginContext } from "./tui-context.js";
import type { CompactStatusState } from "./lib/tui-panel-state.js";

import {
  createTracker,
  estimateTokens,
  formatRate,
  formatTtft,
  HIDE_AFTER_MS,
  type Tracker,
} from "./lib/tps-tracker.js";
import { getCompactStatusText, shouldRenderCompactStatus } from "./lib/tui-panel-state.js";
import { loadTuiCompactStatus, loadTuiHomeCompactStatus } from "./lib/tui-runtime.js";
import { resolveQuotaRuntimeContext } from "./lib/quota-runtime-context.js";
import { createQuotaClientAdapter } from "./lib/quota-client-adapter.js";
import { findGitWorktreeRoot, getEffectiveConfigRoot } from "./lib/config-file-utils.js";
import { maybeRefreshPricingSnapshot } from "./lib/modelsdev-pricing.js";
import { buildQuotaStatusReportFromRuntime } from "./lib/status-report.js";

const QUOTA_TICK_MS = 1_000;
const QUOTA_REFRESH_INTERVAL_MS = 60_000;
const QUOTA_EVENT_REFRESH_DELAYS_MS = [150, 600] as const;
const QUOTA_MOUNT_RECOVERY_DELAYS_MS = [500, 1_500, 4_000] as const;
const TPS_TICK_MS = 100;

type Node = { content?: string; visible?: boolean; isDestroyed?: boolean };

type MessageLike = {
  id: string;
  type?: string;
  time?: { created: number; completed?: number };
  content?: ReadonlyArray<{ type: string; time?: { completed?: number } }>;
};

type SessionView = {
  sessionID: string;
  ctx: TuiPluginContext;
  tpsNode: Node | undefined;
  quotaNode: Node | undefined;
  tracker: Tracker;
  lastQuotaRefreshAt: number;
  lastRender: number;
  inFlight: boolean;
  queued: boolean;
  disposed: boolean;
  timers: Set<ReturnType<typeof setTimeout>>;
  stopListening: (() => void) | undefined;
};

type HomeView = {
  node: Node | undefined;
  lastRefreshAt: number;
  inFlight: boolean;
  queued: boolean;
  disposed: boolean;
  timers: Set<ReturnType<typeof setTimeout>>;
  stopListening: (() => void) | undefined;
};

const sessionViews = new Map<string, SessionView>();
let homeView: HomeView | undefined;
let quotaTickId: ReturnType<typeof setInterval> | undefined;
let tpsTickId: ReturnType<typeof setInterval> | undefined;
let keymapRegistered = false;
let eventUnsubscribers: Array<() => void> = [];

function scheduleTimer(view: { timers: Set<ReturnType<typeof setTimeout>>; disposed: boolean }, reload: () => void, delay: number) {
  if (view.disposed) return;
  const timer = setTimeout(() => {
    view.timers.delete(timer);
    reload();
  }, delay);
  view.timers.add(timer);
}

function clearTimers(view: { timers: Set<ReturnType<typeof setTimeout>> }): void {
  for (const timer of view.timers) clearTimeout(timer);
  view.timers.clear();
}

// === TPS / TTFT (folded in from opencode-tps) =============================

function tpsText(ctx: TuiPluginContext, view: SessionView): string {
  const sessionID = view.sessionID;
  const streaming = ctx.data.session.status(sessionID) === "running";
  const now = Date.now();

  const live = streaming ? view.tracker.liveRate(sessionID, now) : undefined;
  const frozen = live === undefined ? view.tracker.lastLiveRate(sessionID, now) : undefined;
  const dash = "—";
  const tps =
    live !== undefined ? formatRate(live) : frozen !== undefined ? formatRate(frozen) : streaming ? dash : undefined;

  const totals = view.tracker.state.totalsBySession[sessionID];
  const avg =
    totals !== undefined && totals.stepCount > 0
      ? formatRate(totals.totalTokens / (totals.totalStreamMs / 1000))
      : undefined;
  const ttft =
    totals !== undefined && totals.stepCount > 0
      ? formatTtft(totals.totalTtftMs / totals.stepCount / 1000)
      : undefined;

  const parts: string[] = [];
  if (tps !== undefined) parts.push(`TPS ${tps}`);
  if (avg !== undefined) parts.push(`AVG ${avg}`);
  if (ttft !== undefined) parts.push(`TTFT ${ttft}`);
  return parts.join(" · ");
}

/** Time from the previous activity's end (user prompt, or the previous
 *  step's completion incl. tool calls) to this step's first output. */
function stepTtftMs(messages: readonly MessageLike[], assistantMessageID: string): number | undefined {
  const index = messages.findIndex((message) => message.id === assistantMessageID);
  const current = index >= 0 ? messages[index] : undefined;
  const previous = index > 0 ? messages[index - 1] : undefined;
  if (!current?.time?.created || !previous?.time) return undefined;
  const previousEnd = previous.time.completed ?? previous.time.created;
  if (typeof previousEnd !== "number") return undefined;
  return Math.max(current.time.created - previousEnd, 0);
}

/** The TUI can hold more than one prompt instance (session composer,
 *  subagents); the 100ms tick drives the one that is streaming (or the most
 *  recently rendered). */
function bestTpsView(): SessionView | undefined {
  const visible = [...sessionViews.values()].filter(
    (view) => view.tpsNode && !view.tpsNode.isDestroyed && view.tpsNode.visible !== false,
  );
  let best: SessionView | undefined;
  for (const view of visible) {
    if (!best) {
      best = view;
      continue;
    }
    const runningA = view.ctx.data.session.status(view.sessionID) === "running";
    const runningB = best.ctx.data.session.status(best.sessionID) === "running";
    if (runningA !== runningB) {
      if (runningA) best = view;
      continue;
    }
    const samplesA = (view.tracker.state.samplesBySession[view.sessionID]?.length ?? 0) > 0;
    const samplesB = (best.tracker.state.samplesBySession[best.sessionID]?.length ?? 0) > 0;
    if (samplesA !== samplesB) {
      if (samplesA) best = view;
      continue;
    }
    if (view.lastRender > best.lastRender) best = view;
  }
  return best;
}

// === quota compact status =================================================

function compactText(compact: CompactStatusState): string {
  return shouldRenderCompactStatus(compact) ? getCompactStatusText(compact) : "";
}

function updateSessionQuota(view: SessionView, ctx: TuiPluginContext): void {
  const node = view.quotaNode;
  if (!node || node.isDestroyed) return;

  void loadTuiCompactStatus({ ctx, sessionID: view.sessionID })
    .then((compact) => {
      if (view.disposed || node.isDestroyed) return;
      const text = compactText(compact);
      node.content = text;
      node.visible = Boolean(text);
      view.lastQuotaRefreshAt = Date.now();
    })
    .catch(() => {
      if (view.disposed || node.isDestroyed) return;
      node.content = "";
      node.visible = false;
    })
    .finally(() => {
      view.inFlight = false;
      if (view.queued) {
        view.queued = false;
        refreshSessionQuota(view, ctx);
      }
    });
}

function refreshSessionQuota(view: SessionView, ctx: TuiPluginContext): void {
  if (view.disposed) return;
  if (view.inFlight) {
    view.queued = true;
    return;
  }
  view.inFlight = true;
  updateSessionQuota(view, ctx);
}

function scheduleSessionQuotaRefresh(view: SessionView, ctx: TuiPluginContext): void {
  for (const delay of QUOTA_EVENT_REFRESH_DELAYS_MS) {
    scheduleTimer(view, () => refreshSessionQuota(view, ctx), delay);
  }
}

function createSessionView(ctx: TuiPluginContext, sessionID: string): SessionView {
  const existing = sessionViews.get(sessionID);
  if (existing) {
    existing.stopListening?.();
    sessionViews.delete(sessionID);
  }

  const view: SessionView = {
    sessionID,
    ctx,
    tpsNode: undefined,
    quotaNode: undefined,
    tracker: createTracker(),
    lastQuotaRefreshAt: Date.now(),
    lastRender: Date.now(),
    inFlight: false,
    queued: false,
    disposed: false,
    timers: new Set(),
    stopListening: undefined,
  };
  sessionViews.set(sessionID, view);

  // TUI/session state can hydrate asynchronously after mount or session
  // switch, so retry a few times to recover from empty first-load reads.
  for (const delay of QUOTA_MOUNT_RECOVERY_DELAYS_MS) {
    scheduleTimer(view, () => refreshSessionQuota(view, ctx), delay);
  }

  view.stopListening = ctx.data.on("message.updated", (event) => {
    if (event.data?.sessionID !== sessionID) return;
    scheduleSessionQuotaRefresh(view, ctx);
  });

  return view;
}

function dropSessionView(sessionID: string): void {
  const view = sessionViews.get(sessionID);
  if (!view) return;
  view.disposed = true;
  clearTimers(view);
  view.stopListening?.();
  sessionViews.delete(sessionID);
}

function updateHomeNode(view: HomeView, ctx: TuiPluginContext): void {
  const node = view.node;
  if (!node || node.isDestroyed) return;

  void loadTuiHomeCompactStatus({ ctx })
    .then((compact) => {
      if (view.disposed || node.isDestroyed) return;
      const text = compactText(compact);
      node.content = text;
      node.visible = Boolean(text);
      view.lastRefreshAt = Date.now();
    })
    .catch(() => {
      if (view.disposed || node.isDestroyed) return;
      node.content = "";
      node.visible = false;
    })
    .finally(() => {
      view.inFlight = false;
      if (view.queued) {
        view.queued = false;
        refreshHome(view, ctx);
      }
    });
}

function refreshHome(view: HomeView, ctx: TuiPluginContext): void {
  if (view.disposed) return;
  if (view.inFlight) {
    view.queued = true;
    return;
  }
  view.inFlight = true;
  updateHomeNode(view, ctx);
}

function scheduleHomeRefresh(view: HomeView, ctx: TuiPluginContext): void {
  for (const delay of QUOTA_EVENT_REFRESH_DELAYS_MS) {
    scheduleTimer(view, () => refreshHome(view, ctx), delay);
  }
}

function createHomeView(ctx: TuiPluginContext): HomeView {
  if (homeView) {
    homeView.stopListening?.();
    homeView = undefined;
  }

  const view: HomeView = {
    node: undefined,
    lastRefreshAt: Date.now(),
    inFlight: false,
    queued: false,
    disposed: false,
    timers: new Set(),
    stopListening: undefined,
  };
  homeView = view;

  for (const delay of QUOTA_MOUNT_RECOVERY_DELAYS_MS) {
    scheduleTimer(view, () => refreshHome(view, ctx), delay);
  }

  view.stopListening = ctx.data.on("message.updated", () => {
    scheduleHomeRefresh(view, ctx);
  });

  return view;
}

function dropHomeView(): void {
  if (!homeView) return;
  homeView.disposed = true;
  clearTimers(homeView);
  homeView.stopListening?.();
  homeView = undefined;
}

// === /quota_status ========================================================

/** The session whose route is currently focused, if any. */
function focusedSessionID(ctx: TuiPluginContext): string | undefined {
  try {
    const route = ctx.ui.router.current();
    return route?.type === "session" ? route.sessionID : undefined;
  } catch {
    return undefined;
  }
}

function getTuiRuntimeRootHints(ctx: TuiPluginContext) {
  const cwd = process.cwd();
  const directory = ctx.location?.directory ?? cwd;
  const workspaceRoot = findGitWorktreeRoot(directory) ?? directory;
  const configRoot = getEffectiveConfigRoot(workspaceRoot);
  return { workspaceRoot, configRoot, fallbackDirectory: cwd };
}

async function buildStatusReportForSession(
  ctx: TuiPluginContext,
  sessionID: string | undefined,
): Promise<string | null> {
  const roots = getTuiRuntimeRootHints(ctx);
  const runtime = await resolveQuotaRuntimeContext({
    client: createQuotaClientAdapter(roots),
    roots,
    sessionID,
  });

  await maybeRefreshPricingSnapshot({
    reason: "status",
    snapshotSelection: runtime.config.pricingSnapshot.source,
  }).catch(() => undefined);

  let sessionMeta: { modelID?: string; providerID?: string } | undefined;
  if (sessionID) {
    const session = ctx.data.session.get(sessionID);
    sessionMeta = session?.model
      ? { modelID: session.model.id, providerID: session.model.providerID }
      : undefined;
  }

  return buildQuotaStatusReportFromRuntime({
    runtime,
    sessionID,
    sessionMeta,
    generatedAtMs: Date.now(),
  });
}

function registerQuotaStatusCommand(ctx: TuiPluginContext): void {
  ctx.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "opencode-quota.status",
        title: "Show quota status report",
        group: "Quota",
        palette: true,
        slash: { name: "quota_status" },
        run: () => {
          const sessionID = focusedSessionID(ctx);
          void buildStatusReportForSession(ctx, sessionID)
            .then((report) => {
              if (!report || !sessionID) return;
              return ctx.client.session.synthetic({
                sessionID,
                text: report,
                description: "quota_status",
              });
            })
            .catch(() => undefined);
        },
      },
    ],
  }));
}

export default {
  id: "npv12.opencode-footer",
  setup(ctx: TuiPluginContext) {
    // Hot reload re-runs setup in a fresh module instance; guard against
    // leaked intervals from a previous generation.
    if (quotaTickId !== undefined) clearInterval(quotaTickId);
    if (tpsTickId !== undefined) clearInterval(tpsTickId);

    // TPS/TTFT event feed (from opencode-tps).
    eventUnsubscribers = [
      ctx.data.on("session.step.started", (event: any) => {
        for (const view of sessionViews.values()) {
          if (view.sessionID === event.data?.sessionID) {
            view.tracker.stepStarted(event.data.assistantMessageID, event.data.sessionID, event.created);
          }
        }
      }),
      ctx.data.on("session.text.started", (event: any) => {
        for (const view of sessionViews.values()) {
          if (view.sessionID === event.data?.sessionID) {
            view.tracker.stepTextStarted(event.data.assistantMessageID, event.created);
          }
        }
      }),
      ctx.data.on("session.text.delta", (event: any) => {
        const view = sessionViews.get(event.data?.sessionID);
        if (view) {
          view.tracker.appendSample(event.data.sessionID, event.data.assistantMessageID, {
            at: event.created,
            tokens: estimateTokens(event.data.delta),
          });
        }
      }),
      ctx.data.on("session.reasoning.delta", (event: any) => {
        const view = sessionViews.get(event.data?.sessionID);
        if (view) {
          view.tracker.appendSample(event.data.sessionID, event.data.assistantMessageID, {
            at: event.created,
            tokens: estimateTokens(event.data.delta),
          });
        }
      }),
      ctx.data.on("session.tool.input.started", (event: any) => {
        const view = sessionViews.get(event.data?.sessionID);
        if (view) view.tracker.clearLiveSamples(event.data.sessionID);
      }),
      ctx.data.on("session.model.selected", (event: any) => {
        const view = sessionViews.get(event.data?.sessionID);
        if (view) view.tracker.resetSession(event.data.sessionID);
      }),
      ctx.data.on("session.step.ended", (event: any) => {
        const view = sessionViews.get(event.data?.sessionID);
        if (view) {
          view.tracker.stepEnded(
            event.data.assistantMessageID,
            event.data.sessionID,
            event.created,
            event.data.tokens.output + event.data.tokens.reasoning,
            stepTtftMs(
              ctx.data.session.message.list(event.data.sessionID) as readonly MessageLike[],
              event.data.assistantMessageID,
            ),
          );
        }
      }),
      ctx.data.on("session.step.failed", (event: any) => {
        for (const view of sessionViews.values()) {
          if (view.sessionID === event.data?.sessionID) {
            view.tracker.stepFailed(event.data.assistantMessageID);
          }
        }
      }),
    ];

    // 100ms tick for live TPS/TTFT (drives the best visible view).
    tpsTickId = setInterval(() => {
      for (const [sessionID, view] of sessionViews) {
        if (view.tpsNode && view.tpsNode.isDestroyed) {
          dropSessionView(sessionID);
          continue;
        }
      }
      const best = bestTpsView();
      if (!best || !best.tpsNode) return;
      const text = tpsText(ctx, best);
      try {
        if (best.tpsNode.content !== text) best.tpsNode.content = text;
      } catch {
        sessionViews.delete(best.sessionID);
      }
    }, TPS_TICK_MS);

    // 1s tick for quota refreshes (60s interval per view, like v1).
    quotaTickId = setInterval(() => {
      const now = Date.now();
      for (const [sessionID, view] of sessionViews) {
        if (!view.quotaNode || view.quotaNode.isDestroyed) {
          dropSessionView(sessionID);
          continue;
        }
        if (view.disposed) continue;
        if (view.inFlight) continue;
        if (now - view.lastQuotaRefreshAt >= QUOTA_REFRESH_INTERVAL_MS) {
          refreshSessionQuota(view, ctx);
        }
      }
      if (homeView && homeView.node && !homeView.node.isDestroyed && !homeView.disposed) {
        if (!homeView.inFlight && now - homeView.lastRefreshAt >= QUOTA_REFRESH_INTERVAL_MS) {
          refreshHome(homeView, ctx);
        }
      }
    }, QUOTA_TICK_MS);

    // Prompt footer: TPS/TTFT line + quota compact status line. The slot is
    // mode "replace" (only the last registration renders) — opencode-tps is
    // folded in here and disabled in cli.json, so this plugin owns it.
    ctx.ui.slot("prompt.footer.end", (props: Record<string, unknown>) => {
      const sessionID = typeof props.sessionID === "string" ? props.sessionID : undefined;
      const mode = typeof props.mode === "string" ? props.mode : "normal";
      if (!sessionID || mode !== "normal") return null;

      // keymap.layer reads the Keymap context, so it must be called from
      // inside the render tree (a slot body), not from setup — otherwise the
      // runtime throws "Keymap.Provider is missing". Register once per
      // module instance.
      if (!keymapRegistered) {
        keymapRegistered = true;
        registerQuotaStatusCommand(ctx);
      }

      const view = createSessionView(ctx, sessionID);
      return (
        <box gap={0}>
          <text
            ref={(node: any) => {
              view.tpsNode = node as Node;
            }}
            fg={ctx.theme.text.subdued}
            wrapMode="none"
            truncate
            flexShrink={1}
          >
            {tpsText(ctx, view)}
          </text>
          <text
            ref={(node: any) => {
              view.quotaNode = node as Node;
              node.visible = false;
            }}
            fg={ctx.theme.text.subdued}
            wrapMode="none"
            truncate
            flexShrink={1}
          />
        </box>
      );
    });

    // Home-screen compact status.
    ctx.ui.slot("home.footer", () => {
      if (!keymapRegistered) {
        keymapRegistered = true;
        registerQuotaStatusCommand(ctx);
      }
      const view = createHomeView(ctx);
      return (
        <text
          ref={(node: any) => {
            view.node = node as Node;
            node.visible = false;
          }}
          fg={ctx.theme.text.subdued}
          wrapMode="none"
          truncate
        />
      );
    });

    return () => {
      if (quotaTickId !== undefined) {
        clearInterval(quotaTickId);
        quotaTickId = undefined;
      }
      if (tpsTickId !== undefined) {
        clearInterval(tpsTickId);
        tpsTickId = undefined;
      }
      for (const unsubscribe of eventUnsubscribers) unsubscribe();
      eventUnsubscribers = [];
      for (const sessionID of [...sessionViews.keys()]) dropSessionView(sessionID);
      dropHomeView();
    };
  },
};
