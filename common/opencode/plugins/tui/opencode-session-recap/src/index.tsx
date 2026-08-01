/** @jsxImportSource @opentui/solid */

// Ported from kitlangton/opencode-plugins `session-recap` (MIT):
// https://github.com/kitlangton/opencode-plugins — shows a one-sentence recap
// of the session above the composer. The original generated after 3 user
// turns + 3 minutes of the terminal being unfocused; this port uses a plain
// timer instead: every 5 minutes (RECAP_INTERVAL_MS env override, in
// milliseconds, for testing) an eligible session gets a fresh recap. New
// input dismisses it. Generation is read-only: a side request that never
// enters the transcript, and the revision check drops the recap if the
// session changed while it was being generated.
//
// Recaps are pinned to deepseek-v4-flash (RECAP_MODEL_ID env override):
// the stateless generate.text route takes an explicit model ref, resolved
// against the session's location model list so the serving provider (e.g.
// opencode-go vs deepseek) is picked automatically. Since that route only
// sees the prompt, the prompt carries the recent transcript itself; when
// the pinned model is unavailable it falls back to session.generate, which
// uses the session's own model and injects the full session context.
//
// Local plugin-context types matching the TUI plugin runtime bundled in
// opencode2 next-16650 (module shape { id, setup }, ctx.ui.slot,
// ctx.ui.router.current, ctx.data.on, ctx.client.session.wait/generate,
// ctx.keymap.layer). The installed @opencode-ai/plugin@1.17.16 package
// exports neither `Plugin.define` nor matching context types, so this file
// never imports it at runtime and types the context locally.
//
// next-16650 loads external plugins with their own solid-js copy, so signals
// created here are invisible to the host renderer and slot bodies never
// re-run. Instead the tick below drives everything by pushing directly into
// the renderables via their `content`/`visible` setters (re-measures +
// re-renders), like opencode-context-sidebar does.
import { automaticRecapEligible, recapIntervalMs } from "./eligibility.ts"

const RECAP_PROMPT = [
  "Write one concrete 25-to-40-word sentence recapping the current coding work.",
  "State what changed, was decided, or was learned, then mention the next step only when concrete.",
  "Return only the sentence with no label or Markdown.",
  "Do not mention the recap, session, user, or assistant.",
].join(" ")

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const TICK_MS = 1_000
const SPINNER_MS = 80
const RECAP_INTERVAL_MS = recapIntervalMs()

type Node = { content?: string; visible?: boolean; isDestroyed?: boolean }

type MessageLike = {
  id: string
  type?: string
  text?: string
  content?: readonly { type?: string; text?: string }[]
}

type LocationInfo = { directory?: string; workspaceID?: string }

type ModelRef = { providerID: string; id: string; variant?: string }

type View = {
  sessionID: string
  boxNode: Node | undefined
  textNode: Node | undefined
  stopListening: (() => void) | undefined
  lastAutoRecapAt: number
  lastAutomaticUserID: string | undefined
  generating: boolean
  controller: AbortController | undefined
  spinnerTimer: ReturnType<typeof setInterval> | undefined
}

type Route = { type?: string; sessionID?: string }

type PluginCtx = {
  location: LocationInfo
  data: {
    on: (
      event: string,
      handler: (event: { data: { sessionID?: string; input?: { type?: string } } }) => void,
    ) => () => void
    session: {
      get: (sessionID: string) => { location?: LocationInfo; model?: ModelRef } | undefined
      message: { list: (sessionID: string) => readonly MessageLike[] }
      pending: { list: (sessionID: string) => readonly unknown[] }
    }
    location: {
      model: { list: (location?: LocationInfo) => readonly ModelRef[] | undefined }
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
    session: {
      wait: (input: { sessionID: string }, options?: { signal?: AbortSignal }) => Promise<unknown>
      generate: (
        input: { sessionID: string; prompt: string },
        options?: { signal?: AbortSignal },
      ) => Promise<{ text: string }>
    }
  }
  keymap: { layer: (layer: () => unknown) => void }
  ui: {
    router: { current: () => Route }
    slot: (name: string, render: (props: { sessionID?: string }) => unknown) => void
  }
}

// A tab per session; each session's composer mounts its own recap slot, so
// track a view per session and drive it from the global tick.
const views = new Map<string, View>()
let tickId: ReturnType<typeof setInterval> | undefined
let keymapRegistered = false

function userMessages(ctx: PluginCtx, view: View): readonly MessageLike[] {
  try {
    return ctx.data.session.message
      .list(view.sessionID)
      .filter((message) => message.type === "user")
  } catch {
    return []
  }
}

/** Snapshot of everything that would make a recap stale: user turns and
 *  queued prompts. Assistant-message mutations (streaming text, step
 *  metadata, completion times) are deliberately excluded — they churn while
 *  the recap is being generated and would otherwise drop every recap and
 *  trigger an immediate duplicate generation. */
function revision(ctx: PluginCtx, view: View): string {
  try {
    return JSON.stringify({
      users: userMessages(ctx, view).map((message) => message.id),
      pending: ctx.data.session.pending
        .list(view.sessionID)
        .map((item: unknown) => (item as { id?: string } | undefined)?.id),
    })
  } catch {
    return ""
  }
}

/** The session's location (data shape: {directory, workspaceID}). */
function sessionLocation(ctx: PluginCtx, view: View): LocationInfo | undefined {
  try {
    return ctx.data.session.get(view.sessionID)?.location ?? ctx.location
  } catch {
    return ctx.location
  }
}

/** The model recaps are pinned to: RECAP_MODEL_ID env override, default
 *  deepseek-v4-flash. Candidates, best first: the session's own provider when
 *  it already serves the model (proven working), then every provider serving
 *  it at the session's location, deduplicated. generateText tries each in
 *  order until one succeeds. */
function recapModelCandidates(ctx: PluginCtx, view: View): ModelRef[] {
  const id = process.env.RECAP_MODEL_ID || "deepseek-v4-flash"
  const candidates: ModelRef[] = []
  const seen = new Set<string>()
  try {
    const session = ctx.data.session.get(view.sessionID)
    if (session?.model?.id === id) {
      candidates.push({ providerID: session.model.providerID, id: session.model.id })
      seen.add(`${session.model.providerID}/${id}`)
    }
    for (const model of ctx.data.location.model.list(sessionLocation(ctx, view)) ?? []) {
      if (model.id !== id) continue
      const key = `${model.providerID}/${model.id}`
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ providerID: model.providerID, id: model.id })
    }
  } catch {
    return candidates
  }
  return candidates
}

