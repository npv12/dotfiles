/** @jsxImportSource @opentui/solid */
import {
  createTracker,
  estimateTokens,
  formatRate,
  formatTtft,
  HIDE_AFTER_MS,
  STREAM_WINDOW_MS,
  type Tracker,
} from "./tracker.ts"

// Local plugin-context types matching the TUI plugin runtime bundled in
// opencode2 next-16650 (module shape { id, setup }, ctx.ui.slot, string
// session status, events with a `created` + `data` payload). The installed
// @opencode-ai/plugin@1.17.16 package exports neither `Plugin.define` nor the
// matching context types, so this file never imports it at runtime and types
// the context locally.
type Color = any // RGBA object or hex string, accepted by <text fg=...>
type ThemeColors = { default: Color; subdued: Color }

type MessageTime = { created: number; completed?: number }
type MessageInfo = {
  id: string
  type: string
  time: MessageTime
  content?: ReadonlyArray<{ type: string; time?: { completed?: number } }>
}

type PluginCtx = {
  app: { version: string }
  theme: { text: ThemeColors }
  data: {
    on: (type: string, handler: (event: any) => void) => () => void
    session: {
      status: (sessionID: string) => string | undefined
      message: { list: (sessionID: string) => readonly MessageInfo[] }
    }
  }
  ui: {
    slot: (
      name: string,
      render: (props: { sessionID?: string; mode: string }) => unknown,
    ) => void
  }
}

type PromptFooterProps = { sessionID?: string; mode: string }

// next-16650 loads external plugins with their own solid-js copy, so signals
// created here are invisible to the host renderer and slot bodies never
// re-run mid-stream. Instead the interval below pushes fresh text straight
// into the TextRenderable via its `content` setter (re-measures + re-renders).
const TICK_MS = 100

function computeText(ctx: PluginCtx, tracker: Tracker, sessionID: string): string {
  const streaming = ctx.data.session.status(sessionID) === "running"
  const now = Date.now()

  // Live smoothed rate while streaming; otherwise the last recorded rate,
  // frozen for HIDE_AFTER_MS after the last data. Only a step with no data
  // at all shows the placeholder dash.
  const live = streaming ? tracker.liveRate(sessionID, now) : undefined
  const frozen = live === undefined ? tracker.lastLiveRate(sessionID, now) : undefined
  const dash = "—"
  const tps =
    live !== undefined ? formatRate(live) : frozen !== undefined ? formatRate(frozen) : streaming ? dash : undefined

  const totals = tracker.state.totalsBySession[sessionID]
  const avg =
    totals !== undefined && totals.stepCount > 0
      ? formatRate(totals.totalTokens / (totals.totalStreamMs / 1000))
      : undefined
  const ttft =
    totals !== undefined && totals.stepCount > 0
      ? formatTtft(totals.totalTtftMs / totals.stepCount / 1000)
      : undefined

  const parts: string[] = []
  if (tps !== undefined) parts.push(`TPS ${tps}`)
  if (avg !== undefined) parts.push(`AVG ${avg}`)
  if (ttft !== undefined) parts.push(`TTFT ${ttft}`)
  return parts.join(" · ")
}

type View = {
  node: { content: string; visible?: boolean; isDestroyed?: boolean } | undefined
  ctx: PluginCtx
  tracker: Tracker
  sessionID: string
  lastRender: number
}

// The TUI can hold more than one prompt instance (session composer,
// subagents); track a view per session and have the interval drive the one
// that is streaming (or the most recently rendered).
const views = new Map<string, View>()
let intervalId: ReturnType<typeof setInterval> | undefined

/**
 * Time from the previous activity's end (user prompt, or the previous
 * step's completion incl. tool calls) to this step's first output. This is
 * the real, user-visible "time to first token": the server publishes
 * step.started / message.created when the stream opens, ~5ms before the
 * first delta, so per-step event deltas cannot measure it.
 */
function stepTtftMs(messages: readonly MessageInfo[], assistantMessageID: string): number | undefined {
  const index = messages.findIndex((message) => message.id === assistantMessageID)
  const current = index >= 0 ? messages[index] : undefined
  const previous = index > 0 ? messages[index - 1] : undefined
  if (!current?.time?.created || !previous?.time) return undefined
  const previousEnd = previous.time.completed ?? previous.time.created
  if (typeof previousEnd !== "number") return undefined
  return Math.max(current.time.created - previousEnd, 0)
}

