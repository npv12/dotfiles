---
name: td-todoist-assistant
description: Create Todoist tasks with the official `td` CLI using a confirmation-first workflow. Use when a user asks to create or add a todo, especially prompts like "create a todo for me". Ask for project first, resolve or create a section with confirmation, ask for due date and priority, then create with `td task add`.
---

# TD Todoist Assistant

Use the official Todoist CLI command `td`.

Prefer structured commands over natural-language quick add.
Use `td task add` for task creation.
Use `td add` only when the user explicitly asks for quick-add text parsing.

## Preconditions

1. Check authentication with `td auth status`.
2. If not authenticated, ask the user to run `td auth login` (or `td auth token <token>`) before continuing.

## Required Creation Workflow

1. Ask for task content if it is missing.
2. Ask for project before any create call.
3. Fetch projects with `td project list --json --all`.
4. Present project options as a concise numbered list and ask the user to choose.
5. Fetch sections with `td section list --project "<project>" --json --all`.
6. Present section options and ask the user to choose the best target section.
7. If no matching section exists, propose creating one and ask for confirmation.
8. Create section only after confirmation using `td section create --project "<project>" --name "<section>"`.
9. Ask for due date and priority.
10. Ask for optional fields when relevant: labels, description, assignee, deadline, duration, parent task.
11. Show a final summary and ask for explicit confirmation.
12. Create the task with `td task add` and structured flags.
13. Report success or failure and show the exact command that was run.

## Option-Presentation Rules

1. Use numbered options when asking for project or section.
2. Put the best match first.
3. Include up to 7 options to keep choices clear.
4. Include a create-new option when no good match exists.

## Canonical Task Create Command

`td task add "<content>" --project "<project>" --section "<section>" --due "<due>" --priority <p1-p4> [optional flags]`

Include only flags that have values.
Quote text values.
Prefer `id:xxx` references when names are ambiguous.

## High-Signal Commands

- Projects: `td project list --json --all`
- Sections for project: `td section list --project "<project>" --json --all`
- Create section: `td section create --project "<project>" --name "<section>"`
- Create task: `td task add "<content>" ...`
- Optional context scan: `td task list --project "<project>" --json --all`

## Inventory Reference

Read `references/td-command-inventory.md` for grouped command coverage.
Read `references/td-help-full.txt` for raw recursive `--help` output of all discovered commands.