/** Recent user/assistant text for the stateless generate.text route, which
 *  only sees the prompt, so the recap has to carry its own context. */
function sessionTranscript(ctx: PluginCtx, view: View): string {
  try {
    const lines: string[] = []
    for (const message of ctx.data.session.message.list(view.sessionID).slice(-8)) {
      if (message.type === "user") {
        const text = message.text?.trim()
        if (text) lines.push(`user: ${text}`)
      } else if (message.type === "assistant") {
        const text = (message.content ?? [])
          .filter((part) => part.type === "text")
          .map((part) => part.text ?? "")
          .join("\n")
          .trim()
        if (text) lines.push(`assistant: ${text}`)
      }
    }
    return lines.join("\n").slice(-4_000)
  } catch {
    return ""
  }
}

/** One-shot generation pinned to the recap model; tries each provider
 *  serving it (session's provider first, then the location's), falling back
 *  to the session's own model (session.generate) when none works. */
function generateText(
  ctx: PluginCtx,
  view: View,
  prompt: string,
  signal: AbortSignal,
): Promise<{ text: string }> {
  const candidates = recapModelCandidates(ctx, view)
  const location = sessionLocation(ctx, view)
  const request = location
    ? { directory: location.directory, workspace: location.workspaceID }
    : undefined
  let attempt: Promise<{ text: string }> = Promise.reject(new Error("No recap model candidates"))
  for (const model of candidates) {
    attempt = attempt.catch(() => ctx.client.generate.text({ location: request, prompt, model }, { signal }))
  }
  return attempt.catch(() =>
    ctx.client.session.generate({ sessionID: view.sessionID, prompt: RECAP_PROMPT }, { signal }),
  )
}

function setGenerating(view: View, value: boolean) {
  view.generating = value
  if (view.spinnerTimer !== undefined) {
    clearInterval(view.spinnerTimer)
    view.spinnerTimer = undefined
  }
  if (!value || !view.textNode) return
  let frame = 0
  const spin = () => {
    frame = (frame + 1) % SPINNER_FRAMES.length
    if (view.textNode) view.textNode.content = `${SPINNER_FRAMES[frame]} Generating recap...`
  }
  view.textNode.content = `${SPINNER_FRAMES[0]} Generating recap...`
  view.spinnerTimer = setInterval(spin, SPINNER_MS)
}

function dismiss(ctx: PluginCtx, view: View, markHandled: boolean) {
  view.controller?.abort()
  view.controller = undefined
  if (markHandled) view.lastAutomaticUserID = userMessages(ctx, view).at(-1)?.id
  setGenerating(view, false)
  if (view.textNode) view.textNode.content = ""
  if (view.boxNode) view.boxNode.visible = false
}

function generate(ctx: PluginCtx, view: View, trigger: "manual" | "automatic") {
  const latest = userMessages(ctx, view).at(-1)
  if (!latest) return
  view.controller?.abort()
  const request = new AbortController()
  view.controller = request
  // Keep the current recap so a failed regeneration can restore it.
  const previous = view.textNode?.content
  const previousVisible = view.boxNode?.visible
  setGenerating(view, true)
  if (view.boxNode) view.boxNode.visible = true
  void ctx.client.session
    .wait({ sessionID: view.sessionID }, { signal: request.signal })
    .then(() => {
      const before = revision(ctx, view)
      const transcript = sessionTranscript(ctx, view)
      const prompt = transcript ? `${RECAP_PROMPT}\n\nRecent session activity:\n${transcript}` : RECAP_PROMPT
      return generateText(ctx, view, prompt, request.signal).then((response) => ({
        before,
        text: response.text.trim().replaceAll(/\s+/g, " "),
      }))
    })
    .then((response) => {
      if (request.signal.aborted) return
      const restore = () => {
        if (view.textNode) view.textNode.content = previous ?? ""
        if (view.boxNode) view.boxNode.visible = previousVisible ?? false
      }
      if (response.before !== revision(ctx, view)) {
        setGenerating(view, false)
        restore()
        return
      }
      if (view.textNode) view.textNode.content = response.text ? `Recap: ${response.text}` : ""
      if (view.boxNode) view.boxNode.visible = Boolean(response.text)
      setGenerating(view, false)
      if (response.text && trigger === "automatic") {
        view.lastAutomaticUserID = latest.id
        view.lastAutoRecapAt = Date.now()
      }
    })
    .catch(() => {
      if (request.signal.aborted) return
      setGenerating(view, false)
      if (view.textNode) view.textNode.content = previous ?? ""
      if (view.boxNode) view.boxNode.visible = previousVisible ?? false
    })
}

