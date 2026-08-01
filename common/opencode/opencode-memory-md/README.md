# opencode-memory-md

Markdown-based persistent memory for opencode2 (next-16650), ported from the
[`@npv12/opencode-memory-md`](https://github.com/npv12/opencode-memory-md) npm
package (MIT, a fork of `tickernelz/opencode-memory-md`).

The npm package targets the V1 plugin API, which opencode2 rejects at load
time ("Expected object, got async (ctx) => ..."). This module is a port to
the next-16650 Promise-plugin API: module shape `{ id, setup }`, a `memory`
tool registered via `ctx.tool.transform`, and context injection via
`ctx.session.hook("context")`. The file-storage engine is unchanged.

## Setup

Registered in `opencode.jsonc`:

```jsonc
{
  "plugins": ["./opencode-memory-md/src/index.ts"]
}
```

Relative paths resolve from the config file, so the live install lives at
`~/.config/opencode/opencode-memory-md/` (this directory, minus the repo
tracking). Local plugin files are imported directly — OpenCode does not
install their dependencies, so `npm install` here first.

## Memory files

`~/.config/opencode/memory/`:

| File | Purpose |
| --- | --- |
| `MEMORY.md` | Long-term memory (crucial facts, decisions, preferences) — auto-injected |
| `IDENTITY.md` | AI identity (name, persona, behavioral rules) — auto-injected |
| `USER.md` | User profile (name, preferences, context) — auto-injected |
| `daily/YYYY-MM-DD.md` | Daily logs (queried via the tool, not injected) |
| `project/{folder-name}.md` | Project knowledge (queried via the tool, not injected) |

The three root files are appended to every outbound model request's system
prompt as a `# Memory Context` section plus usage instructions.

## Tool: `memory`

Actions: `read`, `write`, `edit`, `delete`, `search`, `list`, `reindex`.
Targets: `memory`, `identity`, `user`, `daily` (default), `project`.

- Writes append timestamp-marked entries (`<!-- YYYY-MM-DD HH:MM:SS -->`);
  `mode: "overwrite"` replaces the file.
- Every write is committed to a git repo inside the memory directory.
- `search` is semantic: chunks are embedded with
  `nomic-ai/nomic-embed-text-v1.5` (`@huggingface/transformers` +
  `onnxruntime-node`) and stored in vectra `*.index` directories next to the
  memory files. The first embedding (or first search after a cache clear)
  downloads the model (~550 MB) into
  `node_modules/@huggingface/transformers/.cache`.
- First run creates `BOOTSTRAP.md` with interactive setup instructions;
  deleting it after setup completes.

## Differences from the npm package

- **Dropped**: the `session.idle` "update your daily log" toast — next-16650
  exposes no toast channel to server plugins (no TUI client in the plugin
  context, no event publish endpoint), so the session-state tracking that
  only fed that toast went with it.
- **Changed**: `git.ts` uses `node:child_process` instead of Bun's `$` shell
  so the module typechecks and tests under plain Node.
- **Changed**: the tool input is a raw JSON Schema (V1 used a zod-like
  helper); the schema mirrors the V1 args exactly.
- **Changed**: the tool registers with `options.codemode: false`. The V2
  default (`codemode: true`) only exposes tools through the `execute`
  CodeMode sandbox, where a content-only tool resolves to `void` — the
  results would never reach the model. Exposing it directly restores the V1
  behavior (the model calls `memory` with args and reads the reply).
- **Context injection** moved from `experimental.chat.system.transform`
  (string array) to `ctx.session.hook("context")`, pushing a
  `{ type: "text" }` system part on every outbound model request.

## Checks

```sh
npm run check   # typecheck + node --test src/logic.test.ts
```
