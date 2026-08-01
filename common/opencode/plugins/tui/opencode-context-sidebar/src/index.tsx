/** @jsxImportSource @opentui/solid */
import {
  buildBar,
  computeUsage,
  formatInt,
  formatMoney,
  mcpStatusInfo,
  safeNumber,
  type McpServer,
  type MessageLike,
  type ModelLike,
} from "./sidebar.ts"

// Local plugin-context types matching the TUI plugin runtime bundled in
// opencode2 next-16650 (module shape { id, setup }, ctx.ui.slot,
// ctx.data.session.message.list / session.get / session.cost /
// location.model.list / location.mcp.server.list). The installed
// @opencode-ai/plugin@1.17.16 package exports neither `Plugin.define` nor
// matching context types, so this file never imports it at runtime and types
// the context locally.
type Color = any // RGBA object or hex string, accepted by <text fg=...>

type Theme = {
  text: {
    default?: Color
    subdued?: Color
    feedback?: {
      warning?: { default?: Color }
      error?: { default?: Color }
      success?: { default?: Color }
    }
  }
  hue?: { blue?: Record<number, Color> }
}

type PluginCtx = {
  theme: Theme
  data: {
    session: {
      get: (sessionID: string) => { location?: unknown; revert?: { messageID?: string } } | undefined
      cost: (sessionID: string) => number
      message: { list: (sessionID: string) => readonly MessageLike[] }
    }
    location: {
      model: { list: (location: unknown) => readonly ModelLike[] | undefined }
      mcp: { server: { list: (location: unknown) => readonly McpServer[] } }
    }
  }
  ui: {
    slot: (name: string, render: (props: { sessionID?: string }) => unknown) => void
  }
}

type SidebarProps = { sessionID?: string }

// next-16650 loads external plugins with their own solid-js copy, so signals
// created here are invisible to the host renderer and slot bodies never
// re-run. Instead the interval below pushes fresh text straight into the
// TextRenderables via their `content`/`fg` setters (re-measures + re-renders).
const TICK_MS = 500

const BAR_THRESHOLD_WARNING = 70
const BAR_THRESHOLD_ERROR = 90

/** Bar color for a healthy context window (blue); falls back to the default
 *  text color when the theme does not expose the hue scale. The 200 shade is
 *  the dark-mode blue; light mode would use 700. */
function healthyColor(theme: Theme): Color | undefined {
  const blue = theme.hue?.blue?.[200]
  return blue ?? theme.text?.default
}

function barColor(theme: Theme, percent: number | undefined): Color | undefined {
  if (percent === undefined) return healthyColor(theme)
  if (percent >= BAR_THRESHOLD_ERROR) return theme.text?.feedback?.error?.default ?? healthyColor(theme)
  if (percent >= BAR_THRESHOLD_WARNING) return theme.text?.feedback?.warning?.default ?? healthyColor(theme)
  return healthyColor(theme)
}

function mcpColor(theme: Theme, tone: "success" | "error" | "warning" | "subdued"): Color | undefined {
  switch (tone) {
    case "success":
      return theme.text?.feedback?.success?.default
    case "error":
      return theme.text?.feedback?.error?.default
    case "warning":
      return theme.text?.feedback?.warning?.default
    default:
      return theme.text?.subdued
  }
}

/** Session cost from the store, falling back to summing assistant message
 *  costs when the accessor is unavailable. */
function sessionCost(ctx: PluginCtx, sessionID: string, messages: readonly MessageLike[]): number {
  try {
    const cost = ctx.data.session.cost(sessionID)
    if (typeof cost === "number" && Number.isFinite(cost)) return cost
  } catch {
    // accessor missing on this build; fall through to the message sum
  }
  return messages.reduce((sum, message) => sum + safeNumber(message.cost), 0)
}

type Display = {
  bar: string
  percent: string
  detail: string
  barColor: Color | undefined
  mcpLines: { name: string; label: string; color: Color | undefined }[]
}

function computeDisplay(ctx: PluginCtx, sessionID: string): Display {
  let messages: readonly MessageLike[] = []
  let models: readonly ModelLike[] | undefined
  let location: unknown
  let revertMessageID: string | undefined
  try {
    messages = ctx.data.session.message.list(sessionID) ?? []
  } catch {
    messages = []
  }
  try {
    const session = ctx.data.session.get(sessionID)
    location = session?.location
    revertMessageID = session?.revert?.messageID
  } catch {
    // accessors missing; everything below stays empty
  }
  try {
    models = location === undefined ? undefined : ctx.data.location.model.list(location) ?? []
  } catch {
    models = undefined
  }

  const usage = computeUsage(messages, models, revertMessageID)
  const tokens = usage?.tokens ?? 0
  const limit = usage?.limit
  const percent = usage?.percent
  const bar = buildBar(percent ?? 0)
  const detail = `${formatInt(tokens)} / ${limit === undefined ? "--" : formatInt(limit)} / ${formatMoney(sessionCost(ctx, sessionID, messages))}`

  let servers: readonly McpServer[] = []
  try {
    servers = location === undefined ? [] : ctx.data.location.mcp.server.list(location) ?? []
  } catch {
    servers = []
  }

  return {
    // Bar and percent are separate renderables, like the original
    // context-progress plugin: bar chars, then a gap, then the percentage.
    bar: bar.bar,
    percent: ` ${bar.clamped}%`,
    detail,
    barColor: barColor(ctx.theme, percent),
    // Each server line is three parts: a status-colored bullet, the name in
    // the default color, and the status label in subdued gray.
    mcpLines: servers.map((server) => {
      const info = mcpStatusInfo(server.status?.status)
      return {
        name: server.name ?? "?",
        label: info.label,
        color: mcpColor(ctx.theme, info.tone),
      }
    }),
  }
}