function generateAutomatic(ctx: PluginCtx, view: View) {
  if (view.generating) return
  if (
    !automaticRecapEligible({
      userIDs: userMessages(ctx, view).map((message) => message.id),
      lastAutomaticUserID: view.lastAutomaticUserID,
    })
  )
    return
  generate(ctx, view, "automatic")
}

/** The session whose composer is currently focused, if it has a recap view. */
function focusedView(ctx: PluginCtx): View | undefined {
  let sessionID: string | undefined
  try {
    const route = ctx.ui.router.current()
    sessionID = route?.type === "session" ? route.sessionID : undefined
  } catch {
    sessionID = undefined
  }
  return sessionID === undefined ? undefined : views.get(sessionID)
}

function dropView(view: View) {
  view.controller?.abort()
  if (view.spinnerTimer !== undefined) clearInterval(view.spinnerTimer)
  view.stopListening?.()
  views.delete(view.sessionID)
}

export default {
  id: "npv12.session-recap",
  setup(ctx: PluginCtx) {
    // Hot reload re-runs setup in a fresh module instance; guard against
    // leaked intervals from a previous generation.
    if (tickId !== undefined) clearInterval(tickId)
    tickId = setInterval(() => {
      const now = Date.now()
      for (const [sessionID, view] of views) {
        if (!view.boxNode || view.boxNode.isDestroyed) {
          dropView(view)
          continue
        }
        if (view.generating) continue
        if (now - view.lastAutoRecapAt >= RECAP_INTERVAL_MS) generateAutomatic(ctx, view)
      }
    }, TICK_MS)

    ctx.ui.slot("session.composer.top", (props: { sessionID?: string }) => {
      if (!props.sessionID) return null
      // The composer can re-render (hot reload, tab switches); replace any
      // stale view for the same session instead of leaking its listeners.
      const existing = views.get(props.sessionID)
      if (existing) dropView(existing)
      const view: View = {
        sessionID: props.sessionID,
        boxNode: undefined,
        textNode: undefined,
        stopListening: undefined,
        lastAutoRecapAt: Date.now(),
        lastAutomaticUserID: undefined,
        generating: false,
        controller: undefined,
        spinnerTimer: undefined,
      }
      views.set(props.sessionID, view)
      // keymap.layer reads the Keymap context, so it must be called from
      // inside the render tree (a slot body), not from setup. Register the
      // layer once per module instance, mode "global" (same as the original
      // plugin and the built-in session commands): the commands show up in
      // the command palette (ctrl+p) and via /recap in any mode.
      if (!keymapRegistered) {
        keymapRegistered = true
        ctx.keymap.layer(() => ({
          mode: "global",
          commands: [
            {
              id: "session.recap",
              title: "Generate session recap",
              group: "Session",
              palette: true,
              slash: { name: "recap" },
              run: () => {
                const view = focusedView(ctx)
                if (view) generate(ctx, view, "manual")
              },
            },
            {
              id: "session.recap.dismiss",
              title: "Dismiss session recap",
              group: "Session",
              palette: true,
              run: () => {
                const view = focusedView(ctx)
                if (view) dismiss(ctx, view, true)
              },
            },
          ],
        }))
      }
      // New input dismisses the recap; it is also the activity that makes
      // the next timer tick eligible again.
      view.stopListening = ctx.data.on("session.input.admitted", (event) => {
        if (event.data.sessionID !== props.sessionID || event.data.input?.type !== "user") return
        dismiss(ctx, view, false)
      })
      return (
        <box
          ref={(node: any) => {
            view.boxNode = node
            node.visible = false
          }}
          width="100%"
          paddingLeft={3}
          paddingRight={3}
          paddingBottom={1}
          onMouseUp={() => dismiss(ctx, view, true)}
        >
          <text
            ref={(node: any) => {
              view.textNode = node
            }}
            wrapMode="word"
          />
        </box>
      )
    })

    return () => {
      if (tickId !== undefined) {
        clearInterval(tickId)
        tickId = undefined
      }
      for (const view of views.values()) {
        view.controller?.abort()
        if (view.spinnerTimer !== undefined) clearInterval(view.spinnerTimer)
        view.stopListening?.()
      }
      views.clear()
    }
  },
}
