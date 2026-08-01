/** @jsxImportSource @opentui/solid */

// Ported from kitlangton/opencode-plugins `session-recap` (MIT):
// https://github.com/kitlangton/opencode-plugins — shows a one-sentence recap
// of the session above the composer. The original generated after 3 user
// turns + 3 minutes of the terminal being unfocused; this port uses a plain
// timer instead: every 5 minutes (RECAP_INTERVAL_MS env override, in
// milliseconds, for testing) an eligible session gets a fresh recap.
//
// Targets the opencode2 next-16665 TUI plugin runtime: module shape
// { id, setup(ctx) }, ctx.ui.slot("session.composer.top"), ctx.data.*,
// ctx.client.generate.text, ctx.keymap.layer, and the session.input.admitted
// event (the host API flip-flopped between next builds — 16664 used
// { id, tui(api) } + session_prompt; 16665 restored this legacy contract,
// verified against the 16665 binary).
//
// Rendering: external plugins load with their own solid-js copy, so signals
// created here are invisible to the host renderer and slot bodies never
// re-run on state changes (same constraint opencode-footer documents, and
// it works on this build). Updates therefore go straight into the
// renderables via their `content`/`visible` setters, and all logic lives in
// a plain view object created from the slot body — nothing depends on
// onMount/onCleanup, which the host never runs for external plugins.
//
// Generation runs mid-flight through the stateless generate.text route,
// pinned to RECAP_MODEL_ID (default deepseek-v4-flash) on the session's own
// provider, so recaps stay cheap even when the session itself runs a
// costlier model. The route never mutates session history. New input
// dismisses the recap; a dismissed, failed, or dropped attempt cools down
// until the next interval instead of retrying immediately.
import {
  automaticRecapEligible,
  recapIntervalMs,
  recapModelId,
  recapTimeoutMs,
  resolveRecapModel,
  type ModelRef,
} from "./eligibility.ts"

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
const RECAP_TIMEOUT_MS = recapTimeoutMs()
const RECAP_MODEL_ID = recapModelId()

type MessageLike = {
  id: string
  type?: string
  text?: string
  content?: readonly { type?: string; text?: string }[]
}

type LocationInfo = { directory?: string; workspaceID?: string }

// The plugin context subset this file uses, mirroring the next-16665 TUI
// plugin runtime (the legacy contract restored in that build).
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
  }
  keymap: {
    layer: (layer: () => unknown) => void
  }
  ui: {
    router: { current: () => Route }
    slot: (name: string, render: (props: { sessionID?: string }) => unknown) => void
    toast: Toast["show"]
  }
}

type Route = { type?: string; sessionID?: string }

/** Renderable node: external plugins load with their own solid-js copy, so
 *  signals never re-render the slot body; updates go straight into the
 *  renderables through these setters (same mechanism as opencode-footer). */
type Node = { content?: unknown; visible?: boolean; isDestroyed?: boolean }

type RecapView = {
  generate: (trigger: "manual" | "automatic") => void
  dismiss: (handled: boolean) => void
  boxNode?: Node
  textNode?: Node
  lastAutoRecapAt: number
  lastAutomaticUserID?: string
  controller?: AbortController
  spinnerTimer?: ReturnType<typeof setInterval>
}

// The palette/slash commands need to reach the focused session's recap view;
// views are created when the slot body renders (not in onMount, which the
// dual solid-js-copy host never runs for external plugins).
const views = new Map<string, RecapView>()
let keymapRegistered = false

type Toast = {
  show: (input: { variant?: "info" | "success" | "warning" | "error"; title?: string; message: string }) => void
}

function userMessages(ctx: PluginCtx, sessionID: string): readonly MessageLike[] {
  try {
    return ctx.data.session.message
      .list(sessionID)
      .filter((message) => message.type === "user")
  } catch {
    return []
  }
}

/** Snapshot of everything that would make a recap stale: user turns.
 *  Assistant mutations are excluded — they churn mid-flight while the
 *  recap is being generated. */
