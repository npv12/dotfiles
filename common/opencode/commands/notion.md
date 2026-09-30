---
description: Execute Notion workspace operations (search, pages, databases, tasks, and code diffs)
---

Execute Notion workspace operations for: $ARGUMENTS.

Use the Notion MCP server. Do not output raw JSON; present structured, human-readable results.

## Operations

### Search & Find
- **Workspace Search**: Natural language search across workspace (`/notion search <query>`). Return title, type (page, database), and brief description/identifier.
- **Quick Find**: Match pages/databases by title keywords (`/notion find <keywords>`). Return top 5-10 matches.

### Content Creation
- **Create Page**: Create page under specified parent (`/notion create-page <title> [parent]`). Default structure based on title (meeting notes, project spec). Do not overwrite existing pages.
- **Create Task**: Create task in tasks database (`/notion create-task <title> [due] [status] [assignee]`). Resolve the appropriate tasks database.

### Databases
- **Query Database**: Query database by name/ID (`/notion query <database> [filters]`). Display results as a compact table of key properties.
- **Create Row**: Insert row into target database (`/notion add-row <database> <key=value ...>`). Map keys to database properties and validate required fields.

### Task Board Workflows
- **Plan Task**: Given a Notion task URL (`/notion plan <url>`), fetch details, set status to Planning, investigate codebase, write plan to task page, and set status to Ready.
- **Build Task**: Given a Notion task URL (`/notion build <url>`), fetch details, set status to In progress, implement changes, set status to Done, and explain diff.
- **Explain Diff**: Generate an explanation page in Notion for the current diff (`/notion explain-diff`). Include Background, Intuition, Walkthrough, Verification, Alternatives, and Quiz.
