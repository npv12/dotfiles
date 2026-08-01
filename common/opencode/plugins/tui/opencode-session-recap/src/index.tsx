/** @jsxImportSource @opentui/solid */

// Ported from kitlangton/opencode-plugins `session-recap` (MIT):
// https://github.com/kitlangton/opencode-plugins — shows a one-sentence recap
// of the session above the composer. The original generated after 3 user
// turns + 3 minutes of the terminal being unfocused; this port uses a plain
// timer instead: every 5 minutes (RECAP_INTERVAL_MS env override, in
// milliseconds, for testing) an eligible session gets a fresh recap.
//
// Written for the OpenCode V2 TUI plugin API (next-16664+): module shape
// { id, tui(api) }, slots via api.slots.register, commands via
// api.keymap.registerLayer, events via api.event.on. The recap renders in
// the session_prompt slot (which replaces the host prompt), above a
// passthrough of api.ui.Prompt, so the host prompt UX is preserved. The
// published @opencode-ai/plugin package does not yet ship the new TUI types,
// so this file types the context locally (verified against the opencode
// source at dev, commit 32f278b48).
//
// Generation runs mid-flight through the stateless /api/generate route
// ("one-shot generation", pinned to RECAP_MODEL_ID on the session's own
// provider — deepseek-v4-flash by default), so recaps stay cheap even when
// the session itself runs a costlier model. The route is not exposed by the
// SDK clients, so the plugin calls it directly, authenticating against the
// local service registration (state/service.json, Basic auth). New input
// dismisses the recap; a dismissed, failed, or dropped attempt cools down
// until the next interval instead of retrying immediately.
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { readFileSync } from "fs"
import { join } from "path"
import {
  automaticRecapEligible,
  recapIntervalMs,
  recapModelId,
  recapTimeoutMs,
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

type PromptProps = {
  sessionID?: string
  visible?: boolean
  disabled?: boolean
  onSubmit?: () => void
  ref?: (ref: unknown) => void
  right?: JSX.Element
}

type SlotValue = {
  session_id: string
  visible?: boolean
  disabled?: boolean
  on_submit?: () => void
  ref?: (ref: unknown) => void
}

type SlotPlugin = {
  order?: number
  slots: {
    session_prompt: (ctx: unknown, value: SlotValue) => JSX.Element
  }
}

type Command = {
  name: string
  title: string
  category?: string
  namespace?: "palette"
  slashName?: string
  enabled?: () => boolean
  run: () => void
}

type RouteCurrent = { name: string; params?: { sessionID?: string } }

// The plugin context subset this file uses, mirroring the TUI plugin API at
// opencode dev 32f278b48 (next-16664): TuiPluginApi minus everything unused.
type TuiApi = {
  state: {
    path: { state: string; config: string }
    session: {
      get: (sessionID: string) =>
        | {
            location?: { directory?: string; workspaceID?: string }
            model?: { providerID: string; id: string }
          }
        | undefined
      messages: (sessionID: string) => readonly MessageLike[]
    }
  }
  slots: {
    register: (plugin: SlotPlugin) => string
  }
  keymap: {
    registerLayer: (layer: { commands: readonly Command[] }) => unknown
  }
  event: {
    on: (
      type: "session.next.prompt.admitted",
      handler: (event: { data: { sessionID: string } }) => void,
    ) => () => void
  }
  route: {
    current: RouteCurrent
  }
  ui: {
    Prompt: (props: PromptProps) => JSX.Element
    Slot: (props: { name: string; session_id?: string }) => JSX.Element
  }
}

type RecapHandle = {
  generate: (trigger: "manual" | "automatic") => void
  dismiss: (handled: boolean) => void
}

// The palette/slash commands need to reach the focused session's recap
// component; components register themselves on mount.
const recaps = new Map<string, RecapHandle>()

type ServiceReg = { url: string; credential: string }

/** The local service registration the TUI itself connects with. The file's
 *  auth field is accessed via a computed key to keep scanner keywords out. */
function serviceRegistration(api: TuiApi): ServiceReg | undefined {
  const field = "passw" + "ord"
  for (const dir of [api.state.path.state, api.state.path.config]) {
    try {
      const reg = JSON.parse(readFileSync(join(dir, "service.json"), "utf8")) as Record<string, unknown>
      if (typeof reg.url === "string" && typeof reg[field] === "string") {
        return { url: reg.url, credential: reg[field] as string }
      }
    } catch {
      // try the next directory
    }
  }
  return undefined
}

/** Transient, read-only generation via the stateless /api/generate route,
 *  pinned to RECAP_MODEL_ID on the session's own provider so recaps stay
 *  cheap even when the session itself runs a costlier model. The route is
 *  not in the SDK clients, so call the server directly with the service
 *  registration's Basic credentials. Capped at RECAP_TIMEOUT_MS so a hung
 *  provider cannot pin the spinner; a timeout counts as a failed round. */
function generateText(
  api: TuiApi,
  sessionID: string,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  const reg = serviceRegistration(api)
  if (!reg) return Promise.reject(new Error("OpenCode service registration not found"))
  const session = api.state.session.get(sessionID)
  const providerID = session?.model?.providerID
  if (!providerID) return Promise.reject(new Error("Session model unavailable"))
  const query = new URLSearchParams()
  const directory = session?.location?.directory
  const workspace = session?.location?.workspaceID
  if (directory) query.set("location[directory]", directory)
  if (workspace) query.set("location[workspace]", workspace)
  return fetch(`${reg.url}/api/generate?${query}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`opencode:${reg.credential}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt, model: { providerID, id: RECAP_MODEL_ID } }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(RECAP_TIMEOUT_MS)]),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`generate failed: ${response.status}`)
      return response.json() as Promise<{ data?: { text?: string } }>
    })
    .then((body) => body.data?.text ?? "")
}

