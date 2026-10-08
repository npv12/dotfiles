# Built-in blocks and workspace features

Tern's UI includes native blocks for common development work. Availability varies across desktop, web, iOS, local and remote hosts; check the feature docs and current build before promising an operation.

| Feature | Useful for |
| --- | --- |
| Terminal panes and persistent sessions | Shells, agents, split layouts, tab/session organization, scrollback and attention inbox. |
| Browser block and PiP | Embedded web pages, page snapshots, interactions, and floating cards. |
| Files pane and file blocks | Directory navigation, previews, source editing, Git gutters, image/media views. |
| Git block | Commit graph, working-tree changes, diffs, file history, refs and Git forms. |
| SQLite block | Browse tables, execute SQL, inspect schema/Pragmas, edit data, import/export and plot query results. SQL writes mutate the selected database. |
| Markdown board | Task cards/lanes backed by a Markdown file. Editing cards writes that file. |
| Notebook | Jupyter notebook editing and execution with a real local kernel. Code execution has the same consequences as running code in that environment. |
| Canvas | Native canvas boards and drawing tools. |
| Task manager and profile block | Inspect processes and record/analyze profiles; sampling may require OS permissions. |
| Screen block | View a host display and, with permissions and control enabled, send screen input. Treat remote screen control as high impact. |
| Remote hosts | Use shells and blocks on a remote machine, inspect identity, connect/disconnect and manage remote services. |
| Web/iOS clients | View replicated sessions; plugin halves and platform-specific features differ. |

Prefer an existing block over inventing a custom integration. Use read-only inspection first: inspect the target block, its path/host, and any dirty or running state before editing, executing SQL, running notebook cells, deleting tasks, or sending screen input.

The scenario runner's command inventory (`tern help dev`) includes extensive operations for these blocks. That inventory documents the test/control protocol, not necessarily the public live CLI syntax. Use it only with a real control endpoint or an explicit test request.

## Docs by feature

- [Files pane](https://docs.stencil.so/tern/scripts/files.md) and [file blocks](https://docs.stencil.so/tern/scripts/file.md)
- [Git blocks](https://docs.stencil.so/tern/scripts/git.md)
- [SQLite blocks](https://docs.stencil.so/tern/scripts/sqlite.md)
- [Markdown boards](https://docs.stencil.so/tern/scripts/board.md)
- [Notebooks](https://docs.stencil.so/tern/scripts/notebook.md)
- [Task manager](https://docs.stencil.so/tern/scripts/procs.md) and [profiles](https://docs.stencil.so/tern/scripts/profile.md)
- [Screen blocks](https://docs.stencil.so/tern/scripts/screen.md)
- [Remote hosts](https://docs.stencil.so/tern/scripts/remote.md)
- [Canvas SDK reference](https://docs.stencil.so/tern/reference/api-window.md)
