/** @jsxImportSource @opentui/solid */
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import {
  RECAP_MODEL_ID_DEFAULT,
  RECAP_TIMEOUT_MS,
  buildBar,
  computeUsage,
  countUserAssistant,
  formatInt,
  formatMoney,
  mcpStatusInfo,
  resolveRecapModel,
  runningAgents,
  runningShells,
  safeNumber,
  shouldAutoRecap,
  type McpServer,
  type MessageLike,
  type ModelLike,
  type ModelRef,
  type RunningAgent,
  type RunningShell,
  type SessionLike,
  type ShellLike,
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

type LocationInfo = { directory?: string; workspaceID?: string }

type Toast = {
  show: (input: {
    variant?: "info" | "success" | "warning" | "error"
    title?: string
    message: string
  }) => void
}

type PluginCtx = {
  location: LocationInfo
  theme: Theme
  data: {
    session: {
      get: (sessionID: string) =>
        | (SessionLike & { location?: LocationInfo; model?: ModelRef; revert?: { messageID?: string } })
        | undefined
      list: () => readonly SessionLike[]
      status: (sessionID: string) => string
      cost: (sessionID: string) => number
      message: { list: (sessionID: string) => readonly MessageLike[] }
    }
    shell: { list: (location?: unknown) => readonly ShellLike[] }
    location: {
      model: { list: (location: unknown) => readonly ModelLike[] | undefined }
      mcp: { server: { list: (location: unknown) => readonly McpServer[] } }
    }
  }
  client: {
    generate: {
      text: (
        input: {
          location?: { directory?: string; workspace?: string } | undefined
          prompt: string
          model?: ModelRef | null
        },
        options?: { signal?: AbortSignal },
      ) => Promise<{ text: string }>
    }
  }
  ui: {
    slot: (name: string, render: (props: { sessionID?: string }) => unknown) => void
    toast: Toast["show"]
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

// Rows are pre-rendered and shown/hidden per tick (slot bodies never re-run,
// so the number of agents/shells cannot grow dynamically). Six each is well
// past the subagent fan-out of a normal session.
const MAX_AGENTS = 6
const MAX_SHELLS = 6

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
  agents: RunningAgent[]
  shells: RunningShell[]
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

  const now = Date.now()
  let sessions: readonly SessionLike[] = []
  try {
    sessions = ctx.data.session.list() ?? []
  } catch {
    sessions = []
  }
  let shells: readonly ShellLike[] = []
  try {
    shells = ctx.data.shell.list(location) ?? []
  } catch {
    shells = []
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
    // Running subagents anywhere in the instance (any session that has a
    // parent), then in-flight shells for this session's location.
    agents: runningAgents(sessions, (id) => ctx.data.session.status(id), now),
    shells: runningShells(shells, now),
  }
}

// === recap ================================================================

const RECAP_PROMPT = [
  "Write one concrete 25-to-40-word sentence recapping the current coding work.",
  "State what changed, was decided, or was learned, then mention the next step only when concrete.",
  "Return only the sentence with no label or Markdown.",
  "Do not mention the recap, session, user, or assistant.",
].join(" ")

/** The session's messages, or [] when the accessor is unavailable. */
function sessionMessages(ctx: PluginCtx, sessionID: string): readonly MessageLike[] {
  try {
    return ctx.data.session.message.list(sessionID) ?? []
  } catch {
    return []
  }
}

/** The session's location (data shape: {directory, workspaceID}). */
function sessionLocation(ctx: PluginCtx, sessionID: string): LocationInfo | undefined {
  try {
    return ctx.data.session.get(sessionID)?.location ?? ctx.location
  } catch {
    return ctx.location
  }
}

/** The model recaps are pinned to: RECAP_MODEL_ID_DEFAULT (deepseek-v4-flash)
 *  on the session's own provider when it already serves the model, else the
 *  first location provider that serves it. */
function recapModel(ctx: PluginCtx, sessionID: string): ModelRef | undefined {
  try {
    return resolveRecapModel({
      sessionModel: ctx.data.session.get(sessionID)?.model,
      models: ctx.data.location.model.list(sessionLocation(ctx, sessionID)) ?? [],
      id: RECAP_MODEL_ID_DEFAULT,
    })
  } catch {
    return undefined
  }
}

/** Recent user/assistant text for the stateless generate.text route, which
 *  only sees the prompt, so the recap has to carry its own context. */
function sessionTranscript(messages: readonly MessageLike[]): string {
  const lines: string[] = []
  for (const message of messages.slice(-20)) {
    if (message.type === "user") {
      const value = message.text?.trim()
      if (value) lines.push(`user: ${value}`)
    } else if (message.type === "assistant") {
      const parts = (message.content ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("\n")
        .trim()
      const value = parts || message.text?.trim() || ""
      if (value) lines.push(`assistant: ${value}`)
    }
  }
  return lines.join("\n").slice(-4_000)
}

/** Push the recap line into the renderable directly — the only update path
 *  that re-renders for external plugins (see the Node note above). */
function setRecapLine(view: View, text: string | undefined) {
  if (!view.recapTextNode || view.recapTextNode.isDestroyed) return
  const value = text ?? ""
  if (view.recapTextNode.content !== value) view.recapTextNode.content = value
  if (view.recapTextNode.visible !== Boolean(value)) view.recapTextNode.visible = Boolean(value)
}

/** Generate a recap through the stateless generate.text route, pinned to the
 *  recap model, capped at RECAP_TIMEOUT_MS so a hung provider cannot pin the
 *  spinner. Manual failures surface as a toast; automatic rounds stay silent
 *  — the boundary already advanced when the attempt started, so a failed
 *  round cools down until the next 20-message boundary instead of retrying
 *  every tick. Manual clicks never move the automatic boundary. */
function generateRecap(ctx: PluginCtx, view: View, trigger: "manual" | "automatic") {
  if (view.recapBusy) return
  const messages = sessionMessages(ctx, view.sessionID)
  if (!messages.some((message) => message.type === "user")) {
    if (trigger === "manual") {
      try {
        ctx.ui.toast({
          variant: "warning",
          title: "Recap",
          message: `No user messages in session (${messages.length} total)`,
        })
      } catch {
        // toast unavailable — keep the failure silent
      }
    }
    return
  }
  const previous = view.recapTextNode?.content
  view.recapBusy = true
  const controller = new AbortController()
  setRecapLine(view, "Generating recap…")
  const activity = sessionTranscript(messages)
  const prompt = activity ? `${RECAP_PROMPT}\n\nRecent session activity:\n${activity}` : RECAP_PROMPT
  const model = recapModel(ctx, view.sessionID)
  const location = sessionLocation(ctx, view.sessionID)
  const request = location
    ? { directory: location.directory, workspace: location.workspaceID }
    : undefined
  const generation = model
    ? ctx.client.generate.text(
        { location: request, prompt, model },
        { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(RECAP_TIMEOUT_MS)]) },
      )
    : Promise.reject(new Error("Recap model unavailable"))
  generation
    .then((response) => {
      if (controller.signal.aborted) return
      const value = response.text.trim().replaceAll(/\s+/g, " ")
      if (value) {
        setRecapLine(view, `Recap: ${value}`)
        recapTexts.set(view.sessionID, `Recap: ${value}`)
        saveRecapState()
      } else {
        setRecapLine(view, previous)
      }
    })
    .catch((error) => {
      if (controller.signal.aborted) return
      console.error("[sidebar] recap generation failed", error)
      setRecapLine(view, previous)
      if (trigger === "manual") {
        try {
          ctx.ui.toast({
            variant: "error",
            title: "Recap failed",
            message: error instanceof Error ? error.message : String(error),
          })
        } catch {
          // toast unavailable — keep the failure silent
        }
      }
    })
    .finally(() => {
      view.recapBusy = false
    })
}

/** Automatic recap cadence: one recap per AUTO_RECAP_MESSAGE_COUNT
 *  user/assistant messages (20, 40, 60, …). The boundary advances when the
 *  attempt STARTS, so a failed or dropped round cools down until the next
 *  boundary instead of retrying every tick. */
function maybeAutoRecap(ctx: PluginCtx, view: View) {
  if (view.recapBusy) return
  if (!view.recapTextNode || view.recapTextNode.isDestroyed) return
  const messages = sessionMessages(ctx, view.sessionID)
  const total = countUserAssistant(messages)
  if (!shouldAutoRecap({ total, lastAutoRecapCount: view.lastAutoRecapCount })) return
  view.lastAutoRecapCount = total
  autoRecapCounts.set(view.sessionID, total)
  saveRecapState()
  generateRecap(ctx, view, "automatic")
}

type Node = { content: string; fg?: Color; visible?: boolean; isDestroyed?: boolean }
type McpNode = { bulletNode: Node | undefined; labelNode: Node | undefined; name: string }
// Fixed pre-rendered rows for the agents/shells sections; row i shows list
// item i and is hidden when the list is shorter.
type RowNodes = { bulletNode: Node | undefined; nameNode: Node | undefined; labelNode: Node | undefined }

type View = {
  barNode: Node | undefined
  percentNode: Node | undefined
  detailNode: Node | undefined
  mcpNodes: McpNode[]
  agentsHeaderNode: Node | undefined
  agentRows: RowNodes[]
  shellsHeaderNode: Node | undefined
  shellRows: RowNodes[]
  recapButtonNode: Node | undefined
  recapTextNode: Node | undefined
  recapBusy: boolean
  lastAutoRecapCount: number
  sessionID: string
}

/** Push one pre-rendered row into state for the item at its index. */
function updateRowNodes<T extends { label: string }>(
  rows: RowNodes[],
  items: readonly T[],
  getName: (item: T) => string,
): void {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const item = items[index]
    if (!row.bulletNode || !row.nameNode || !row.labelNode) continue
    if (row.bulletNode.visible !== (item !== undefined)) row.bulletNode.visible = item !== undefined
    if (row.nameNode.visible !== (item !== undefined)) row.nameNode.visible = item !== undefined
    if (row.labelNode.visible !== (item !== undefined)) row.labelNode.visible = item !== undefined
    if (!item) continue
    const name = getName(item)
    if (row.nameNode.content !== name) row.nameNode.content = name
    if (row.labelNode.content !== item.label) row.labelNode.content = item.label
  }
}

