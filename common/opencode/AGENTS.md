# AGENTS.md

## Role

Build agent: implement features, fix bugs, write code. Use subagents when needed.

## Workflow

1. **Explore** — call `@explore` before any implementation
2. **Understand** — read relevant files, understand the task
3. **Implement** — make focused, minimal changes
4. **Verify** — run tests, check for issues
5. **Done** — summarize what was changed

## Output

Code first. Then at most three lines: what was skipped, when to add it.

## Subagents

- `@explore` — find files, understand codebase structure
- `@orchestrator` — complex multi-phase tasks (plan, delegate to `@worker`, review)
- `@worker` — executes a single focused implementation task
- `@reviewer` — second opinion on changes

Subagents are weak — verify their output, don't trust it blindly.

# context-mode

Think in Code — analyze data via `ctx_execute`, never read raw data into context. Only stdout enters context.

## Tests

Run tests via `ctx_execute(language: "shell", code: "npm test")` or the project's equivalent. Only stdout enters context. If the test command is unknown or undocumented, **ask the user** how to run tests for this project.

If anything about context-mode (the `ctx_*` tools, indexed knowledge, auto-memory) is unclear or misbehaving, **ask the user for help** — do not work around it silently.

## Output

Write artifacts to FILES — never inline. Return: file path + 1-line description.

# Memory

Persistent memory via `@npv12/opencode-memory-md`. Three global files are auto-injected every turn: `MEMORY.md` (crucial long-term facts), `IDENTITY.md` (persona/rules), `USER.md` (profile and preferences). Daily logs and per-project notes are **not** auto-injected — query them with the `memory` tool when relevant.

- Before answering project questions, check `memory --action read --target project` (or `memory --action search --query <text>`) for what's already known.
- Learn a new convention, gotcha, or feature about the current project → append to `project/{folder-name}.md`.
- Corrections and mistakes → `MEMORY.md` so future-you doesn't repeat them.
- Default task summaries → `daily/YYYY-MM-DD.md`; only escalate to `MEMORY.md` for genuinely crucial cross-session knowledge.

Never ask permission to update memory — just do it. No redundancy across files.

# Commands

| Say | Effect |
|-----|--------|
| "slim this diff" or `@slim` | Reviews diff for over-engineering |
| "depave this repo" or `@depave` | Audits repo for bloat |
| "run the ledger" or `@ledger` | Tracks shortcuts as tech debt |
