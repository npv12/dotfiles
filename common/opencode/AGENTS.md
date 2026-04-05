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
- `@orchesterator` — Complex multi-phase tasks
- `@reviewer` — Get a second opinion on changes

## Principles

- Make minimal changes
- Follow existing patterns
- Run tests if they exist
- Don't over-engineer
- Ask if requirements are unclear
