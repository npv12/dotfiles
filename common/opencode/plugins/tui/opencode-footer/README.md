# opencode-footer (opencode2)

Prompt footer for opencode2: **TPS/TTFT stats + quota compact status**, merged
from two former plugins — `opencode-tps` (live TPS, avg TPS, TTFT beside the
prompt) and the opencode-quota TUI entry (compact quota status under the
prompt). Ported to the opencode2 **next-16664/16665** Promise-plugin API.

The upstream v1 `@npv12/opencode-quota` plugin had toasts, a sidebar panel,
compact status lines, and a `/quota_status` command across 20 providers.
This port is **trimmed to the surfaces and providers actually used**:

- **Providers**: `opencode-go`, `hyper`, and `openai` (the only Codex-capable
  provider — reads ChatGPT Plus/Pro + Codex usage from the chatgpt.com usage
  API; no OpenAI API key needed). All other upstream providers were dropped.
- **Surfaces**:
  - `prompt.footer.end` (per-session, mode "replace"): two subdued lines —
    TPS/TTFT stats (tracking logic folded in from opencode-tps, which was
    deleted) and the quota compact status.
  - `home.footer`: quota compact status for the home screen (supersedes the
    built-in version line; no other plugin uses the slot).
  - `/quota_status` command (TUI keymap) + `quota_status` tool (server).
  - Toasts and the sidebar panel from v1 were dropped (server plugins have
    no toast channel in opencode2).

## Layout

One package, two plugin entries:

- `src/index.ts` — **server plugin** (`{ id: "npv12.opencode-quota", setup }`),
  registers the `quota_status` tool; the report is injected into the
  transcript via `ctx.session.synthetic` (the v2 equivalent of the v1
  `noReply` + `ignored: true` parts injection — transient, read-only, never
  model-visible). Optional: not needed for the footer. Register it with
  `./plugins/tui/opencode-footer/src/index.ts` in `opencode.jsonc`
  `plugins` to expose the tool to agents.
- `src/tui.tsx` — **TUI plugin** (`{ id: "npv12.opencode-footer", setup }`),
  registered in `cli.json` `plugins` as
  `./plugins/tui/opencode-footer/src/tui.tsx`.
- `src/lib/tps-tracker.ts` — the TPS/TTFT tracking logic, copied verbatim
  from the deleted `opencode-tps` package (`plugins/tui/opencode-tps/`; see
  git history for the original).

## Runtime notes (next-16664/16665)

- Server ctx: `ctx.tool.transform(draft.add)`, `ctx.session.get`,
  `ctx.session.synthetic`. The engine's `client.config.get/providers` calls
  are answered from the on-disk opencode config
  (`lib/quota-client-adapter.ts`) — opencode2 exposes no config client to
  plugins, and the engine already reads config files natively.
- TUI ctx: `ctx.ui.slot`, `ctx.data.on`, `ctx.data.session.*`,
  `ctx.client.session.synthetic`, `ctx.keymap.layer`. External plugins load
  with their own solid-js copy, so slot bodies never re-run reactively —
  the ticks + event listeners push text into the renderables via their
  `content`/`visible` setters.
- `keymap.layer` reads the Keymap context: the `/quota_status` command is
  registered from inside a slot body, never from `setup` (calling it in
  setup throws "Keymap.Provider is missing").
- `lib/opencode-storage.ts` scans `opencode.db` and `opencode-next.db`
  (opencode2's database; same `message`/`session` table layout as v1).
- `lib/opencode-sqlite.ts` falls back from `bun:sqlite` to `node:sqlite` so
  the engine + vitest suite run under plain node.

## Config

Unchanged from v1: `opencode-quota/quota-toast.json` next to the opencode
config (symlinked at `~/.config/opencode/opencode-quota/` → this package),
or `experimental.quotaToast` in opencode.json(c). The `opencode-quota`
config directory name is fixed by the engine's
`QUOTA_TOAST_CONFIG_RELATIVE_PATH`.

## Check

```sh
npm run check   # tsc --noEmit + vitest
```
