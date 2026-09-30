---
description: Consolidate cross-session learnings from OpenCode history into durable memory
---

Run cross-session memory consolidation for OpenCode (time range: $ARGUMENTS, default: last 7 days).

Pipeline: AUDIT -> GATHER (parallel workers) -> CONSOLIDATE -> ANALYZE -> PROPOSE -> APPLY (on approval).

## Memory System

Target files under `~/.config/opencode/memory/`:
- `MEMORY.md`: Core long-term memory (rules, mistakes, lessons)
- `USER.md`: User profile (preferences, tech stack, communication style)
- `IDENTITY.md`: Agent identity and behavioral rules
- `daily/*.md`: Per-session daily task logs
- `project/*.md`: Project-specific knowledge

## Phase 1: Audit

1. Read `MEMORY.md`, `USER.md`, and `IDENTITY.md`.
2. Inspect `~/.config/opencode/memory/daily/` for gaps or incomplete logs in the time range.
3. Inspect `~/.config/opencode/memory/project/` for stale project files (>30 days).
4. Scan `MEMORY.md` for contradictions, relative dates lacking timestamps, duplicates, or orphaned references.

## Phase 2: Gather

1. Determine epoch timestamps in ms (default: last 7 days, or from $ARGUMENTS).
2. Query sessions from `~/.local/share/opencode/opencode.db` using `session_v2` and `session_message`:
   `SELECT id, title, parent_id, time_created, time_updated, agent, json_extract(model, '$.id') as model_id, cost, tokens_input, tokens_output FROM session_v2 WHERE EXISTS (SELECT 1 FROM session_message WHERE session_message.session_id = session_v2.id AND session_message.time_created >= $FROM_EPOCH_MS AND session_message.time_created < $TO_EPOCH_MS) ORDER BY time_created DESC;`
3. Spawn parallel subagents for meaningful sessions to extract signals:
   - `CORRECTION` (High): User corrections ("actually", "no", "wrong", "stop")
   - `PREFERENCE` (High): Explicit preferences ("I prefer", "always use", "never use")
   - `DECISION` (Medium): Architectural or technical choices ("we decided", "the plan is")
   - `FAILURE_MODE` (Medium): Dead ends, bugs encountered, wasted paths
   - `PATTERN` (Low): Recurring workflows or task sequences
   - `FACT` (Medium): Project knowledge, API quirks, architecture details
4. Subagents return structured JSON findings with type, description, evidence quote, and confidence.

## Phase 3: Consolidate

Merge worker findings, deduplicate identical items, group by signal type, and sort by confidence and recency.

## Phase 4: Analyze

Compare findings against current `MEMORY.md`, `USER.md`, and `IDENTITY.md`.
Classify each as:
- `NEW`: Not in memory -> propose adding
- `MATCH`: Already accurate -> no action
- `UPDATE`: Refines existing entry -> propose updating
- `CONFLICT`: Contradicts existing entry -> propose resolving (evidence-based)
- `ARCHIVE`: Stale entry in existing memory -> propose archiving

## Phase 5: Propose

Present the proposed change list to the user:
- `## ADD ({count})`
- `## UPDATE ({count})`
- `## CONFLICT ({count})`
- `## ARCHIVE ({count})`
- `## MEMORY HEALTH` (daily logs status, coherence issues)

Ask: "Review the changes above. Reply with 'apply' to proceed, or tell me which changes to skip/modify."
Wait for explicit approval. Do NOT proceed to Phase 6 without approval.

## Phase 6: Apply

Only after explicit user approval:
1. Backup memory: `cp -R ~/.config/opencode/memory ~/.config/opencode/memory.bak.$(date +%Y%m%d-%H%M%S)`
2. Use targeted edits on `MEMORY.md`, `USER.md`, `IDENTITY.md`, daily logs, or project logs.
3. Verify changes by reading modified files, then summarize applied updates.
