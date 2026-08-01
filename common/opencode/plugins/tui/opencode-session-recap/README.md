# `@npv12/opencode-session-recap`

Shows a one-sentence recap of your OpenCode session above the composer, so you can remember where you left off after stepping away.

```text
Recap: Verified ordered input handling and a delayed shell response;
the next step is to review the resulting changes.

> _
```

Ported from [`kitlangton/opencode-plugins`](https://github.com/kitlangton/opencode-plugins) (`session-recap`, MIT). The trigger changed from "3 user turns + 3 minutes of the terminal being unfocused" to a plain timer.

## How it works

- **Every 5 minutes** (with new user activity since the previous recap, and at least 3 user turns) an automatic recap is generated — including **mid-flight**, while the agent is still running.
- `/recap` or **Generate session recap** in the command palette (`ctrl+p`) generates one on demand.
- **Dismiss session recap** in the palette, clicking the recap, or sending new input dismisses it.
- Generation is read-only: one stateless `generate.text` side request pinned to **DeepSeek V4 Flash** on the session's own provider (the prompt carries the recent transcript, since that route only sees the prompt). Nothing enters the transcript, and the recap is dropped if a new user turn arrived while it was being generated.
- A **dismissed, failed, or stale attempt cools down** until the next interval — no immediate restart, no retry loops.
- Each attempt is **capped at 20 seconds** (`RECAP_TIMEOUT_MS`) so a hung provider cannot pin the spinner; a timeout counts as a failed round.

## Model pinning

Recaps use `deepseek-v4-flash` (`RECAP_MODEL_ID` env override) so recaps stay cheap even when the session itself runs a costlier model. The model is resolved to a single provider — the session's own provider when it already serves the model, otherwise the first provider serving it at the session's location. No fallback chain: an unavailable model is a failed round, retried at the next interval.

```sh
RECAP_MODEL_ID=deepseek-v4-pro opencode2   # pin recaps to a different model
```

## Testing the interval and timeout

Both are single constants with env overrides (milliseconds):

```sh
RECAP_INTERVAL_MS=20000 opencode2   # one recap every 20 seconds
RECAP_TIMEOUT_MS=5000 opencode2     # give each generation attempt 5 seconds
```

Defaults: 5 minutes (`src/eligibility.ts`, `AUTO_RECAP_INTERVAL_MS`) and 20 seconds (`RECAP_TIMEOUT_MS`).

## Requirements

An OpenCode V2 `next` release with the legacy TUI plugin contract restored in next-16665: module shape `{ id, setup(ctx) }`, the `session.composer.top` slot, `ctx.client.generate.text`, and the `session.input.admitted` event. (The host API flip-flopped between builds — 16664 used `{ id, tui(api) }` + `session_prompt`; this plugin targets the 16665 contract, verified against the 16665 binary.)

## Files

- `src/index.tsx` — the TUI plugin (module shape `{ id, setup }`, types the runtime context locally; registered in `common/opencode/cli.json`)
- `src/eligibility.ts` — interval, timeout, model resolution, and eligibility logic (pure, unit-tested)
