# `@npv12/opencode-session-recap`

Shows a one-sentence recap of your OpenCode session above the composer, so you can remember where you left off after stepping away.

```text
Recap: Verified ordered input handling and a delayed shell response;
the next step is to review the resulting changes.

> _
```

Ported from [`kitlangton/opencode-plugins`](https://github.com/kitlangton/opencode-plugins) (`session-recap`, MIT). The trigger changed from "3 user turns + 3 minutes of the terminal being unfocused" to a plain timer.

## How it works

- **Every 5 minutes** (with new user activity since the previous recap, and at least 3 user turns) an automatic recap is generated.
- `/recap` or **Generate session recap** in the command palette (`ctrl+p`) generates one on demand.
- **Dismiss session recap** in the palette, clicking the recap, or sending new input dismisses it.
- Generation is read-only: it waits for the session to be idle, then runs one stateless side request — pinned to **DeepSeek V4 Flash** via `generate.text` (the prompt carries the recent transcript, since that route only sees the prompt). If the pinned model is unavailable it falls back to `session.generate` (the session's own model). Nothing enters the transcript, and the recap is dropped if new user activity arrived while it was being generated.

## Model pinning

Recaps always use `deepseek-v4-flash` (`RECAP_MODEL_ID` env override). The provider is resolved per session against the location's model list — the session's own provider first, then the others — and providers are tried in order until one succeeds, so a stale or unauthorized entry (e.g. a provider with an invalid key) is skipped automatically.

```sh
RECAP_MODEL_ID=deepseek-v4-pro opencode2   # pin recaps to a different model
```

## Testing the interval

The interval is a single constant with an env override (milliseconds):

```sh
RECAP_INTERVAL_MS=20000 opencode2   # one recap every 20 seconds
```

Default is 5 minutes (`src/eligibility.ts`, `AUTO_RECAP_INTERVAL_MS`).

## Requirements

An OpenCode V2 `next` release with the `generate.text` and `session.generate` routes, `session.wait`, and the `session.composer.top` TUI slot (verified against next-16650).

## Files

- `src/index.tsx` — the TUI plugin (module shape `{ id, setup }`, types the runtime context locally; registered in `common/opencode/cli.json`)
- `src/eligibility.ts` — interval + eligibility logic (pure, unit-tested)
