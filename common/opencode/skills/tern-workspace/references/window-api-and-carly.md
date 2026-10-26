# Window API and Carly

Tern's window plugin API exposes structured access to app state beyond the terminal CLI. Carly is Tern's built-in assistant surface and can use these APIs when available. These capabilities are distinct from this OpenCode session: do not assume Carly is installed, configured, or callable from OpenCode.

## Read before acting

`cx.session:read` reads typed block data without scraping rendered UI. Depending on block type, this can include browser URL/title/loading/history, file contents including unsaved edits, Git status and diffs, SQLite schema/rows, notebook cells and outputs, board state, process/profile data, and screen state. Prefer this targeted read over broad dumps or page JavaScript when available.

The window API also has object-specific surfaces for sessions, files/docs, boards, agents, screens, browsers, databases, hosts, and processes. Use the current API reference and generated types from the installed Tern build to confirm signatures and support.

## Carly's built-in capabilities

The Carly guide documents tools to inspect sessions, hosts, tabs, panes, agents and processes; inspect/read blocks; inspect or configure settings; switch/create/close sessions; arrange tabs; discover and run actions; signal processes; run commands; send input; chain agents; and execute Lua. Window-side plugin context (`cx`) has additional APIs for the feature families above.

Treat actions as real operations, not chat-only suggestions. Prefer inspect/read tools first. Ask before closing sessions, changing settings, signaling processes, running commands, sending shell input, modifying files/database/Git state, or controlling screens when user intent does not explicitly cover the effect.

## Extending Carly

Window plugins can export functions and context into Carly with `tern.carly.export` and `tern.carly.context`; the API also documents scheduled tasks. This makes plugin code callable by the built-in assistant and can give it access to the plugin's other capabilities. Review the exported functions and their side effects carefully. Do not expose an unrestricted shell, filesystem, network, or pane-input function as a convenience wrapper.

## Security and availability

Plugin APIs run with the user's Tern account rights and do not provide a per-capability permission gate. Carly and Window API availability can vary by Tern build, platform, and plugin configuration; Carly runs in the desktop app, the web client, and on iOS. This reference describes documented features, not proof they are enabled in the current live window. Confirm with the installed version and local API typings before relying on an operation.

Other agent integrations' tools are not public CLI commands and are not available merely because `tern ls` succeeds. Do not install a bridge or copy another tool's names into shell commands to fill a capability gap.

A document read through the window API may include unsaved edits absent from the disk file. Read the live block before overwriting its backing file. Keep database queries read-only unless writes were requested, and do not inspect credential stores or secret columns as a discovery shortcut. Treat Carly as potentially using remote model providers; do not forward vault contents, credentials, or private captures without explicit authorization.

## Official references

- [Carly guide](https://docs.stencil.so/tern/guides/carly.md)
- [Window API reference](https://docs.stencil.so/tern/reference/api-window.md)
- [Plugin security model](https://docs.stencil.so/tern/concepts/security.md)
