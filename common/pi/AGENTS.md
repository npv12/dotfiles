# AGENTS.md — Behavioral Guidelines & Agent Configuration

Behavioral guidelines and agent customization reference for pi coding sessions.

> **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

**For non-trivial tasks (3+ steps, architectural changes), spawn the planning agent FIRST:**

```javascript
Agent({
  subagent_type: "plan",
  prompt: `Task: [description]
Context: [relevant background]`,
  description: "Plan for [task]"
})
```

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Subagent Reference

Custom agents are defined in `.pi/agents/<name>.md` with YAML frontmatter.

### Available Subagents

- `@plan` — Create implementation plans before coding. Use for any non-trivial task (3+ steps, architectural changes, unclear requirements)
- `@explore` — Explore and understand the codebase, find files, map structure
- `@worker` — Execute a single clearly defined implementation task

### Context-Mode Skills

Use context-mode tools to save context window:

| Use Case | Tool | Example |
|----------|------|---------|
| Analyze >20 lines output | `ctx_execute` | `ctx_execute({ language: "javascript", code: "..." })` |
| Batch commands | `ctx_batch_execute` | Multiple commands in ONE call |
| Fetch + index docs | `ctx_fetch_and_index` | `ctx_fetch_and_index({ url: "..." })` |
| Search indexed content | `ctx_search` | `ctx_search({ queries: ["..."] })` |
| Check savings | `ctx_stats` | `/ctx-stats` |

**Think in Code**: Process data with scripts, only return summaries to context.

### Pi-Memory

Persistent memory that learns from sessions and injects context automatically.

**Memory Types:**
- `pref.*` — User preferences (coding style, workflow habits)
- `project.*` — Project patterns (frameworks, architecture)
- `tool.*` — Tool preferences (e.g., "use sed for file edits")
- `user.*` — User identity (timezone, name)
- `lessons` — Learned corrections (deduplicated)

**Commands:**
| Command | Description |
|---------|-------------|
| `/memory-consolidate` | Manually trigger extraction |
| `memory_remember` | Store a fact manually |
| `memory_search` | Search memory by keyword |
| `memory_lessons` | List learned corrections |
| `memory_stats` | Show memory statistics |

**Config:** Consolidation uses `ollama/deepseek-v4-flash` at session end.

### Pi-Bar

Status bar showing model, thinking level, context pressure, live TLDR, and extension statuses.

**Segments:**
- `model` — Active model (catches accidental switches)
- `thinking` — Current thinking level
- `context` — Context usage (green/yellow/red thresholds)
- `tldr` — Live one-line summary of current task
- `extensions` — Extension statuses from `ctx.ui.setStatus()`

**Commands:**
| Command | Description |
|---------|-------------|
| `/bar` | Toggle status visibility |

### Frontmatter Fields

| Field | Description |
|-------|-------------|
| `description` | What this agent does |
| `mode` | `subagent` (always) |
| `model` | `provider/modelId` or fuzzy name (`haiku`, `sonnet`, `opus`) |
| `tools` | Comma-separated: `read, bash, edit, write, grep, find, ls` |
| `thinking` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `max_turns` | Max turns before graceful shutdown (omit for unlimited) |
| `prompt_mode` | `replace` (standalone) or `append` (inherits parent prompt) |
| `disallowed_tools` | Comma-separated tools to deny (e.g., `write, edit` for read-only) |

### Spawning Subagents with Custom Models

Custom models are configured in `@common/pi/models.json`. Available models:

| Model ID | Provider | Use Case |
|----------|----------|----------|
| `Claude Opus 4.6` | bedrock | Complex tasks, deep reasoning |
| `Claude Sonnet 4.5` | bedrock | Balanced speed and capability |
| `Claude Haiku 4.5` | bedrock | Fast, simple tasks |
| `deepseek-v4-flash` | opencode-go | Quick exploration (default for @explore) |
| `kimi-k2.5` | ollama-cloud | Implementation tasks (default for @worker) |

```javascript
// Plan the implementation BEFORE coding
Agent({
  subagent_type: "plan",
  prompt: `Task: Add pagination to the user list API

  Context:
  - Currently returns all users at once
  - Using Express with MongoDB/Mongoose
  - Frontend expects { data: [], total, page, limit }`,
  description: "Plan user pagination"
})

// Explore the codebase
Agent({
  subagent_type: "explore",
  prompt: "Find all files related to authentication",
  description: "Find auth files",
  run_in_background: true
})

// Execute with specific model
Agent({
  subagent_type: "worker",
  prompt: "Add validation to the login function in /src/auth.ts",
  description: "Add login validation",
  model: "Claude Sonnet 4.5"
})
```

