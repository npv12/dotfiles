# CLI and sessions

This reference covers the installed `tern` command, which is distinct from the SDK's Lua APIs and the scenario/control protocol.

## Start with discovery

```sh
tern --version
tern --help
tern ls --json
tern inspect --json
tern whoami --json
tern COMMAND --help
```

`ls` shows sessions, tabs, blocks, splits, focus, and visibility. `inspect` adds pane/client identity and runtime details. `whoami` reports the identity chain of the pane from which the command runs. Use fresh IDs from these responses. Window selection is `--window KEY`, then `$TERN_WINDOW_KEY`, then the first window.

## Live CLI families

The installed CLI's command synopsis currently includes:

| Family | Common use |
| --- | --- |
| `ls`, `inspect` | Observe sessions, panes, clients, focus, dimensions, and identity. |
| `new`, `split`, `move`, `focus`, `rename` | Create or arrange sessions/tabs/panes and change focus. |
| `open` | Show files in file blocks; `--tab`, `--split`, `--preview`, `--wait`, and `EDITOR='tern open --wait'`. |
| `run`, `send`, `wait`, `keep-open`, `close`, `kill` | Run or interact with pane programs, wait, or manage pane lifetime. `close` and `kill` are consequential. |
| `capture`, `process`, `events` | Read screen/scrollback, inspect a pane process, and stream session events. |
| `pip`, `dock` | Work with floating browser PiP cards and docking. |
| `browser` | Send a browser automation operation as JSON, including `blocks` and `release`. |
| `plugin` | Inspect, install, remove, link, unlink, reload plugins, show the plugin folder, or generate API typings. |
| `remote` | Set up, update, doctor, configure, discover, or trust remote Tern hosts and services. |
| `daemon`, `web` | Manage the session daemon or serve sessions to the web client. These can expose or alter persistent infrastructure; inspect help and ask before setup or changes. |

The exact syntax varies by verb and release. Always use `tern COMMAND --help` rather than guessing argument order.

## Useful read and control examples

```sh
tern ls --json
tern inspect --json
tern capture @focused --scrollback
tern process @focused --json
tern new tab --cwd "$HOME" --keep-open -- /bin/zsh -l
tern open --tab PATH
tern run @focused git status
tern send @focused text "git status"
```

The examples illustrate the CLI families; check help for whether a flag applies to your version. `run` types a command and presses Enter. `send text` injects text without implying that it should be executed. Prefer `send text` when preparing an input for user review; use `run` only when execution is part of the request. `open` shows files in file blocks; use `--tab` or `--split` to force a new block, `--preview` for the tab's preview block without taking focus, and `--wait` when an editor must wait for the block to close.

`capture` supports text, HTML, ANSI, scrollback, and surface text. `process` reports the selected pane's process. `events` emits JSON lines until interrupted; manage its lifetime and do not leave an unnecessary stream running.

## Run and wait without losing output

For a user-requested command that needs its own pane, `new tab [SESSION] --cwd DIR --keep-open -- COMMAND...` launches it directly. Do not inject commands into a pane running an agent, editor, or unrelated task. Keep task text in a file or pass it as a quoted argument rather than interpolating it into executable shell text.

`--keep-open` retains a successful command's output; without it, a successful program normally closes its block. Use the returned block ID for subsequent reads. Check the exit state before relying on a completion event, since a short command may already have finished before the subscription starts.

```sh
tern wait BLOCK --until exit --timeout 60
tern capture BLOCK --scrollback
```

Replace `BLOCK` with the actual ID and retain the same window scope. `wait` accepts `exit`, `prompt`, or `idle=MS` and returns the program's status; 124 means timeout, not success. Prompt or idle only proves that condition, not that tests passed or a server is ready. Confirm readiness from the requested output or endpoint.

Use `events --filter KIND,...` for lifecycle monitoring when needed. Scope matching to the intended pane and stop the subscription on completion or timeout. If events are unavailable, use bounded, backing-off captures of that pane and report the fallback. Do not prune exited panes automatically: retained output may be user-owned work.

## Persistent session behavior

Tern's session daemon can keep shells and blocks alive when windows close, then restore their state later. A new tab is not necessarily a new session. Settings › Sessions › Start at login restores the daemon's sessions at login without opening a window; connecting a window later shows them again. Inspect `ls --json` before creating, moving, or closing anything. Use `new session` only when a separate named workspace is requested. Closing a tab/session may terminate active programs or lose unsaved work; inspect its panes first and ask when the impact is unclear.

## Boundaries

- Do not use development scenario verbs as if they were regular app CLI operations. `tern ctl` needs a running control endpoint; `tern serve` is a headless test server.
- Avoid remote commands that connect, trust keys, install services, or expose a web endpoint until the user asks for that setup.
- Avoid `close`, `kill`, `remote disconnect`, and session close unless the target and intended effect are clear.
- Treat commands entered into a shell as real commands on the host, including remote hosts. Use argument-safe process tools where possible; do not build shell strings from untrusted page or output text.

## Official docs

- [CLI command reference](https://docs.stencil.so/tern/reference/cli.md)
- [Sessions and blocks](https://docs.stencil.so/tern/scripts/sessions.md)
- [Terminal and panes](https://docs.stencil.so/tern/scripts/terminal.md)
- [Tabs and navigation](https://docs.stencil.so/tern/scripts/navigation.md)
- [Remote hosts](https://docs.stencil.so/tern/scripts/remote.md)
