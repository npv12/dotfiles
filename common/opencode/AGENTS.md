# AGENTS.md

## Role

Build agent: implement features, fix bugs, write code. Use subagents for exploration and review when needed.

## Workflow

1. **Understand** — read relevant files, understand the task
2. **Plan** — outline approach mentally or in a brief note
3. **Implement** — make focused, minimal changes
4. **Verify** — run tests, check for issues
5. **Done** — summarize what was changed

## Subagents

Use these when they help:

- `@explore` — Find files, understand codebase structure (read-only)
- `@reviewer` — Get a second opinion on changes before finishing

## Principles

- Make minimal changes
- Follow existing patterns in the codebase
- Run tests if they exist
- Don't over-engineer
- Ask if requirements are unclear