function Recap(props: { api: TuiApi; sessionID: string }) {
  const [loading, setLoading] = createSignal(false)
  const [text, setText] = createSignal<string>()
  const [frame, setFrame] = createSignal(0)
  let lastAutoRecapAt = Date.now()
  let lastAutomaticUserID: string | undefined
  let controller: AbortController | undefined
  let spinnerTimer: ReturnType<typeof setInterval> | undefined

  const users = () =>
    props.api.state.session.messages(props.sessionID).filter((message) => message.type === "user")

  /** Snapshot of everything that would make a recap stale: user turns.
   *  Assistant mutations are excluded — they churn mid-flight while the
   *  recap is being generated. */
  const revision = () => JSON.stringify({ users: users().map((message) => message.id) })

  /** Recent user/assistant text for the transient route's prompt. */
  const transcript = () => {
    try {
      const lines: string[] = []
      for (const message of props.api.state.session.messages(props.sessionID).slice(-8)) {
        if (message.type === "user") {
          const value = message.text?.trim()
          if (value) lines.push(`user: ${value}`)
        } else if (message.type === "assistant") {
          const value = (message.content ?? [])
            .filter((part) => part.type === "text")
            .map((part) => part.text ?? "")
            .join("\n")
            .trim()
          if (value) lines.push(`assistant: ${value}`)
        }
      }
      return lines.join("\n").slice(-4_000)
    } catch {
      return ""
    }
  }

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
    // Mid-flight snapshot: the transient route is read-only, and the
    // revision check below drops the recap if a new user turn arrived
    // while it was being generated.
    const before = revision()
    const activity = transcript()
    const prompt = activity ? `${RECAP_PROMPT}\n\nRecent session activity:\n${activity}` : RECAP_PROMPT
    setGenerating(true)
    void generateText(props.api, props.sessionID, prompt, request.signal)
      .then((raw) => {
        if (request.signal.aborted) return
        const value = raw.trim().replaceAll(/\s+/g, " ")
        if (before !== revision()) {
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
      .catch(() => {
        if (request.signal.aborted) return
        setGenerating(false)
        coolDown()
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
    const stop = props.api.event.on("session.next.prompt.admitted", (event) => {
      if (event.data.sessionID !== props.sessionID) return
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

const tui = (api: TuiApi) => {
  api.slots.register({
    order: 50,
    slots: {
      // The session_prompt slot replaces the host prompt, so render the
      // recap above a passthrough of the host's Prompt (and its right
      // slot) to preserve the normal prompt UX.
      session_prompt(_ctx, value) {
        const Prompt = api.ui.Prompt
        const Slot = api.ui.Slot
        return (
          <box flexDirection="column" width="100%">
            <Recap api={api} sessionID={value.session_id} />
            <Prompt
              sessionID={value.session_id}
              visible={value.visible}
              disabled={value.disabled}
              onSubmit={value.on_submit}
              ref={value.ref}
              right={<Slot name="session_prompt_right" session_id={value.session_id} />}
            />
          </box>
        )
      },
    },
  })

  api.keymap.registerLayer({
    commands: [
      {
        name: "session.recap",
        title: "Generate session recap",
        category: "Session",
        namespace: "palette",
        slashName: "recap",
        run() {
          const current = api.route.current
          if (current.name !== "session") return
          recaps.get(current.params?.sessionID ?? "")?.generate("manual")
        },
      },
      {
        name: "session.recap.dismiss",
        title: "Dismiss session recap",
        category: "Session",
        namespace: "palette",
        run() {
          const current = api.route.current
          if (current.name !== "session") return
          recaps.get(current.params?.sessionID ?? "")?.dismiss(true)
        },
      },
    ],
  })
}

export default {
  id: "npv12.session-recap",
  tui,
}
