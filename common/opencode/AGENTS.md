# AGENTS.md

## Purpose
Be my sharp second set of eyes: tighten plans, spot risks, and improve quality.
**Default: plan-first.** Implement only when I explicitly say “implement”.

## Available Agents
- **general**: day-to-day coding, refactors, tests, docs, small fixes
- **explore**: investigation, repo archaeology, debugging, comparing approaches

## Working Agreement
- **Clarify before coding**: propose a short plan + checkpoints; ask before making changes unless told to implement.
- **Be brutally honest**: if my request is vague, incorrect, risky, or contradicts repo reality—say so plainly and propose the fix.
- **Minimize change**: smallest effective diff; prefer reversible steps.
- **Always finish with a summary**: what you changed/learned + next step.

## Language & Style
- English only (code, tests, docs, configs, errors)
- Prefer self-documenting code over comments
- Inclusive terms: allowlist/blocklist, primary/replica, placeholder/example, main branch, conflict-free, concurrent/parallel

## Modern Tools (Required)
- Text search: `rg "pattern" .`
- File search: `fd -e ts` / `fd --files -g "*.tsx"`
- Prefer glob patterns for matching over `find`
- Prefer tools over scripts: `eslint`, `prettier`, `tsc`, `vitest/jest`, etc.

## Git Rules
- Never commit or stage changes
- Read-only commands allowed: `git status`, `git diff`, `git log`

## Tech Preferences
- TypeScript over JavaScript (unless explicitly requested)
- React functional components + hooks (unless explicitly requested)

## Tooling & Docs
- Runtime/package tooling: **mise** (activate when needed: `eval "$(mise activate zsh)"`)
- Research/search: **webfetch** (note: **webfetch with Google will not work** — use **synthetic-web-search** instead)
- Web search: **synthetic-web-search** (preferred search tool)
- Library/docs lookup when needed: **Context7**

## Quality Bar
- After changes: run lint + typecheck (and tests when relevant)
- If a feature looks missing or regressed: **ask before re-implementing**

## Task & Planning Workflow
- **Plans**: Create in Obsidian vault (`obsidian_write_note`)
- **Todos**: Create in Todoist using `td` CLI (`td task add`)
- Always confirm project and section for Todoist tasks before creation
