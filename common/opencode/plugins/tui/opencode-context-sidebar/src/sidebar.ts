/**
 * Pure helpers for the context sidebar: token usage of the last completed
 * assistant message, percent of the model's context window, and display
 * formatting. The usage rules mirror the built-in sidebar of opencode2
 * next-16650 exactly: tokens are taken from the last assistant message that
 * has a final token count (i.e. after the last completed compaction and
 * before the revert point), summed over input/output/reasoning/cache; the
 * percent is that sum over the current model's context limit.
 */

export type MessageLike = {
  id: string
  type?: string
  status?: string
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
  cost?: number
  model?: { providerID?: string; id?: string; variant?: string }
}

export type ModelLike = {
  providerID?: string
  id?: string
  limit?: { context?: number }
}

export type McpServer = {
  name?: string
  status?: { status?: string }
}

export type McpTone = "success" | "error" | "warning" | "subdued"

/** Display label and color tone for an MCP server status, mirroring the
 *  built-in sidebar panel. */
export function mcpStatusInfo(status: string | undefined): { label: string; tone: McpTone } {
  switch (status) {
    case "connected":
      return { label: "Connected", tone: "success" }
    case "failed":
      return { label: "Failed", tone: "error" }
    case "disabled":
      return { label: "Disabled", tone: "subdued" }
    case "needs_auth":
      return { label: "Needs auth", tone: "warning" }
    case "needs_client_registration":
      return { label: "Needs client ID", tone: "error" }
    default:
      return { label: status ?? "Unknown", tone: "subdued" }
  }
}

export function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** Total tokens of one message: input + output + reasoning + cache reads/writes. */
export function messageTokenCount(message: MessageLike | undefined): number {
  if (!message?.tokens) return 0
  const tokens = message.tokens
  return (
    safeNumber(tokens.input) +
    safeNumber(tokens.output) +
    safeNumber(tokens.reasoning) +
    safeNumber(tokens.cache?.read) +
    safeNumber(tokens.cache?.write)
  )
}

/**
 * The last assistant message with a final token count: the running message
 * has no tokens yet, messages before the last completed compaction are
 * summarized away, and messages at/after the revert point are gone.
 */
export function lastAssistantMessage(
  messages: readonly MessageLike[],
  revertMessageID?: string,
): MessageLike | undefined {
  const revertIndex = revertMessageID ? messages.findIndex((m) => m.id === revertMessageID) : -1
  if (revertMessageID && revertIndex === -1) return undefined
  const end = revertIndex === -1 ? messages.length : revertIndex
  const lastCompaction = messages.findLastIndex(
    (m, index) => m.type === "compaction" && m.status === "completed" && index < end,
  )
  return messages.findLast(
    (m, index) => m.type === "assistant" && m.tokens !== undefined && index > lastCompaction && index < end,
  )
}

export type Usage = {
  tokens: number
  limit: number | undefined
  percent: number | undefined
}

/** Usage of the last completed assistant message vs the model's context limit. */
export function computeUsage(
  messages: readonly MessageLike[],
  models: readonly ModelLike[] | undefined,
  revertMessageID?: string,
): Usage | undefined {
  const message = lastAssistantMessage(messages, revertMessageID)
  if (!message) return undefined
  const tokens = messageTokenCount(message)
  if (tokens <= 0) return undefined
  const model = models?.find(
    (candidate) =>
      candidate.providerID === message.model?.providerID && candidate.id === message.model?.id,
  )
  const limit = safeNumber(model?.limit?.context)
  return {
    tokens,
    limit: limit > 0 ? limit : undefined,
    percent: limit > 0 ? Math.round((tokens / limit) * 100) : undefined,
  }
}

export const BAR_WIDTH = 24

// The unfilled part uses the light-shade block U+2591 (░). Ghostty renders
// shade characters with internal gray sprites that are near-invisible on
// dark backgrounds unless the config maps them back to a font:
// `font-codepoint-map = U+2591-U+2593=<font-family>`.
const GRAINY = "░"
const SOLID = "█"

/** Solid fill, then a one-column gap, then the grainy remainder. */
export function buildBar(percent: number): { bar: string; clamped: number } {
  const clamped = Math.max(0, Math.min(100, percent))
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((clamped / 100) * BAR_WIDTH)))
  const solid = Math.min(filled, BAR_WIDTH - 1)
  const grainy = BAR_WIDTH - solid - 1
  if (solid === 0) {
    return {
      bar: `${GRAINY.repeat(grainy)}`,
      clamped,
    }
  }
  return {
    bar: `${SOLID.repeat(solid)} ${GRAINY.repeat(grainy)}`,
    clamped,
  }
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)))
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}