export default {
  id: "npv12.opencode-tps",
  setup(ctx: PluginCtx) {
    const tracker = createTracker()

    // Hot reload re-runs setup in a fresh module instance; guard against
    // leaked intervals from a previous generation.
    if (intervalId !== undefined) clearInterval(intervalId)
    intervalId = setInterval(() => {
      // Prefer the view whose node is actually visible: the TUI keeps hidden
      // composers (resumed sessions) mounted alongside the active one.
      const visible = [...views.values()].filter(
        (view) => view.node && !view.node.isDestroyed && view.node.visible !== false,
      )
      let best: View | undefined
      for (const view of visible) {
        if (!best) {
          best = view
          continue
        }
        const runningA = view.ctx.data.session.status(view.sessionID) === "running"
        const runningB = best.ctx.data.session.status(best.sessionID) === "running"
        if (runningA !== runningB) {
          if (runningA) best = view
          continue
        }
        const samplesA = (view.tracker.state.samplesBySession[view.sessionID]?.length ?? 0) > 0
        const samplesB = (best.tracker.state.samplesBySession[best.sessionID]?.length ?? 0) > 0
        if (samplesA !== samplesB) {
          if (samplesA) best = view
          continue
        }
        if (view.lastRender > best.lastRender) best = view
      }
      // Prune views whose nodes were destroyed.
      for (const [sessionID, view] of views) {
        if (view.node && view.node.isDestroyed) views.delete(sessionID)
      }
      if (!best) return
      const text = computeText(best.ctx, best.tracker, best.sessionID)
      if (!best.node) return
      try {
        if (best.node.content !== text) best.node.content = text
      } catch {
        views.delete(best.sessionID)
      }
    }, TICK_MS)

    const unsubscribers = [
      ctx.data.on("session.step.started", (event) => {
        tracker.stepStarted(event.data.assistantMessageID, event.data.sessionID, event.created)
      }),
      ctx.data.on("session.text.started", (event) => {
        // Fallback TTFT anchor when the message store lookup fails.
        tracker.stepTextStarted(event.data.assistantMessageID, event.created)
      }),
      ctx.data.on("session.text.delta", (event) => {
        tracker.appendSample(event.data.sessionID, event.data.assistantMessageID, {
          at: event.created,
          tokens: estimateTokens(event.data.delta),
        })
      }),
      ctx.data.on("session.reasoning.delta", (event) => {
        tracker.appendSample(event.data.sessionID, event.data.assistantMessageID, {
          at: event.created,
          tokens: estimateTokens(event.data.delta),
        })
      }),
      ctx.data.on("session.tool.input.started", (event) => {
        // A tool call pauses generation; drop the window so live TPS does not
        // span the gap once text resumes.
        tracker.clearLiveSamples(event.data.sessionID)
      }),
      ctx.data.on("session.model.selected", (event) => {
        // A model switch changes generation characteristics entirely; start
        // the session's stats from zero so they only reflect the new model.
        tracker.resetSession(event.data.sessionID)
      }),
      ctx.data.on("session.step.ended", (event) => {
        tracker.stepEnded(
          event.data.assistantMessageID,
          event.data.sessionID,
          event.created,
          event.data.tokens.output + event.data.tokens.reasoning,
          stepTtftMs(ctx.data.session.message.list(event.data.sessionID), event.data.assistantMessageID),
        )
      }),
      ctx.data.on("session.step.failed", (event) => {
        tracker.stepFailed(event.data.assistantMessageID)
      }),
    ]

    ctx.ui.slot("prompt.footer.end", (props: PromptFooterProps) => {
      if (props.mode !== "normal" || !props.sessionID) return null
      const view: View = {
        node: undefined,
        ctx,
        tracker,
        sessionID: props.sessionID,
        lastRender: Date.now(),
      }
      views.set(props.sessionID, view)
      return (
        <text
          ref={(node: any) => {
            view.node = node
          }}
          fg={ctx.theme.text.subdued}
          wrapMode="none"
          truncate
          flexShrink={1}
        >
          {computeText(ctx, tracker, props.sessionID)}
        </text>
      )
    })

    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
      views.clear()
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  },
}
