import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildBar,
  computeUsage,
  formatInt,
  formatMoney,
  lastAssistantMessage,
  mcpStatusInfo,
  messageTokenCount,
  safeNumber,
  type MessageLike,
} from "./sidebar.ts"

function assistant(id: string, tokens?: MessageLike["tokens"]): MessageLike {
  return { id, type: "assistant", tokens }
}

test("safeNumber returns 0 for non-finite values", () => {
  assert.equal(safeNumber(5), 5)
  assert.equal(safeNumber(undefined), 0)
  assert.equal(safeNumber(NaN), 0)
  assert.equal(safeNumber(Infinity), 0)
  assert.equal(safeNumber("3"), 0)
})

test("messageTokenCount sums input/output/reasoning/cache", () => {
  const message = assistant("m1", {
    input: 10,
    output: 20,
    reasoning: 5,
    cache: { read: 3, write: 2 },
  })
  assert.equal(messageTokenCount(message), 40)
  assert.equal(messageTokenCount(assistant("m2")), 0)
  assert.equal(messageTokenCount(undefined), 0)
})

test("lastAssistantMessage picks the last assistant message with tokens", () => {
  const messages = [
    { id: "u1", type: "user" },
    assistant("a1", { input: 5, output: 5 }),
    { id: "u2", type: "user" },
    assistant("a2", { input: 5, output: 5 }),
    assistant("a3"), // running: no tokens yet
  ]
  assert.equal(lastAssistantMessage(messages)?.id, "a2")
})

test("lastAssistantMessage ignores messages before the last completed compaction", () => {
  const messages = [
    { id: "u1", type: "user" },
    assistant("a1", { input: 5, output: 5 }),
    { id: "c1", type: "compaction", status: "completed" },
    { id: "u2", type: "user" },
    assistant("a2", { input: 5, output: 5 }),
  ]
  assert.equal(lastAssistantMessage(messages)?.id, "a2")
  assert.equal(messageTokenCount(lastAssistantMessage(messages)), 10)
})

test("lastAssistantMessage respects the revert point", () => {
  const messages = [
    { id: "u1", type: "user" },
    assistant("a1", { input: 5, output: 5 }),
    { id: "u2", type: "user" },
    assistant("a2", { input: 5, output: 5 }),
  ]
  assert.equal(lastAssistantMessage(messages, "u2")?.id, "a1")
  // Revert point not in the list: no usage.
  assert.equal(lastAssistantMessage(messages, "missing"), undefined)
})

test("computeUsage returns tokens and rounded percent vs the model limit", () => {
  const messages = [
    assistant("a1", { input: 1_000, output: 500 }),
  ]
  messages[0].model = { providerID: "opencode-go", id: "qwen3.7-plus" }
  const models = [{ providerID: "opencode-go", id: "qwen3.7-plus", limit: { context: 32_000 } }]
  const usage = computeUsage(messages, models)
  assert.deepEqual(usage, { tokens: 1_500, limit: 32_000, percent: 5 })
})

test("computeUsage leaves percent undefined when the limit is unknown", () => {
  const messages = [assistant("a1", { input: 500, output: 500 })]
  assert.deepEqual(computeUsage(messages, []), { tokens: 1_000, limit: undefined, percent: undefined })
  assert.equal(computeUsage([], []), undefined)
  assert.equal(computeUsage([assistant("a1")], []), undefined)
})

test("buildBar fills, gaps, and clamps", () => {
  const full = buildBar(100)
  assert.equal(full.bar, `${"█".repeat(23)} `)
  assert.equal(full.clamped, 100)
  const empty = buildBar(0)
  assert.equal(empty.bar, "░".repeat(23))
  assert.equal(empty.clamped, 0)
  const half = buildBar(50)
  assert.equal(half.bar, `${"█".repeat(12)} ${"░".repeat(11)}`)
  assert.equal(buildBar(150).clamped, 100)
  assert.equal(buildBar(-5).clamped, 0)
})

test("formatInt and formatMoney", () => {
  assert.equal(formatInt(12345), "12,345")
  assert.equal(formatInt(-3), "0")
  assert.equal(formatMoney(0.15), "$0.15")
  assert.equal(formatMoney(1.5), "$1.50")
})

test("mcpStatusInfo maps statuses to labels and tones", () => {
  assert.deepEqual(mcpStatusInfo("connected"), { label: "Connected", tone: "success" })
  assert.deepEqual(mcpStatusInfo("failed"), { label: "Failed", tone: "error" })
  assert.deepEqual(mcpStatusInfo("disabled"), { label: "Disabled", tone: "subdued" })
  assert.deepEqual(mcpStatusInfo("needs_auth"), { label: "Needs auth", tone: "warning" })
  assert.deepEqual(mcpStatusInfo("needs_client_registration"), {
    label: "Needs client ID",
    tone: "error",
  })
  assert.deepEqual(mcpStatusInfo("weird"), { label: "weird", tone: "subdued" })
  assert.deepEqual(mcpStatusInfo(undefined), { label: "Unknown", tone: "subdued" })
})
