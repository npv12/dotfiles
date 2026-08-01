import assert from "node:assert/strict"
import { test } from "node:test"
import {
  activeDurationMs,
  createTracker,
  estimateTokens,
  formatRate,
  formatTtft,
  EMA_ALPHA,
  HIDE_AFTER_MS,
  STREAM_WINDOW_MS,
} from "../src/lib/tps-tracker.ts"

test("estimateTokens clamps to at least 1 and scales with length", () => {
  assert.equal(estimateTokens(""), 1)
  assert.ok(estimateTokens("hello world") >= 1)
  assert.ok(estimateTokens("a".repeat(50)) > estimateTokens("a"))
})

test("activeDurationMs with a single sample uses the tail", () => {
  const samples = [{ at: 1_000, tokens: 10 }]
  assert.equal(activeDurationMs(samples), 1_000) // fallback when no tail
  assert.equal(activeDurationMs(samples, 1_500), 500)
  assert.equal(activeDurationMs(samples, 1_050), 250) // clamped to 250ms
  assert.equal(activeDurationMs(samples, 10_000), 1_000) // capped at 1s
})

test("activeDurationMs sums gaps between samples plus tail", () => {
  const samples = [
    { at: 1_000, tokens: 10 },
    { at: 1_200, tokens: 10 },
    { at: 1_500, tokens: 10 },
  ]
  assert.equal(activeDurationMs(samples, 2_000), 1_000)
})

test("formatRate formats by magnitude", () => {
  assert.equal(formatRate(150), "150")
  assert.equal(formatRate(12.34), "12.3")
  assert.equal(formatRate(4.567), "4.57")
  assert.equal(formatRate(0), undefined)
  assert.equal(formatRate(-1), undefined)
  assert.equal(formatRate(Number.NaN), undefined)
  assert.equal(formatRate(Number.POSITIVE_INFINITY), undefined)
})

test("formatTtft formats seconds", () => {
  assert.equal(formatTtft(1.234), "1.2s")
  assert.equal(formatTtft(0.05), "0.1s")
  assert.equal(formatTtft(0), "0.0s")
  assert.equal(formatTtft(-0.1), undefined)
  assert.equal(formatTtft(Number.NaN), undefined)
})

test("appendSample keeps only the rolling window", () => {
  const tracker = createTracker()
  tracker.appendSample("s1", "m1", { at: 0, tokens: 10 })
  tracker.appendSample("s1", "m1", { at: STREAM_WINDOW_MS - 1, tokens: 10 })
  tracker.appendSample("s1", "m1", { at: STREAM_WINDOW_MS + 1, tokens: 10 })
  const samples = tracker.state.samplesBySession["s1"]
  assert.equal(samples?.length, 2)
  assert.equal(samples?.[0]?.at, STREAM_WINDOW_MS - 1)
})

test("appendSample records firstDeltaAt only once", () => {
  const tracker = createTracker()
  tracker.stepStarted("m1", "s1", 100)
  tracker.appendSample("s1", "m1", { at: 200, tokens: 5 })
  tracker.appendSample("s1", "m1", { at: 300, tokens: 5 })
  assert.equal(tracker.state.timingByMessageID["m1"]?.firstDeltaAt, 200)
})

test("stepEnded accumulates exact totals with text-based TTFT", () => {
  const tracker = createTracker()
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepTextStarted("m1", 1_500)
  tracker.stepEnded("m1", "s1", 3_000, 50)

  tracker.stepStarted("m2", "s1", 5_000)
  tracker.appendSample("s1", "m2", { at: 5_300, tokens: 5 })
  tracker.stepTextStarted("m2", 5_600)
  tracker.stepEnded("m2", "s1", 7_000, 150)

  const totals = tracker.state.totalsBySession["s1"]
  assert.deepEqual(totals, {
    totalTokens: 200,
    totalStreamMs: 4_000, // (3000-1000) + (7000-5000)
    totalTtftMs: 1_100, // (1500-1000) + (5600-5000)
    stepCount: 2,
  })
})

test("stepEnded prefers an explicit ttftMs over textStartedAt", () => {
  const tracker = createTracker()
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepTextStarted("m1", 1_500)
  tracker.stepEnded("m1", "s1", 3_000, 50, 400)
  assert.equal(tracker.state.totalsBySession["s1"]?.totalTtftMs, 400)
})

test("steps without visible text contribute no TTFT but still count tokens", () => {
  const tracker = createTracker()
  // Tool-call step: reasoning deltas but no text.
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepEnded("m1", "s1", 2_000, 40)

  const totals = tracker.state.totalsBySession["s1"]
  assert.deepEqual(totals, {
    totalTokens: 40,
    totalStreamMs: 1_000,
    totalTtftMs: 0,
    stepCount: 0,
  })
})

test("stepEnded ignores steps without deltas, zero tokens, or foreign sessions", () => {
  const tracker = createTracker()

  // No deltas observed for this step.
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.stepEnded("m1", "s1", 2_000, 50)

  // Zero tokens.
  tracker.stepStarted("m2", "s1", 1_000)
  tracker.appendSample("s1", "m2", { at: 1_200, tokens: 5 })
  tracker.stepEnded("m2", "s1", 2_000, 0)

  // step.ended for a different session than step.started.
  tracker.stepStarted("m3", "s1", 1_000)
  tracker.appendSample("s1", "m3", { at: 1_200, tokens: 5 })
  tracker.stepEnded("m3", "s2", 2_000, 50)

  assert.equal(tracker.state.totalsBySession["s1"], undefined)
  // m3's timing is still removed even though the session did not match.
  assert.equal(tracker.state.timingByMessageID["m3"], undefined)
})

