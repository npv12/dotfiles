# Plugins and trust

Tern plugins are Luau packages with a `plugin.toml` manifest and optional host/window entrypoints. Use them to add reusable capabilities to Tern, not as a prerequisite for controlling existing sessions.

## Choose an extension point

| Need | Extension |
| --- | --- |
| Turn command output into a structured native view | Command lens, declared by narrow manifest globs and implemented in the host half. Raw output remains available. |
| Add a persistent interactive pane | Host-side plugin block with state, view, events, and save/restore. |
| React to shell commands, cwd/title changes, pane exits, or alter new-shell launch setup | Host hooks and spawn filter. |
| Add palette commands, keybindings, or intercept built-in commands | Window command, bind, or override. |
| Route file opens and clicked links | Window open/link routes. |
| Add tab/window titles, status segments, or styles | Window chrome formatter and CSS. |
| Build a project workspace | Window layout APIs and workspace specs. |
| Let a CLI/TUI render native surfaces | Tern Surface Protocol and SDK. |

Host code runs beside the panes, often in the session daemon. Window code runs in each Tern window and can change its UI/layout. Do not mix the two contexts; check the API reference for which `tern` methods exist on each side.

## Development path

1. Read the manifest reference and the specific API guide before naming IDs or writing code.
2. Start from an official example that matches the goal rather than inventing an API.
3. Generate types from the installed build with `tern plugin types DIR`; use `--!strict` and `luau-lsp` if available.
4. Review every called file/process/network/shell-input API before running it.
5. Link a development checkout with `tern plugin link DIR` only after the user approves running that code. Linked changes reload automatically; `tern plugin list` reports host-side status.
6. Verify the behavior with a narrow live scenario. Do not treat a parsed manifest or a headless fixture as proof of live behavior.
7. Remove a linked plugin with `tern plugin unlink ID` only when requested; removal/unlink changes the user's plugin setup.

## Trust model

Installing or linking a plugin runs its code as the Tern user, without a per-capability permission prompt. The Luau sandbox is not a hostile-code boundary. APIs can read/write files, start programs, make HTTP requests, observe command lines and write into shells. Window plugins can also send commands to panes, including remote panes. Review `plugin.toml`, both entrypoints, required modules, and all `tern.process.run`, `tern.fetch`, `tern.fs.write/remove`, `tern.pane.write`, and `cx:run` paths before installation. Pin or inspect the source that will actually be installed; a mutable repository URL may change between review and install.

Do not install a plugin just to demonstrate capability. The current machine's plugin list must be checked with `tern plugin list`; an empty list means no plugin extensions are active, not that built-in Tern capabilities are absent.

## Official docs and code

- [SDK overview](https://docs.stencil.so/tern)
- [Getting started](https://docs.stencil.so/tern/guides/getting-started.md)
- [Plugin architecture](https://docs.stencil.so/tern/concepts/architecture.md)
- [Trust and security](https://docs.stencil.so/tern/concepts/security.md)
- [Commands, keys and overrides](https://docs.stencil.so/tern/guides/commands.md)
- [Host hooks](https://docs.stencil.so/tern/guides/hooks.md)
- [Blocks](https://docs.stencil.so/tern/guides/blocks.md)
- [Command lenses](https://docs.stencil.so/tern/guides/lenses.md)
- [Routing opens and links](https://docs.stencil.so/tern/guides/routing.md)
- [Layout and workspaces](https://docs.stencil.so/tern/guides/layout.md)
- [Chrome and styling](https://docs.stencil.so/tern/guides/chrome.md)
- [Example plugins](https://docs.stencil.so/tern/examples/index.md)
- [SDK repository](https://github.com/stencil-hq/tern-sdk)
