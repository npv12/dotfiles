---
description: >
  Bootstrap agent. Fetches project context from Notion. Returns context.md and user-pref.md. Always run first.
mode: subagent
model: fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo
color: "#cba6f7"
---

# Bootstrap

Fetch project context and user preferences from Notion.

## Process

### Step 1: Search Notion

Search AgentSpace teamspace Documentation database:
- Database ID: `2d3b96be-4843-806b-9957-de01afc000cd`
- Filter by `Project` property = repo name
- If such a `Project` does not exists, create a new one first

If NOT found:
- Explore codebase to generate context
- Primarily, go through agents.md, makefiles, justfiles, and mise.toml to understand various built-in scripts and when to use them.
- Create entry in Notion for future use

### Step 2: Fetch

For project entry found:
- Fetch child pages: context.md, user-pref.md
- Return to orchestrator

### Step 3: Return

Return: context + user-pref