test("stepFailed drops pending timing", () => {
  const tracker = createTracker()
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepFailed("m1")
  assert.equal(tracker.state.timingByMessageID["m1"], undefined)
})

test("clearLiveSamples drops the live window but keeps totals", () => {
  const tracker = createTracker()
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepTextStarted("m1", 1_300)
  tracker.stepEnded("m1", "s1", 2_000, 50)
  tracker.appendSample("s1", "m2", { at: 3_000, tokens: 5 })

  tracker.clearLiveSamples("s1")
  assert.equal(tracker.state.samplesBySession["s1"], undefined)
  assert.equal(tracker.state.totalsBySession["s1"]?.stepCount, 1)
})

test("liveRate is EMA-smoothed toward the raw rate", () => {
  const tracker = createTracker()
  // 10 samples of 10 tokens over a 1s span → raw rate 100.
  for (let i = 0; i < 10; i++) {
    tracker.appendSample("s1", "m1", { at: 1_000 + i * 100, tokens: 10 })
  }
  const first = tracker.liveRate("s1", 2_000)
  assert.equal(first, 100) // first computation seeds the EMA with the raw rate

  // A later 1s burst at 200: the first batch has aged out of the 5s window.
  for (let i = 0; i < 10; i++) {
    tracker.appendSample("s1", "m2", { at: 10_000 + i * 100, tokens: 20 })
  }
  const second = tracker.liveRate("s1", 11_000)
  assert.equal(second, 100 + EMA_ALPHA * (200 - 100))
})

test("liveRate returns undefined when the window has no fresh samples", () => {
  const tracker = createTracker()
  tracker.appendSample("s1", "m1", { at: 1_000, tokens: 10 })
  assert.ok(tracker.liveRate("s1", 1_200)! > 0)
  assert.equal(tracker.liveRate("s1", 1_000 + STREAM_WINDOW_MS + 1), undefined)
})

test("lastLiveRate freezes the value and hides after HIDE_AFTER_MS", () => {
  const tracker = createTracker()
  const now = 10_000
  for (let i = 0; i < 5; i++) {
    tracker.appendSample("s1", "m1", { at: now - 400 + i * 100, tokens: 10 })
  }
  assert.ok(tracker.liveRate("s1", now)! > 0)
  const frozen = tracker.lastLiveRate("s1", now + 1_000)
  assert.ok(frozen! > 0)
  assert.equal(tracker.lastLiveRate("s1", now + HIDE_AFTER_MS + 1), undefined)
  // Once hidden, the entry is forgotten.
  assert.equal(tracker.state.liveRateBySession["s1"], undefined)
})

test("resetSession clears all tracking for one session only", () => {
  const tracker = createTracker()
  // Session s1: completed step + live samples + frozen rate.
  tracker.stepStarted("m1", "s1", 1_000)
  tracker.appendSample("s1", "m1", { at: 1_200, tokens: 5 })
  tracker.stepTextStarted("m1", 1_300)
  tracker.stepEnded("m1", "s1", 2_000, 50)
  tracker.appendSample("s1", "m2", { at: 3_000, tokens: 5 })
  tracker.liveRate("s1", 3_100)

  // Session s2: unaffected.
  tracker.stepStarted("m3", "s2", 1_000)
  tracker.appendSample("s2", "m3", { at: 1_200, tokens: 5 })
  tracker.stepTextStarted("m3", 1_300)
  tracker.stepEnded("m3", "s2", 2_000, 50)
  tracker.appendSample("s2", "m4", { at: 3_000, tokens: 5 })

  // A pending step of s1 is also dropped.
  tracker.stepStarted("m5", "s1", 5_000)

  tracker.resetSession("s1")

  assert.equal(tracker.state.samplesBySession["s1"], undefined)
  assert.equal(tracker.state.totalsBySession["s1"], undefined)
  assert.equal(tracker.state.liveRateBySession["s1"], undefined)
  assert.equal(tracker.state.timingByMessageID["m1"], undefined)
  assert.equal(tracker.state.timingByMessageID["m5"], undefined)

  // s2 keeps everything.
  assert.equal(tracker.state.totalsBySession["s2"]?.stepCount, 1)
  assert.equal(tracker.state.samplesBySession["s2"]?.length, 2)
})

test("prune drops expired samples and removes empty sessions", () => {
  const tracker = createTracker()
  const now = 10_000
  tracker.appendSample("s1", "m1", { at: now - STREAM_WINDOW_MS - 1, tokens: 5 })
  tracker.appendSample("s1", "m2", { at: now - 1_000, tokens: 5 })
  tracker.appendSample("s2", "m3", { at: now - STREAM_WINDOW_MS - 1, tokens: 5 })

  tracker.prune(now)
  assert.equal(tracker.state.samplesBySession["s1"]?.length, 1)
  assert.equal(tracker.state.samplesBySession["s2"], undefined)
  assert.ok(HIDE_AFTER_MS === STREAM_WINDOW_MS)
})