function updateSection<T extends { label: string }>(
  header: Node | undefined,
  rows: RowNodes[],
  items: readonly T[],
  getName: (item: T) => string,
): void {
  if (header && header.visible !== (items.length > 0)) header.visible = items.length > 0
  updateRowNodes(rows, items, getName)
}

// A tab per session; each session view mounts its own sidebar, so track a
// view per session and push updates into whichever nodes are still alive.
const views = new Map<string, View>()
let intervalId: ReturnType<typeof setInterval> | undefined

// === recap persistence ====================================================
// The auto boundary and last recap text live per session at module level and
// are mirrored to a JSON file in the state dir, so a re-rendered slot body,
// a hot-reloaded module, or a TUI restart cannot reset the auto cadence or
// wipe the recap while the session is idle.

const MAX_STATE_SESSIONS = 30
const STATE_PATH = join(homedir(), ".local", "state", "opencode", "recap-state.json")
const autoRecapCounts = new Map<string, number>()
const recapTexts = new Map<string, string>()

function loadRecapState() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf-8")) as Record<
      string,
      { count?: unknown; text?: unknown }
    >
    for (const [id, entry] of Object.entries(parsed)) {
      if (typeof entry?.count === "number") autoRecapCounts.set(id, entry.count)
      if (typeof entry?.text === "string" && entry.text) recapTexts.set(id, entry.text)
    }
  } catch {
    // missing or corrupt state file — start fresh
  }
}

