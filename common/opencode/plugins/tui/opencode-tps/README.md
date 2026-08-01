# @npv12/opencode-tps

OpenCode2 TUI plugin: **live TPS, average TPS, and TTFT** rendered beside the
prompt (the `prompt.footer.end` slot):

```
TPS 66.1 · AVG 55.2 · TTFT 2.0s
```

## What each number means

| Stat   | Meaning                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `TPS`  | Live generation speed over a rolling 5s window (EMA-smoothed), refreshed 4×/s. When the model stops, it freezes at the last value and hides after 5s without new data. |
| `AVG`  | Session average using the **exact** token counts from `session.step.ended`.                            |
| `TTFT` | Average time from the previous activity's end (user prompt, or the previous step incl. tool calls) to this step's first output. |

The live window is dropped while a tool call runs so TPS never spans the gap.
When the model changes (`session.model.selected`), all session stats reset so
they only reflect the current model.

## How TTFT is measured (and why)

`session.step.started` / `message.created` are published by the server when
the stream opens — the first delta arrives 2–7ms later, so per-step event
deltas cannot measure time-to-first-token (the old plugins' `step.started →
first delta` approach always read ~0.0s). The real user-visible latency is
recovered from the message store at step end:

```
TTFT = assistant message created − previous message end
       (user message created, or previous step's completion incl. tool calls)
```

Validated against the server API: first steps read ~1.3–2.0s for the
configured models — matching perceived latency. Steps without a previous
message or a store hit fall back to `text.started − step.started`.

## Installation

Targets the **opencode2** V2 nightly (`next-16650`). Add the file path to the
global TUI config (`~/.config/opencode/cli.json`, already symlinked into this
repo as `common/opencode/cli.json`):

```jsonc
{
  "plugins": ["./plugins/tui/opencode-tps/src/index.tsx"]
}
```

Register by **file path**, not npm spec: opencode2 loads npm-installed TUI
plugins with their own Solid copy, which breaks rendering/reactivity
(opencode issue #33884 / #32996). The TUI hot-reloads the plugin when the file
changes.

## How it works

- Subscribes via `ctx.data.on` to `session.step.started/ended/failed`,
  `session.text.started`, `session.text.delta`, `session.reasoning.delta`,
  `session.tool.input.started` (events carry `created` + `data`; no
  `timestamp` inside `data`). `message.updated` / `message.part.delta` — the
  events the v0.3.0 plugin relied on — do not fire on next-16650.
- The plugin module is the plain `{ id, setup(ctx) }` shape the next-16650 TUI
  validates (`Plugin.define` is not exported by the installed
  `@opencode-ai/plugin@1.17.16`).
- Slot bodies never re-run mid-stream (external plugins load with their own
  solid-js copy), so the renderer updates the `<text>` renderable directly via
  its `content` setter (note: `text` is not a property) on a 250ms interval.
- Session status is the string `"running"` while a step streams.
- The TUI keeps hidden composers (resumed sessions) mounted; the interval
  only drives the view whose node is `visible` and prefers the streaming
  session.

## Development

```sh
npm install
npm run check   # typecheck + node:test
```

## Version pin

The plugin API is beta. When upgrading opencode2, re-verify: module shape
(`Plugin.define` at HEAD), slot names (`prompt.footer.end` is `session_prompt_right`
in some builds), event names (`session.next.*` in some builds), and whether the
runtime module rewrite finally shares solid-js with plugins (issue #32996).