function revision(ctx: PluginCtx, sessionID: string): string {
  try {
    return JSON.stringify({
      users: userMessages(ctx, sessionID).map((message) => message.id),
    })
  } catch {
    return ""
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

/** The model recaps are pinned to: RECAP_MODEL_ID env override, default
 *  deepseek-v4-flash. Resolved to one provider — the session's own provider
 *  when it already serves the model (proven working), else the first
 *  provider serving it at the session's location. No fallback chain: an
 *  unavailable model is a failed round, retried at the next interval. */
function recapModel(ctx: PluginCtx, sessionID: string): ModelRef | undefined {
  try {
    return resolveRecapModel({
      sessionModel: ctx.data.session.get(sessionID)?.model,
      models: ctx.data.location.model.list(sessionLocation(ctx, sessionID)) ?? [],
      id: RECAP_MODEL_ID,
    })
  } catch {
    return undefined
  }
}

/** Recent user/assistant text for the stateless generate.text route, which
 *  only sees the prompt, so the recap has to carry its own context. */
function sessionTranscript(ctx: PluginCtx, sessionID: string): string {
  try {
    const lines: string[] = []
    for (const message of ctx.data.session.message.list(sessionID).slice(-20)) {
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
  } catch {
    return ""
  }
}

/** One-shot generation pinned to the recap model, capped at RECAP_TIMEOUT_MS
 *  so a hung provider cannot pin the spinner. A timeout or error counts as a
 *  failed round: the caller cools down and retries at the next interval. */
function generateText(
  ctx: PluginCtx,
  sessionID: string,
  prompt: string,
  signal: AbortSignal,
): Promise<{ text: string }> {
  const model = recapModel(ctx, sessionID)
  const location = sessionLocation(ctx, sessionID)
  const request = location
    ? { directory: location.directory, workspace: location.workspaceID }
    : undefined
  if (!model) return Promise.reject(new Error("Recap model unavailable"))
  return ctx.client.generate.text(
    { location: request, prompt, model },
    { signal: AbortSignal.any([signal, AbortSignal.timeout(RECAP_TIMEOUT_MS)]) },
  )
}

function createRecapView(ctx: PluginCtx, sessionID: string): RecapView {
  const view: RecapView = {
    generate,
    dismiss,
    lastAutoRecapAt: Date.now(),
  }

  const users = () => userMessages(ctx, sessionID)

  /** Push a line into the renderables directly — the only update path that
   *  re-renders for external plugins (see the Node note above). */
  function setLine(text: string | undefined) {
    if (!view.textNode || view.textNode.isDestroyed) return
    view.textNode.content = text ?? ""
    if (view.boxNode && !view.boxNode.isDestroyed) view.boxNode.visible = Boolean(text)
  }

  function setGenerating(value: boolean) {
    if (view.spinnerTimer !== undefined) {
      clearInterval(view.spinnerTimer)
      view.spinnerTimer = undefined
    }
    if (!value) return
    let frame = 0
    setLine(`${SPINNER_FRAMES[0]} Generating recap...`)
    view.spinnerTimer = setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length
      setLine(`${SPINNER_FRAMES[frame]} Generating recap...`)
    }, SPINNER_MS)
  }

  /** Push the next automatic attempt to the next interval boundary so a
   *  dismissed, failed, or dropped recap cannot restart immediately. */
  function coolDown() {
    view.lastAutoRecapAt = Date.now()
  }

  function dismiss(handled: boolean) {
    view.controller?.abort()
    view.controller = undefined
    if (handled) view.lastAutomaticUserID = users().at(-1)?.id
    coolDown()
    setGenerating(false)
    setLine(undefined)
  }

  function generate(trigger: "manual" | "automatic") {
    const latest = users().at(-1)
    if (!latest) {
      if (trigger === "manual") {
        let total = 0
        try {
          total = ctx.data.session.message.list(sessionID).length
        } catch {
          // message list unavailable — keep the count at 0
        }
        try {
          ctx.ui.toast({
            variant: "warning",
            title: "Recap",
            message: `No user messages in session data (${total} total)`,
          })
        } catch {
          // toast unavailable — keep the failure silent
        }
      }
      return
    }
    view.controller?.abort()
    const request = new AbortController()
    view.controller = request
    // Mid-flight snapshot: generate.text is a stateless side request, and
    // the revision check below drops the recap if a new user turn arrived
    // while it was being generated.
    const before = revision(ctx, sessionID)
    const activity = sessionTranscript(ctx, sessionID)
    const prompt = activity ? `${RECAP_PROMPT}\n\nRecent session activity:\n${activity}` : RECAP_PROMPT
    setGenerating(true)
    void generateText(ctx, sessionID, prompt, request.signal)
      .then((response) => {
        if (request.signal.aborted) return
        const value = response.text.trim().replaceAll(/\s+/g, " ")
        if (before !== revision(ctx, sessionID)) {
          setGenerating(false)
          coolDown()
          return
        }
        setGenerating(false)
        if (value) {
          setLine(`Recap: ${value}`)
          if (trigger === "automatic") {
            view.lastAutomaticUserID = latest.id
            view.lastAutoRecapAt = Date.now()
          }
        }
      })
      .catch((error) => {
        if (request.signal.aborted) return
        setGenerating(false)
        setLine(undefined)
        coolDown()
        console.error("[recap] generation failed", error)
        // Surface manual failures; automatic rounds stay silent and retry
        // at the next interval.
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
  }

  function generateAutomatic() {
    // A hot-reloaded plugin leaves the old module's view with destroyed
    // nodes; stop generating once the renderables are gone.
    if (!view.textNode || view.textNode.isDestroyed) return
    if (view.spinnerTimer !== undefined) return
    if (
      !automaticRecapEligible({
        userIDs: users().map((message) => message.id),
        lastAutomaticUserID: view.lastAutomaticUserID,
      })
    )
      return
    generate("automatic")
  }

  // New input dismisses the recap; it is also the activity that makes the
  // next timer tick eligible again. The subscription and the tick live for
  // the module instance; after a hot reload the old view's renderables are
  // destroyed and generateAutomatic stops on its own.
  ctx.data.on("session.input.admitted", (event) => {
    if (event.data.sessionID !== sessionID || event.data.input?.type !== "user") return
    dismiss(false)
  })
  const tick = setInterval(() => {
    if (Date.now() - view.lastAutoRecapAt >= RECAP_INTERVAL_MS) generateAutomatic()
  }, TICK_MS)

  return view
}

/** Render-only: the host never re-runs this on state changes, so the view
 *  drives the renderables directly through the refs. */
function Recap(props: { view: RecapView }) {
  return (
    <box
      width="100%"
      paddingLeft={3}
      paddingRight={3}
      paddingBottom={1}
      onMouseUp={() => props.view.dismiss(true)}
      ref={(node: unknown) => {
        props.view.boxNode = node as Node
        props.view.boxNode.visible = false
      }}
    >
      <text
        ref={(node: unknown) => {
          props.view.textNode = node as Node
        }}
        wrapMode="word"
      />
    </box>
  )
}

/** The session whose composer is currently focused, if it has a recap view. */
function focusedRecap(ctx: PluginCtx): RecapView | undefined {
  let sessionID: string | undefined
  try {
    const route = ctx.ui.router.current()
    sessionID = route?.type === "session" ? route.sessionID : undefined
  } catch {
    sessionID = undefined
  }
  return sessionID === undefined ? undefined : views.get(sessionID)
}

export default {
  id: "npv12.session-recap",
  setup(ctx: PluginCtx) {
    ctx.ui.slot("session.composer.top", (props: { sessionID?: string }) => {
      if (!props.sessionID) return null
      // keymap.layer reads the Keymap context, so it must be called from
      // inside the render tree (a slot body), not from setup. Register the
      // layer once per module instance, mode "global": the commands show up
      // in the command palette (ctrl+p) and via /recap in any mode.
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
                const view = focusedRecap(ctx)
                if (view) {
                  view.generate("manual")
                } else {
                  let routeDesc = "unknown"
                  try {
                    const route = ctx.ui.router.current()
                    routeDesc = route?.type ? String(route.type) : "none"
                  } catch {
                    routeDesc = "unknown"
                  }
                  ctx.ui.toast({
                    variant: "warning",
                    title: "Recap",
                    message: `No recap view (route=${routeDesc}, mounted=${views.size})`,
                  })
                }
              },
            },
            {
              id: "session.recap.dismiss",
              title: "Dismiss session recap",
              group: "Session",
              palette: true,
              run: () => focusedRecap(ctx)?.dismiss(true),
            },
          ],
        }))
      }
      // The view owns all recapping logic and is created when the slot body
      // renders — the dual-copy host never runs onMount for external
      // plugins, so nothing may depend on solid lifecycle hooks.
      let view = views.get(props.sessionID)
      if (!view) {
        view = createRecapView(ctx, props.sessionID)
        views.set(props.sessionID, view)
      }
      return <Recap view={view} />
    })
  },
}
