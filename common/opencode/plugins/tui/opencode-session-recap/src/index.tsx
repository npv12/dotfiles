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
// Generation runs mid-flight through the stateless generate.text route,
// pinned to RECAP_MODEL_ID (default deepseek-v4-flash) on the session's own
// provider, so recaps stay cheap even when the session itself runs a
// costlier model. The route never mutates session history. New input
// dismisses the recap; a dismissed, failed, or dropped attempt cools down
// until the next interval instead of retrying immediately.
import { createSignal, onCleanup, onMount, Show } from "solid-js"
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

type RecapHandle = {
  generate: (trigger: "manual" | "automatic") => void
  dismiss: (handled: boolean) => void
}

// The palette/slash commands need to reach the focused session's recap
// component; components register themselves on mount.
const recaps = new Map<string, RecapHandle>()
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

function Recap(props: { ctx: PluginCtx; sessionID: string }) {
  const [loading, setLoading] = createSignal(false)
  const [text, setText] = createSignal<string>()
  const [frame, setFrame] = createSignal(0)
  let lastAutoRecapAt = Date.now()
  let lastAutomaticUserID: string | undefined
  let controller: AbortController | undefined
  let spinnerTimer: ReturnType<typeof setInterval> | undefined

  const users = () => userMessages(props.ctx, props.sessionID)

  function setGenerating(value: boolean) {
    setLoading(value)
    if (spinnerTimer !== undefined) {
      clearInterval(spinnerTimer)
      spinnerTimer = undefined
    }
    if (!value) return
    spinnerTimer = setInterval(() => setFrame((current) => (current + 1) % SPINNER_FRAMES.length), SPINNER_MS)
  }

  /** Push the next automatic attempt to the next interval boundary so a
   *  dismissed, failed, or dropped recap cannot restart immediately. */
  function coolDown() {
    lastAutoRecapAt = Date.now()
  }

  function dismiss(handled: boolean) {
    controller?.abort()
    controller = undefined
    if (handled) lastAutomaticUserID = users().at(-1)?.id
    coolDown()
    setText(undefined)
    setGenerating(false)
  }

  function generate(trigger: "manual" | "automatic") {
    const latest = users().at(-1)
    if (!latest) return
    controller?.abort()
    const request = new AbortController()
    controller = request
    // Mid-flight snapshot: generate.text is a stateless side request, and
    // the revision check below drops the recap if a new user turn arrived
    // while it was being generated.
    const before = revision(props.ctx, props.sessionID)
    const activity = sessionTranscript(props.ctx, props.sessionID)
    const prompt = activity ? `${RECAP_PROMPT}\n\nRecent session activity:\n${activity}` : RECAP_PROMPT
    setGenerating(true)
    void generateText(props.ctx, props.sessionID, prompt, request.signal)
      .then((response) => {
        if (request.signal.aborted) return
        const value = response.text.trim().replaceAll(/\s+/g, " ")
        if (before !== revision(props.ctx, props.sessionID)) {
          setGenerating(false)
          coolDown()
          return
        }
        if (value) setText(value)
        setGenerating(false)
        if (value && trigger === "automatic") {
          lastAutomaticUserID = latest.id
          lastAutoRecapAt = Date.now()
        }
      })
      .catch((error) => {
        if (request.signal.aborted) return
        setGenerating(false)
        coolDown()
        console.error("[recap] generation failed", error)
        // Surface manual failures; automatic rounds stay silent and retry
        // at the next interval.
        if (trigger === "manual") {
          try {
            props.ctx.ui.toast({
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
    if (loading()) return
    if (
      !automaticRecapEligible({
        userIDs: users().map((message) => message.id),
        lastAutomaticUserID,
      })
    )
      return
    generate("automatic")
  }

  onMount(() => {
    recaps.set(props.sessionID, { generate, dismiss })
    // New input dismisses the recap; it is also the activity that makes
    // the next timer tick eligible again.
    const stop = props.ctx.data.on("session.input.admitted", (event) => {
      if (event.data.sessionID !== props.sessionID || event.data.input?.type !== "user") return
      dismiss(false)
    })
    const tick = setInterval(() => {
      if (Date.now() - lastAutoRecapAt >= RECAP_INTERVAL_MS) generateAutomatic()
    }, TICK_MS)
    onCleanup(() => {
      stop()
      recaps.delete(props.sessionID)
      clearInterval(tick)
      controller?.abort()
      if (spinnerTimer !== undefined) clearInterval(spinnerTimer)
    })
  })

  return (
    <Show when={loading() || text()}>
      <box width="100%" paddingLeft={3} paddingRight={3} paddingBottom={1} onMouseUp={() => dismiss(true)}>
        <Show when={loading()} fallback={<text wrapMode="word">Recap: {text()}</text>}>
          <text>{SPINNER_FRAMES[frame()]} Generating recap...</text>
        </Show>
      </box>
    </Show>
  )
}

/** The session whose composer is currently focused, if it has a recap view. */
function focusedRecap(ctx: PluginCtx): RecapHandle | undefined {
  let sessionID: string | undefined
  try {
    const route = ctx.ui.router.current()
    sessionID = route?.type === "session" ? route.sessionID : undefined
  } catch {
    sessionID = undefined
  }
  return sessionID === undefined ? undefined : recaps.get(sessionID)
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
                const handle = focusedRecap(ctx)
                if (handle) {
                  handle.generate("manual")
                } else {
                  ctx.ui.toast({
                    variant: "warning",
                    title: "Recap",
                    message: "No recap view for the focused session",
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
      return <Recap ctx={ctx} sessionID={props.sessionID} />
    })
  },
}