function saveRecapState() {
  try {
    mkdirSync(join(homedir(), ".local", "state", "opencode"), { recursive: true })
    const entries = Object.fromEntries(
      [...autoRecapCounts.keys()]
        .slice(-MAX_STATE_SESSIONS)
        .map((id) => [id, { count: autoRecapCounts.get(id), text: recapTexts.get(id) ?? "" }] as const),
    )
    writeFileSync(STATE_PATH, JSON.stringify(entries))
  } catch {
    // state file unwritable — keep running without persistence
  }
}

export default {
  id: "npv12.context-sidebar",
  setup(ctx: PluginCtx) {
    // Restore the per-session auto boundary and last recap text, then the
    // tick below can never regenerate while the session is idle.
    loadRecapState()
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
          view.mcpNodes.every((entry) => !alive(entry.bulletNode) && !alive(entry.labelNode)) &&
          !alive(view.agentsHeaderNode) &&
          view.agentRows.every((row) => !alive(row.bulletNode) && !alive(row.nameNode) && !alive(row.labelNode)) &&
          !alive(view.shellsHeaderNode) &&
          view.shellRows.every((row) => !alive(row.bulletNode) && !alive(row.nameNode) && !alive(row.labelNode)) &&
          !alive(view.recapButtonNode) &&
          !alive(view.recapTextNode)
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
          updateSection(view.agentsHeaderNode, view.agentRows, display.agents, (agent) => agent.name)
          updateSection(view.shellsHeaderNode, view.shellRows, display.shells, (shell) => shell.command)
        } catch {
          views.delete(sessionID)
        }
        maybeAutoRecap(ctx, view)
      }
    }, TICK_MS)

    ctx.ui.slot("sidebar.content", (props: SidebarProps) => {
      if (!props.sessionID) return null
      const view: View = {
        barNode: undefined,
        percentNode: undefined,
        detailNode: undefined,
        mcpNodes: [],
        agentsHeaderNode: undefined,
        agentRows: Array.from({ length: MAX_AGENTS }, () => ({
          bulletNode: undefined,
          nameNode: undefined,
          labelNode: undefined,
        })),
        shellsHeaderNode: undefined,
        shellRows: Array.from({ length: MAX_SHELLS }, () => ({
          bulletNode: undefined,
          nameNode: undefined,
          labelNode: undefined,
        })),
        recapButtonNode: undefined,
        recapTextNode: undefined,
        recapBusy: false,
        lastAutoRecapCount: autoRecapCounts.get(props.sessionID) ?? 0,
        sessionID: props.sessionID,
      }
      views.set(props.sessionID, view)
      const initial = computeDisplay(ctx, props.sessionID)
      const initialRecapText = recapTexts.get(props.sessionID) ?? ""
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
          <text
            ref={(node: any) => {
              view.agentsHeaderNode = node
              node.visible = initial.agents.length > 0
            }}
            fg={ctx.theme.text.default}
            marginTop={1}
          >
            <b>Agents</b>
          </text>
          {view.agentRows.map((row, index) => (
            <box flexDirection="row" gap={1}>
              <text
                ref={(node: any) => {
                  row.bulletNode = node
                  node.visible = index < initial.agents.length
                }}
                fg={healthyColor(ctx.theme)}
                flexShrink={0}
              >
                ●
              </text>
              <text
                ref={(node: any) => {
                  row.nameNode = node
                  node.visible = index < initial.agents.length
                }}
                fg={ctx.theme.text.default}
                wrapMode="none"
                truncate
                flexShrink={1}
              >
                {initial.agents[index]?.name ?? ""}
              </text>
              <text
                ref={(node: any) => {
                  row.labelNode = node
                  node.visible = index < initial.agents.length
                }}
                fg={ctx.theme.text.subdued}
                wrapMode="none"
                truncate
                flexShrink={1}
              >
                {initial.agents[index]?.label ?? ""}
              </text>
            </box>
          ))}
          <text
            ref={(node: any) => {
              view.shellsHeaderNode = node
              node.visible = initial.shells.length > 0
            }}
            fg={ctx.theme.text.default}
            marginTop={1}
          >
            <b>Shells</b>
          </text>
          {view.shellRows.map((row, index) => (
            <box flexDirection="row" gap={1}>
              <text
                ref={(node: any) => {
                  row.bulletNode = node
                  node.visible = index < initial.shells.length
                }}
                fg={ctx.theme.text.subdued}
                flexShrink={0}
              >
                $
              </text>
              <text
                ref={(node: any) => {
                  row.nameNode = node
                  node.visible = index < initial.shells.length
                }}
                fg={ctx.theme.text.default}
                wrapMode="none"
                truncate
                flexShrink={1}
              >
                {initial.shells[index]?.command ?? ""}
              </text>
              <text
                ref={(node: any) => {
                  row.labelNode = node
                  node.visible = index < initial.shells.length
                }}
                fg={ctx.theme.text.subdued}
                wrapMode="none"
                truncate
                flexShrink={1}
              >
                {initial.shells[index]?.label ?? ""}
              </text>
            </box>
          ))}
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
          <text
            ref={(node: any) => {
              view.recapButtonNode = node
            }}
            fg={ctx.theme.text.default}
            marginTop={1}
            onMouseUp={() => generateRecap(ctx, view, "manual")}
          >
            <b>Recap</b>
          </text>
          <text
            ref={(node: any) => {
              view.recapTextNode = node
              node.visible = Boolean(initialRecapText)
            }}
            fg={ctx.theme.text.subdued}
            wrapMode="word"
            flexShrink={1}
          >
            {initialRecapText}
          </text>
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
