# opencode-context-sidebar

OpenCode2 (next-16650) TUI plugin: a context-usage panel in the sidebar —
progress bar of the context window, token count vs limit, and session cost.

```
Context
████████████ ░░░░░░░░░░░  52%
14,912 / 32,000 / $0.15
```

- Bar color: blue → warning yellow at 70% → error red at 90% (theme-driven;
  `hue.blue[200]` is the dark-mode shade — light mode would use 700).
- Tokens/percent mirror the built-in sidebar exactly: the last completed
  assistant message (after the last compaction, before the revert point),
  summed over input + output + reasoning + cache reads/writes, over the
  current model's context limit from the location model list.
- Cost comes from `ctx.data.session.cost(sessionID)` (falls back to summing
  assistant message costs).
- MCP status list below the Context panel (from
  `ctx.data.location.mcp.server.list(location)`), colored like the built-in
  panel: connected → success, failed / needs client ID → error,
  needs auth → warning, disabled → subdued.

## Install

Registered in `common/opencode/cli.json` (symlinked to
`~/.config/opencode/cli.json`):

```json
{
  "plugins": [
    "./plugins/tui/opencode-tps/src/index.tsx",
    "./plugins/tui/opencode-context-sidebar/src/index.tsx",
    "-internal:sidebar-context",
    "-internal:sidebar-mcp"
  ]
}
```

Relative file-path registration keeps the TUI plugin API reactive
(see opencode issues #33884/#32996; npm-spec registration breaks TUI plugin
reactivity on next-16650). The `-` entries disable the built-in Context and
MCP panels: next-16650 renders built-in sidebar panels above external
plugins in registration order (the module `order` field only affects an
unused solid-slot registry), so replacing both panels keeps the layout
Context-above-MCP. The sidebar appears automatically when the terminal is
wider than 120 columns; toggle with `ctrl+x b`.

## Development

```bash
npm run check   # typecheck + node --test
```

The plugin never imports `@opencode-ai/plugin` at runtime (the installed
1.17.16 package has stale types); the context is typed locally in
`src/index.tsx`. `@opentui/solid` + `solid-js` are dev-time only — the host
provides the runtime copies, and the 500 ms interval pushes text into the
slot's text nodes via their `content`/`fg` setters because external plugins
run with their own solid-js copy and slot bodies never re-run.

## Version pin

Verified against `opencode2 v0.0.0-next-16650` (2026-08-01). On upgrade,
check: `sidebar.content` slot props, `ctx.data.session.cost` /
`ctx.data.location.model.list` accessors, `theme.text.feedback.*` /
`theme.hue.accent` colors.

## Attribution

Adapted from the author's `@npv12/opencode-context-sidebar` (old v1 TUI API),
originally based on streetturtle's context-progress plugin
([opencode-better-sidebar](https://github.com/streetturtle/opencode-better-sidebar)).

## Ghostty note

Ghostty renders the shade characters U+2591-U+2593 with its own internal
gray sprites (25/50/75%) instead of the font's dotted pattern, which is
near-invisible on dark backgrounds. The dotfiles Ghostty config fixes this:

```
font-codepoint-map = U+2591-U+2593=MesloLGS NF
```

(Any font with real block-element glyphs works in the map; restart Ghostty
after changing it.)