type Node = { content: string; fg?: Color; visible?: boolean; isDestroyed?: boolean }
type McpNode = { bulletNode: Node | undefined; labelNode: Node | undefined; name: string }

type View = {
  barNode: Node | undefined
  percentNode: Node | undefined
  detailNode: Node | undefined
  mcpNodes: McpNode[]
  sessionID: string
}

// A tab per session; each session view mounts its own sidebar, so track a
// view per session and push updates into whichever nodes are still alive.
const views = new Map<string, View>()
let intervalId: ReturnType<typeof setInterval> | undefined

export default {
  id: "npv12.context-sidebar",
  setup(ctx: PluginCtx) {
    // Hot reload re-runs setup in a fresh module instance; guard against
    // leaked intervals from a previous generation.
    if (intervalId !== undefined) clearInterval(intervalId)
    intervalId = setInterval(() => {
      for (const [sessionID, view] of views) {
        const alive = (node: Node | undefined) => node && !node.isDestroyed
        if (
          !alive(view.barNode) &&
          !alive(view.percentNode) &&
          !alive(view.detailNode) &&
          view.mcpNodes.every((entry) => !alive(entry.bulletNode) && !alive(entry.labelNode))
        ) {
          views.delete(sessionID)
          continue
        }
        if (view.barNode && view.barNode.visible === false) continue
        const display = computeDisplay(ctx, sessionID)
        try {
          if (view.barNode) {
            if (view.barNode.content !== display.bar) view.barNode.content = display.bar
            if (view.barNode.fg !== display.barColor) view.barNode.fg = display.barColor
          }
          if (view.percentNode) {
            if (view.percentNode.content !== display.percent) view.percentNode.content = display.percent
            if (view.percentNode.fg !== display.barColor) view.percentNode.fg = display.barColor
          }
          if (view.detailNode && view.detailNode.content !== display.detail) {
            view.detailNode.content = display.detail
          }
          // MCP lines are snapshotted at render (new servers appear on the
          // next TUI start); update the captured nodes by server name.
          for (const entry of view.mcpNodes) {
            const line = display.mcpLines.find((candidate) => candidate.name === entry.name)
            if (!entry.bulletNode || !entry.labelNode) continue
            if (!line) {
              if (entry.bulletNode.visible !== false) entry.bulletNode.visible = false
              if (entry.labelNode.visible !== false) entry.labelNode.visible = false
              continue
            }
            if (entry.bulletNode.fg !== line.color) entry.bulletNode.fg = line.color
            if (entry.labelNode.content !== line.label) entry.labelNode.content = line.label
          }
        } catch {
          views.delete(sessionID)
        }
      }
    }, TICK_MS)

    ctx.ui.slot("sidebar.content", (props: SidebarProps) => {
      if (!props.sessionID) return null
      const view: View = {
        barNode: undefined,
        percentNode: undefined,
        detailNode: undefined,
        mcpNodes: [],
        sessionID: props.sessionID,
      }
      views.set(props.sessionID, view)
      const initial = computeDisplay(ctx, props.sessionID)
      return (
        <box flexDirection="column">
          <text fg={ctx.theme.text.default}>
            <b>Context</b>
          </text>
          <box flexDirection="row" gap={1}>
            <text
              ref={(node: any) => {
                view.barNode = node
              }}
              fg={initial.barColor}
              wrapMode="none"
              truncate
              flexShrink={1}
            >
              {initial.bar}
            </text>
            <text
              ref={(node: any) => {
                view.percentNode = node
              }}
              fg={initial.barColor}
              wrapMode="none"
              truncate
              flexShrink={1}
            >
              {initial.percent}
            </text>
          </box>
          <text
            ref={(node: any) => {
              view.detailNode = node
            }}
            fg={ctx.theme.text.subdued}
            wrapMode="none"
            truncate
            flexShrink={1}
          >
            {initial.detail}
          </text>
          {initial.mcpLines.length > 0 ? (
            <>
              <text fg={ctx.theme.text.default} marginTop={1}>
                <b>MCP</b>
              </text>
              {initial.mcpLines.map((line) => (
                <box flexDirection="row" gap={1}>
                  <text
                    ref={(node: any) => {
                      view.mcpNodes.push({ bulletNode: node, labelNode: undefined, name: line.name })
                    }}
                    fg={line.color}
                    flexShrink={0}
                  >
                    •
                  </text>
                  <text fg={ctx.theme.text.default} wrapMode="none" truncate flexShrink={1}>
                    {line.name}
                  </text>
                  <text
                    ref={(node: any) => {
                      const entry = view.mcpNodes.find((candidate) => candidate.name === line.name)
                      if (entry) entry.labelNode = node
                    }}
                    fg={ctx.theme.text.subdued}
                    wrapMode="none"
                    truncate
                    flexShrink={1}
                  >
                    {line.label}
                  </text>
                </box>
              ))}
            </>
          ) : null}
        </box>
      )
    })

    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
      views.clear()
    }
  },
}
