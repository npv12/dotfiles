# Scripts and control endpoint

Tern's scenario runner and control endpoint are valuable for repeatable UI tests, plugin debugging, screenshots, and headless captures. They are not interchangeable with the installed CLI's ordinary live commands.

## Endpoints and invocation

- `tern serve [--control EP] [--out DIR]` starts a headless control server.
- `tern --control EP [ARGS]` starts a desktop window listening on a control endpoint.
- `tern ctl [--control EP] COMMAND...` sends one command to a running endpoint.
- `tern ctl [--control EP] --file SCENARIO` sends script lines one at a time and stops at the first failure.
- `tern shot [SCENARIO...]` runs scenarios headlessly and writes screenshots plus layout JSON.

An endpoint is a Unix socket or TCP port on loopback. Use only the endpoint belonging to the intended window/server. Do not start `tern serve` expecting to control the user's live window: it creates a separate synthetic headless environment unless configured otherwise.

## Scenario form

A scenario has one command per line, `#` comments, blank lines ignored, and double-quoted arguments with `\"`, `\\`, `\n`, and `\t` escapes. Example:

```text
ready
split right
run "git status"
expect "On branch"
focus left
run "ls"
shot split-status
```

Commands settle before the next command; waits that depend on real work time out after 20 seconds. Use feature-specific waits such as `ready`, `file wait`, `git wait`, `notebook wait`, or `media wait`, not generic time delays, when asserting results. `wait MS` advances app/test time; it does not prove shell or network work completed.

The harness also supports keyboard, pointer, drag/drop, gestures, accessibility actions, window sizing, animation time control, screenshots and menu/dialog responses. These can drive real UI in a controlled window; use them only for the requested window and verify the visible state afterward.

## Inspection operations

The control endpoint offers:

- `state` for sessions, tabs, panes, focus, blocks, remote hosts and feature state;
- `tree`, `dump`, `a11y`, `menus`, `stats`, `layers`, and `system` for rendered UI, accessibility, menus, timing and OS integrations;
- `webcall` and `webreports` for embedded web views;
- `css`, `perf`, and `trace` for live styling and performance diagnostics;
- `resize`, `thaw`, and `quit` for endpoint/window lifecycle.

`quit` closes the app/server. Avoid it unless explicitly requested. CSS patches change the live window; `system` and `webcall` can expose sensitive details. Use the narrowest inspection needed.

## Official docs

- [Scripts overview](https://docs.stencil.so/tern/scripts/index.md)
- [Control endpoint](https://docs.stencil.so/tern/scripts/control.md)
- [Harness input and screenshots](https://docs.stencil.so/tern/scripts/harness.md)
- [Browser block scripts](https://docs.stencil.so/tern/scripts/browser.md)
- [Debugging plugins](https://docs.stencil.so/tern/guides/debugging.md)
