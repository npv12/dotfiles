# Built-in blocks and workspace features

Tern's UI includes native blocks for common development work. Availability varies across desktop, web, iOS, Android, local and remote hosts; check the feature docs and current build before promising an operation.

| Feature | Useful for |
| --- | --- |
| Terminal panes and persistent sessions | Shells, agents, split layouts, tab/session organization, scrollback and attention inbox. |
| Browser block, profiles, and PiP | Embedded web pages, page snapshots, interactions, floating cards, and per-block cookie/login profiles (shared, repository, session, named, private). |
| Files pane and file blocks | Directory navigation, previews, source editing, Git gutters, image/media views. |
| Media viewer | Images, PDFs, video, audio, and 3D models in file and Git views, with pan/zoom and revision sides. |
| Git block | Commit graph, working-tree changes, diffs, file history, refs and Git forms. |
| SQLite block | Browse tables, execute SQL, inspect schema/Pragmas, edit data, import/export and plot query results. SQL writes mutate the selected database. |
| Markdown board | Task cards/lanes backed by a Markdown file. Editing cards writes that file. |
| Notebook | Jupyter notebook editing and execution with a real local kernel. Code execution has the same consequences as running code in that environment. |
| Canvas | Native canvas boards and drawing tools. |
| Task manager and profile block | Inspect processes and record/analyze profiles; sampling may require OS permissions. |
| Screen block | View a host display and, with permissions and control enabled, send screen input. Treat remote screen control as high impact. |
| Remote hosts and remote blocks | Use shells and blocks on a remote machine; notebooks, SQLite, git, boards and profiling work remotely. Inspect identity and connections before changing them. |
| Web, iOS, and Android clients | View replicated sessions and some remote blocks; plugin halves and platform-specific features differ. |

Prefer an existing block over inventing a custom integration. Use read-only inspection first: inspect the target block, its path/host, and any dirty or running state before editing, executing SQL, running notebook cells, deleting tasks, or sending screen input.

The scenario runner's command inventory (`tern help dev`) includes extensive operations for these blocks. That inventory documents the test/control protocol, not necessarily the public live CLI syntax. Use it only with a real control endpoint or an explicit test request.

## Docs by feature

- [Files pane](https://docs.stencil.so/tern/scripts/files.md) and [file blocks](https://docs.stencil.so/tern/scripts/file.md)
- [Browser blocks](https://docs.stencil.so/tern/scripts/browser.md) and [picture-in-picture](https://docs.stencil.so/tern/scripts/pip.md)
- [Git blocks](https://docs.stencil.so/tern/scripts/git.md)
- [SQLite blocks](https://docs.stencil.so/tern/scripts/sqlite.md)
- [Markdown boards](https://docs.stencil.so/tern/scripts/board.md)
- [Notebooks](https://docs.stencil.so/tern/scripts/notebook.md)
- [Task manager](https://docs.stencil.so/tern/scripts/procs.md) and [profiles](https://docs.stencil.so/tern/scripts/profile.md)
- [Screen blocks](https://docs.stencil.so/tern/scripts/screen.md)
- [Remote hosts](https://docs.stencil.so/tern/scripts/remote.md)
- [Canvas SDK reference](https://docs.stencil.so/tern/reference/api-window.md)