## Prompt Templates

Use `/orchestrator` to invoke the orchestrator prompt template for complex multi-step tasks requiring delegation and coordination.

---

## 5. User Interaction Guidelines

### Asking Questions with `ask_user_question`

Use the `ask_user_question` tool when you need to:
- Gather user preferences or requirements
- Clarify ambiguous instructions
- Get decisions on implementation choices
- Offer choices about direction

**Question Guidelines:**
- Ask up to 4 questions per invocation
- Each question MUST have 2-4 options with labels (1-5 words)
- Every option requires a description explaining choices/trade-offs
- Users can always type a custom answer ("Type something.") or pick "Chat about this"

**Question Types:**

1. **Single-select** (default): User picks one option from the list
   - Use `multiSelect: false` (or omit)
   - A "Type something" row is appended automatically

2. **Multi-select**: User can pick multiple answers
   - Set `multiSelect: true`
   - Suppresses "Type something" row

**Previews:** Use `preview` field on options for rich side-by-side context:
- ASCII mockups of UI layouts
- Code snippets showing implementations
- Diagram variations
- Configuration examples

> **Note:** When any option has a `preview`, "Type something" is suppressed; "Chat about this" remains as escape hatch.

**Example Structure:**
```javascript
ask_user_question({
  questions: [{
    question: "Which approach should we take?",
    options: [
      {
        label: "Simple approach (Recommended)",
        value: "simple",
        description: "Basic implementation, easy to maintain",
        preview: "```javascript\n// Minimal code\n```"
      },
      {
        label: "Complex approach",
        value: "complex",
        description: "Full-featured but requires more code"
      }
    ]
  }]
})
```

**Do NOT:**
- Stack multiple `ask_user_question` calls back-to-back
- Author "Other" / "Type something" / "Chat about this" labels yourself (duplicates rejected)
- Include large unchanged regions when showing code changes

---

## 6. TODO List Management

Always maintain a TODO list for complex work (3+ steps, task lists, or anytime receiving new instructions).

### When to Create TODOs

| Scenario | Action |
|----------|--------|
| Complex work (3+ steps) | Create TODO immediately |
| User provides task list | Capture as TODO |
| Receiving new instructions | Create TODO to capture requirements |
| Single trivial task | Skip TODO |
| Purely conversational requests | Skip TODO |

### TODO Lifecycle

```
pending → in_progress → completed (+ deleted as tombstone)
```

**Exactly ONE task should be `in_progress` at any time.**

### Status Management

```javascript
// Create a task
todo({
  action: "create",
  subject: "Research existing tool",
  description: "Long-form detail here"
})

// Start working on a task
todo({
  action: "update",
  id: 1,
  status: "in_progress",
  activeForm: "researching existing tool"  // Present-continuous label
})

// Mark complete
todo({
  action: "update",
  id: 1,
  status: "completed"
})
```

### Task Dependencies

Use `blockedBy` when creating/updating tasks:
- `blockedBy: [2, 3]` — Task 1 is blocked by tasks 2 and 3
- Use `addBlockedBy` / `removeBlockedBy` for incremental updates

**REFUSAL RULES — todo tool will reject:**
- Calling `todo({ action: "update" })` without `id`
- Marking complete if tests fail, implementation partial, or unresolved errors
- Marking complete when blocked by incomplete dependencies

### Key Commands

| Command | Description |
|---------|-------------|
| `todo({ action: "create", ... })` | New task (pending → ready to start) |
| `todo({ action: "update", id: N, status: "in_progress" })` | Start working |
| `todo({ action: "update", id: N, status: "completed" })` | Finish task |
| `todo({ action: "list" })` | Show all tasks |
| `todo({ action: "get", id: N })` | Single task details |
| `todo({ action: "clear" })` | Reset all |

> **Never mark complete** if tests are failing, implementation is partial, or unresolved errors exist.

---

## Reference Checklist

| Task | How |
|------|-----|
| Plan implementation | `Agent({ subagent_type: "plan", prompt: "..." })` |
| Ask user for preferences | `ask_user_question` with 2-4 options |
| Track multi-step work | `todo({ action: "create", ... })` → update to `in_progress` → `completed` |
| Use explore agent | `Agent({ subagent_type: "explore", prompt: "..." })` |
| Use worker agent | `Agent({ subagent_type: "worker", prompt: "..." })` |

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes, and task progress is always transparent via TODOs.
