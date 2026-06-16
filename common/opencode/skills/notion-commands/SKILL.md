---
name: notion-commands
description: Curated Notion workflows — search, create pages, manage tasks, query databases, and build from task boards. Bundles all slash commands from the official Notion Claude Code plugin as actionable agent prompts.
---

# Notion Commands

Curated workflows for common Notion operations. Each section maps to a slash command from the official [Notion Plugin for Claude Code](https://github.com/makenotion/claude-code-notion-plugin).

## Search Workspace

Search the user's Notion workspace for content related to a query.

```
1. Interpret the query as a natural-language search (e.g. "Q1 roadmap", "customer feedback")
2. Use the Notion MCP server to search:
   - Prefer fast, high-signal tools like workspace search or database queries
3. Return a short, scannable list with:
   - Page/database title
   - Type (page, database, task list)
   - One-line description or key fields
4. If no results, suggest refinements or alternative queries
```

**Do not dump raw JSON.** Return a human-readable summary with links/identifiers.

## Quick Find

Quickly locate pages or databases by title keywords.

```
1. Treat the query as fuzzy search terms for titles (e.g. "Q1 plan", "Claude spec")
2. Search both pages and databases
3. Return best matches (5-10) with:
   - Title
   - Type (page or database)
   - Location / parent (if available)
4. Prefer precision over recall
```

## Create Page

Create a new Notion page, optionally under a specific parent.

```
1. Parse input: page title, optional parent page/database
2. If parent is ambiguous, ask a brief clarifying question
3. Create the page with a sensible default structure based on title:
   - "Meeting notes" → Attendees, Agenda, Notes, Action items
   - "Project" → Overview, Goals, Timeline, Tasks, Risks
4. Confirm: title, parent location, link/identifier

Do not overwrite existing pages. If a page with the same name exists in the same parent, ask.
```

## Create Task

Create a new task in the user's Notion tasks database with sensible defaults.

```
1. Parse input:
   - Task title (required)
   - Optional: due date, status, owner/assignee, project
2. Identify the appropriate "Tasks" database:
   - Prefer a database whose name/description indicates tasks/todo items
   - If multiple candidates, ask user to choose
3. Create a new row with mapped properties
4. Confirm: title, key properties, link/identifier
```

## Query Database

Query a Notion database by name or ID and return structured, readable results.

```
1. Parse input: target database (name or ID), optional filters/sorts
2. If multiple databases match, ask user to choose
3. Query with filters applied (e.g. status = Active, due this week)
   - Limit to 20-50 rows unless explicitly asked for more
4. Present results in a compact table-like format with key properties
5. If no rows match, say so clearly and suggest alternative filters
```

## Create Database Row

Insert a new row into a specified Notion database using natural-language property values.

```
1. Parse input: target database (name/ID), key=value property pairs
2. Resolve the database — if multiple matches, ask user
3. Map provided keys to actual property names (handle naming differences)
4. Validate required properties — ask for missing values
5. Create the row and confirm with: database name, key properties, link
```

## Task Board Workflows

### Setup Task Board

Guide the user through setting up a Notion task board for task tracking.

```
Option 1 — Use Template:
  - Point user to duplicate: https://notion.notion.site/code-with-notion-board
  - Ask them to share the URL of their new board

Option 2 — Use Existing Board:
  - Ask for the board URL
  - Inspect the board structure via Notion MCP
  - Ensure it has: Status property (Planning/In Progress/Done),
    "Agent status" text property, "Agent blocked" checkbox property
```

### Plan Task from Notion URL

Plan a task tracked in Notion and write the plan back to the task page.

```
Communication Protocol:
  - Add a comment prefixed with "Message from Claude:" (bold)
  - Set "Agent blocked" = true, "Agent status" = short message
  - Poll every 10s for user response via sub-agent (max 100 turns)

Workflow:
1. Fetch task details from Notion (title, description, properties, linked pages)
2. Set status to "planning", agent status to 🤖 "Planning..."
3. Explore the codebase or context needed for the plan
4. If stuck, use the Communication Protocol to ask user
5. Write the plan into a new "Plan" section on the task page
6. Set status to "Ready"
```

### Build Task from Notion URL

Build a task tracked in Notion with async status updates.

```
Communication Protocol: Same as Plan Task (comment + poll)

Workflow:
1. Fetch task details from Notion
2. Set status to "In progress", agent status to 🤖 "Starting..."
3. Implement per the specification — update agent status at each step:
   📂 Searching relevant files...
   🎨 Updating color scheme...
   🧪 Running tests...
4. On completion:
   - Set status to "Done"
   - Run explain-diff if code was changed
```

### Explain Code Diff

Generate a rich explanation of code changes as a new Notion page.

```
Sections:
- **Background**: Existing system context. Deep background for beginners + narrow background relevant to change.
- **Intuition**: Core essence of the change. Use concrete examples with toy data, mermaid diagrams.
- **Code**: High-level walkthrough of changes, grouped understandably.
- **Verification**: How correctness was verified. Step-by-step manual QA guide.
- **Alternatives** (optional): 1-2 alternative approaches with pros/cons in 2-column layout.
- **Quiz**: 5 medium-difficulty questions with multiple choice and explanations (toggle blocks).

Write with clarity and flow. Use callouts for key concepts and edge cases.
```
