// TPS/TTFT tracking logic folded in from opencode-tps (plugins/tui/opencode-tps/src/tracker.ts).
// Framework-free so it can be unit-tested with node:test.

export type StreamSample = {
  at: number
  tokens: number
}

// One step == one model call (one assistant message). Keyed by assistantMessageID.
export type StepTiming = {
  sessionID: string
  stepStartedAt: number
  firstDeltaAt?: number
  textStartedAt?: number
}

export type SessionTotals = {
  totalTokens: number
  totalStreamMs: number
  totalTtftMs: number
  stepCount: number
}

export type LiveRate = {
  value: number
  at: number
}

export type TrackerState = {
  samplesBySession: Record<string, StreamSample[]>
  timingByMessageID: Record<string, StepTiming>
  totalsBySession: Record<string, SessionTotals>
  liveRateBySession: Record<string, LiveRate>
}

/** Rolling window for the live TPS estimate. */
export const STREAM_WINDOW_MS = 5_000
/**
 * The live TPS freezes at the last recorded value and stays visible for this
 * long after the last stream data, then hides.
 */
export const HIDE_AFTER_MS = 5_000
/** EMA smoothing factor applied per live-rate computation (0..1). */
export const EMA_ALPHA = 0.3
const MIN_ACTIVE_MS = 250
const SINGLE_SAMPLE_MS = 1_000

/** Coarse token estimate for a stream delta, used only for the live TPS window. */
export function estimateTokens(delta: string): number {
  return Math.max(1, Math.ceil(new TextEncoder().encode(delta).byteLength / 5))
}

/** Active streaming duration for a sample window, clamped to a sane minimum. */
export function activeDurationMs(samples: readonly StreamSample[], tailAt?: number): number {
  if (samples.length === 0) return 0
  if (samples.length === 1) {
    const tailDuration = tailAt === undefined ? SINGLE_SAMPLE_MS : Math.max(0, tailAt - samples[0]!.at)
    return Math.min(Math.max(tailDuration, MIN_ACTIVE_MS), SINGLE_SAMPLE_MS)
  }

  let duration = 0
  for (let i = 1; i < samples.length; i++) {
    duration += Math.max(0, samples[i]!.at - samples[i - 1]!.at)
  }
  if (tailAt !== undefined) {
    duration += Math.max(0, tailAt - samples[samples.length - 1]!.at)
  }
  return Math.max(duration, SINGLE_SAMPLE_MS)
}

export function formatRate(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined
  if (value >= 100) return `${Math.round(value)}`
  if (value >= 10) return `${value.toFixed(1)}`
  return `${value.toFixed(2)}`
}

export function formatTtft(seconds: number): string | undefined {
  if (!Number.isFinite(seconds) || seconds < 0) return undefined
  return `${seconds.toFixed(1)}s`
}

export type Tracker = ReturnType<typeof createTracker>

