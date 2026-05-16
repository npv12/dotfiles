---
name: planning
description: Create detailed implementation plans using subagents before writing code. Use for any non-trivial task (3+ steps, architectural changes, new features, or when requirements are unclear). Spawns a planning subagent to explore the codebase and produce an actionable plan.
---

# Planning Skill

Use this skill to create detailed implementation plans before starting any non-trivial coding work.

## When to Use

**Always use planning for:**
- Tasks with 3+ steps
- Architectural changes or new feature design
- When working in an unfamiliar codebase
- When requirements need clarification
- Complex refactors
- Integration work with external systems

**Skip planning for:**
- Single file edits (renaming, simple fixes)
- Trivial documentation updates
- Clear one-line changes

## Usage

Spawn the `@plan` agent with the task description:

```javascript
Agent({
  subagent_type: "plan",
  prompt: `
    Task: [Clear description of what needs to be built/fixed]

    Context:
    - [Any relevant background]
    - [Current state]
    - [Expected outcome]

    Please explore the codebase and provide:
    1. Analysis of relevant files and patterns
    2. Step-by-step implementation plan
    3. Verification criteria for each step
    4. Any open questions
  `,
  description: "Plan for [task]"
})
```

## After Receiving the Plan

1. **Review** the plan for completeness
2. **Ask questions** if anything is unclear
3. **Approve** or request modifications
4. **Execute** the plan step-by-step
5. **Verify** each step before proceeding

## Example

```javascript
// User asks: "Add pagination to the user list API"

// Spawn the planning agent
Agent({
  subagent_type: "plan",
  prompt: `
    Task: Add pagination to the user list API endpoint

    Context:
    - Currently returns all users at once
    - Using Express with MongoDB/Mongoose
    - Need to support page and limit parameters
    - Frontend expects { data: [], total: number, page: number, limit: number }

    Please explore the codebase and provide an implementation plan.
  `,
  description: "Plan user pagination"
})

// The agent returns a plan, then proceed with implementation
```

## Planning Agent Capabilities

The `@plan` subagent:
- Can explore and read the entire codebase
- Cannot write or edit files (read-only)
- Uses medium thinking level for thorough analysis
- Returns structured plans with verification steps

## Best Practices

1. **Provide context** in the prompt - the more the planning agent knows, the better the plan
2. **Be specific** about expected outcomes
3. **Review the plan** before starting implementation
4. **Follow the plan** once approved - don't skip steps
5. **Verify each step** before marking complete

## Workflow Integration

Combine with TODO tracking:

```javascript
// After getting the plan, create structured TODOs
todo({ action: "create", subject: "Set up pagination middleware", ... })
todo({ action: "create", subject: "Update user controller", ... })
todo({ action: "create", subject: "Add tests", ... })
```
