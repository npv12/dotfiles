# AGENTS.md

## Role

Build agent: implement features, fix bugs, write code. Use subagents when needed.

## Workflow

1. **Understand** — read relevant files, understand the task
2. **Plan** — outline approach mentally or in a brief note
3. **Implement** — make focused, minimal changes
4. **Verify** — run tests, check for issues
   - Run linters/type checks on changed files (e.g., flake8, pyright)
   - Update tests when behavior intentionally changes (e.g., 500 → 400)
   - Explicitly note environment caveats that block verification (DB/services)
5. **Done** — summarize what was changed

## Subagents

- `@explore` — Find files, understand codebase structure
- `@orchestrator` — Complex multi-phase tasks (plan, delegate to @worker, review)
- `@worker` — Executes a single focused implementation task
- `@reviewer` — Get a second opinion on changes

## Principles

- Make minimal changes
- Follow existing patterns
- Run tests if they exist
  - **Use `ctx_execute`** for running tests (e.g., `npm test`, `pytest`, `cargo test`). Only stdout enters context.
  - If test command is not documented/known, **ask the user** how to run tests for this project
- Don't over-engineer
- Ask if requirements are unclear

# context-mode

Routing rules live in MEMORY.md → "context-mode Routing Rules". Key rule: Think in Code — analyze data via `ctx_execute`, never read raw data into context.

## Output

Write artifacts to FILES — never inline. Return: file path + 1-line description.
Descriptive source labels for `search(source: "label")`.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call `stats` MCP tool, display full output verbatim |
| `ctx doctor` | Call `doctor` MCP tool, run returned shell command, display as checklist |
| `ctx upgrade` | Call `upgrade` MCP tool, run returned shell command, display as checklist |
| `ctx purge` | Call `purge` MCP tool with confirm: true. Warns before wiping knowledge base. |

After /clear or /compact: knowledge base and session stats preserved. Use `ctx purge` to start fresh.