export function createTracker() {
  const state: TrackerState = {
    samplesBySession: {},
    timingByMessageID: {},
    totalsBySession: {},
    liveRateBySession: {},
  }

  function appendSample(sessionID: string, messageID: string, sample: StreamSample) {
    const window = (state.samplesBySession[sessionID] ?? []).filter(
      (item) => sample.at - item.at <= STREAM_WINDOW_MS,
    )
    window.push(sample)
    state.samplesBySession[sessionID] = window

    const timing = state.timingByMessageID[messageID]
    if (timing) {
      state.timingByMessageID[messageID] = {
        ...timing,
        firstDeltaAt: timing.firstDeltaAt ?? sample.at,
      }
    }
  }

  function stepStarted(messageID: string, sessionID: string, at: number) {
    state.timingByMessageID[messageID] = { sessionID, stepStartedAt: at }
  }

  function stepTextStarted(messageID: string, at: number) {
    const timing = state.timingByMessageID[messageID]
    if (timing) {
      state.timingByMessageID[messageID] = {
        ...timing,
        textStartedAt: timing.textStartedAt ?? at,
      }
    }
  }

  /**
   * Finalize a step with its real token count from session.step.ended.
   * TTFT is measured to the first visible text (session.text.started), since
   * the server publishes step.started when the stream opens, not when the
   * request is dispatched — first-delta timestamps are ~0ms and meaningless.
   * `ttftMs` may be passed in from a better anchor; otherwise the step's own
   * textStartedAt is used. Steps without visible text contribute no TTFT.
   */
  function stepEnded(messageID: string, sessionID: string, at: number, tokens: number, ttftMs?: number) {
    const timing = state.timingByMessageID[messageID]
    delete state.timingByMessageID[messageID]
    if (!timing || timing.sessionID !== sessionID) return
    if (typeof timing.firstDeltaAt !== "number" || tokens <= 0) return

    const streamMs = Math.max(at - timing.stepStartedAt, 1)
    const ttft = ttftMs ?? (timing.textStartedAt === undefined ? undefined : Math.max(timing.textStartedAt - timing.stepStartedAt, 0))
    const totals = state.totalsBySession[sessionID] ?? {
      totalTokens: 0,
      totalStreamMs: 0,
      totalTtftMs: 0,
      stepCount: 0,
    }
    state.totalsBySession[sessionID] = {
      totalTokens: totals.totalTokens + tokens,
      totalStreamMs: totals.totalStreamMs + streamMs,
      totalTtftMs: totals.totalTtftMs + (ttft ?? 0),
      stepCount: totals.stepCount + (ttft === undefined ? 0 : 1),
    }
  }

  /** A failed step never produces totals; drop its pending timing. */
  function stepFailed(messageID: string) {
    delete state.timingByMessageID[messageID]
  }

  /**
   * Reset all tracking for a session — used when the model changes, so the
   * stats reflect only the current model.
   */
  function resetSession(sessionID: string) {
    delete state.samplesBySession[sessionID]
    delete state.totalsBySession[sessionID]
    delete state.liveRateBySession[sessionID]
    for (const [messageID, timing] of Object.entries(state.timingByMessageID)) {
      if (timing.sessionID === sessionID) delete state.timingByMessageID[messageID]
    }
  }

  /** Drop the live window when a tool call starts so TPS does not span the gap. */
  function clearLiveSamples(sessionID: string) {
    if (state.samplesBySession[sessionID]?.length) delete state.samplesBySession[sessionID]
  }

  /**
   * Current generation speed over the rolling window, EMA-smoothed so the
   * displayed number does not jitter with individual deltas. Records the
   * value for the freeze-on-stop behavior.
   */
  function liveRate(sessionID: string, now: number): number | undefined {
    const samples = (state.samplesBySession[sessionID] ?? []).filter(
      (sample) => now - sample.at <= STREAM_WINDOW_MS,
    )
    const last = samples[samples.length - 1]
    if (!last) return undefined
    const duration = activeDurationMs(samples, now) / 1000
    if (duration <= 0) return undefined
    const raw = samples.reduce((sum, sample) => sum + sample.tokens, 0) / duration
    const previous = state.liveRateBySession[sessionID]
    const value = previous === undefined ? raw : previous.value + EMA_ALPHA * (raw - previous.value)
    state.liveRateBySession[sessionID] = { value, at: last.at }
    return value
  }

  /**
   * The last recorded live rate, still visible for HIDE_AFTER_MS after the
   * last stream data. Returns undefined (and forgets it) once stale, so the
   * display hides the TPS.
   */
  function lastLiveRate(sessionID: string, now: number): number | undefined {
    const entry = state.liveRateBySession[sessionID]
    if (!entry) return undefined
    if (now - entry.at > HIDE_AFTER_MS) {
      delete state.liveRateBySession[sessionID]
      return undefined
    }
    return entry.value
  }

  function prune(now = Date.now()) {
    for (const [sessionID, samples] of Object.entries(state.samplesBySession)) {
      const next = samples.filter((sample) => now - sample.at <= STREAM_WINDOW_MS)
      if (next.length > 0) state.samplesBySession[sessionID] = next
      else delete state.samplesBySession[sessionID]
    }
  }

  return {
    state,
    appendSample,
    stepStarted,
    stepTextStarted,
    stepEnded,
    stepFailed,
    resetSession,
    clearLiveSamples,
    liveRate,
    lastLiveRate,
    prune,
  }
}
