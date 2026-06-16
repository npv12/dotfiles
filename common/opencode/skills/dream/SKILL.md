---
name: dream
description: Cross-session memory consolidation for OpenCode. Reviews session history from the opencode database, extracts patterns/decisions/preferences/corrections via parallel worker subagents, validates memory coherence, then proposes updates for user approval. Manual trigger.
license: MIT
compatibility: opencode
---

# Dream — Cross-Session Memory Consolidation

Consolidates learnings across OpenCode sessions into durable memory. The skill reads session history from the opencode database, parallel-analyses each session for signals (corrections, decisions, preferences, failure modes, patterns), cross-references against existing memory, then proposes changes for approval.

## When to Use

Use this skill when:
- You want to consolidate learnings from recent sessions
- You want to validate that daily logs, project logs, and core memory are coherent
- You suspect memory has gaps, contradictions, or stale entries
- Periodically (weekly) for routine memory maintenance

Invoke with: "Run the dream skill" (defaults to last 7 days) or "Run the dream skill for the last 2 weeks" etc.

## Memory System

All files under `~/.config/opencode/memory/`:

| File | Purpose |
|------|---------|
| `MEMORY.md` | Core long-term memory: rules, mistakes, lessons |
| `USER.md` | User profile: name, role, preferences, tech stack |
| `IDENTITY.md` | Agent identity: name, personality, behavioral rules |
| `daily/*.md` | Per-session daily logs |
| `project/*.md` | Project-specific knowledge |

## Pipeline Overview

Execute the following 6 phases **in order**. Do not skip phases. Only Phase 6 writes to disk — everything before is read-only.

```
AUDIT → GATHER (parallel workers) → CONSOLIDATE → ANALYZE → PROPOSE → APPLY
```

---

## Phase 1: AUDIT — Validate Existing Memory

**Goal**: Assess current memory health before making any changes. Read-only.

### 1a — Read memory files

Read these files and understand their current state:
- `~/.config/opencode/memory/MEMORY.md`
- `~/.config/opencode/memory/USER.md`
- `~/.config/opencode/memory/IDENTITY.md`

### 1b — Validate daily logs

```bash
ls ~/.config/opencode/memory/daily/
```

For each day in the time range (default: last 7 days), check:
- Does a `YYYY-MM-DD.md` file exist? If missing → flag as **gap**.
- Does the file have meaningful content (task descriptions, decisions, not just headings)? If not → flag as **incomplete**.

### 1c — Validate project logs

```bash
ls ~/.config/opencode/memory/project/
```

For each project file, check:
- Does the referenced project directory still exist? If not → flag as **stale**.
- Is the information current or outdated? Flag if >30 days since update.

### 1d — Scan for coherence issues in MEMORY.md

Look for:
- **Contradictions**: Two entries stating opposite things
- **Relative dates**: "yesterday", "last week", "recently" without absolute timestamps
- **Orphaned references**: Links to files/entries that no longer exist
- **Duplicates**: Same information repeated across sections

### 1e — Write audit findings

Write output to `/tmp/dream-audit.md`:

```markdown
# Dream Audit

Generated: {timestamp}
Time range: {from} to {to}

## Daily Log Health
- Present: {list of files}
- Missing: {list}
- Incomplete: {list}

## Project Log Health
- Present: {list of files}
- Stale: {list}

## Coherence Issues
- Contradictions: {count} — {details}
- Relative dates: {count} — {details}
- Orphaned refs: {count} — {details}
- Duplicates: {count} — {details}
```

This file is internal to the pipeline. Do not show to the user yet.

---

## Phase 2: GATHER — Parallel Session Analysis

**Goal**: Extract signals from every session in the time range using parallel subagents.

### 2a — Determine time range

Default: last 7 days.

```bash
EPOCH_MS=$(echo "$(($(date -v-7d +%s) * 1000))")
```

If user specified a custom range (e.g., "last 14 days", "from June 1 to June 10"), compute the epoch milliseconds accordingly. For a date range:

```bash
# "from YYYY-MM-DD to YYYY-MM-DD"
FROM_EPOCH=$(echo "$(($(date -j -f "%Y-%m-%d" "2026-06-01" +%s) * 1000))")
TO_EPOCH=$(echo "$(($(date -j -f "%Y-%m-%d" "2026-06-10" +%s) * 1000))")
```

### 2b — Query sessions from opencode DB

```bash
opencode db "
SELECT id, title, time_created, time_updated, agent,
       json_extract(model, '$.id') as model_id,
       cost, tokens_input, tokens_output
FROM session
WHERE parent_id IS NULL
  AND time_created >= $EPOCH_MS
ORDER BY time_created DESC;
"
```

Filter out noise:
- Skip sessions with `cost = 0` AND `tokens_input = 0` (greetings, empty sessions)
- Skip sessions with no meaningful title ("New session - ...", "Greeting")
- Keep everything else

### 2c — Spawn parallel analysis subagents

For each meaningful session, spawn a **general subagent** using the `task` tool. Launch all subagents **in a single message** so they run in parallel.

Worker prompt template (fill in session details for each):

```
Analyze this OpenCode session and extract structured findings.

Session ID: {id}
Title: {title}
Created: {time_created}
Agent: {agent}
Model: {model_id}

## Steps

1. Query messages:
   opencode db "SELECT data FROM message WHERE session_id = '{id}' ORDER BY time_created;"

2. Parse each message's `data` JSON column. The `data` column contains JSON with fields like `role`, `content`, `tool_calls`. Focus on:
   - `role: "user"` messages — these contain instructions, corrections, preferences
   - `role: "assistant"` messages — these contain reasoning, decisions, summaries

3. Extract the following signal types:

   | Type | What to look for | Priority |
   |------|------------------|----------|
   | CORRECTION | User saying "actually", "no", "wrong", "incorrect", "stop", "don't", "that's not", "I meant", "correction" | High |
   | PREFERENCE | "I prefer", "always use", "never use", "from now on", "I like", "I don't like", "going forward" | High |
   | DECISION | "let's go with", "we decided", "switch to", "we're using", "the plan is", "I decided", "chosen" | Medium |
   | FAILURE_MODE | Wrong approach tried, dead end, bug encountered, time wasted on wrong path | Medium |
   | PATTERN | Recurring task type, repeated workflow, common operation pattern | Low |
   | FACT | Project-specific knowledge, architecture detail, API behavior, tool quirk | Medium |

4. For each finding, record:
   - `type`: one of the signal types above
   - `description`: concise factual statement (one sentence)
   - `evidence`: short direct quote from the conversation (max 200 chars)
   - `confidence`: high/medium/low based on how explicit the signal was

5. Output as a JSON object:

```json
{
  "session_id": "{id}",
  "title": "{title}",
  "time_created": {time_created},
  "findings": [
    {
      "type": "CORRECTION|PREFERENCE|DECISION|FAILURE_MODE|PATTERN|FACT",
      "description": "concise factual statement",
      "evidence": "direct quote",
      "confidence": "high|medium|low"
    }
  ]
}
```

If no meaningful signals found, return `{"session_id": "{id}", "findings": []}`.
```

### 2d — Wait and collect

Wait for ALL subagents to complete. Collect all their outputs. If a subagent fails or times out, note the session ID and continue with the rest — do not abort the pipeline.

---

## Phase 3: CONSOLIDATE — Merge Findings

**Goal**: Merge all parallel worker outputs into a single structured file.

### Steps

1. Collect all subagent outputs into `/tmp/dream-findings.json`
2. Merge across sessions:
   - **Deduplicate**: If same finding appears in multiple sessions, keep one entry and list all source sessions
   - **Categorize**: Group by signal type
   - **Sort within category**: By confidence (high first), then by recency
3. Write the consolidated file:

```markdown
# Dream Findings — {date_range}

Generated: {timestamp}
Sessions analyzed: {count}

## Corrections

| # | Finding | Sessions | Confidence |
|---|---------|----------|------------|
| 1 | {description} | {session_titles} | high |

## Preferences

...

## Decisions

...

## Failure Modes

...

## Patterns

...

## Facts

...
```

This file is internal to the pipeline. Do not show to the user yet.

---

## Phase 4: ANALYZE — Cross-Reference Against Memory

**Goal**: Compare consolidated findings against current memory to identify gaps, contradictions, and stale entries.

### Steps

1. Re-read current memory files: `MEMORY.md`, `USER.md`, `IDENTITY.md`
2. For each finding in `/tmp/dream-findings.json`, classify:

   | Classification | Condition | Action |
   |---------------|-----------|--------|
   | **NEW** | Finding does not exist anywhere in memory | Propose adding |
   | **MATCH** | Finding already accurately represented | No action |
   | **UPDATE** | Finding refines/extends existing entry | Propose updating |
   | **CONFLICT** | Finding contradicts existing memory entry | Propose resolving (evidence-based) |

3. Scan current memory for **stale** entries:
   - Not referenced in any finding or daily log from the time range
   - Refer to projects/tools no longer in use
   - Superseded by newer entries

4. Write analysis to `/tmp/dream-analysis.md`:

```markdown
# Dream Analysis

## New ({count})
- {description} — source: session {title}

## Updates ({count})
- {existing} → {proposed} — reason: {finding}

## Conflicts ({count})
- Memory: "{existing}" ↔ Session: "{finding}"
  Proposed resolution: {resolution}

## Stale ({count})
- {entry} — reason: not referenced in {time_range}

## Matches ({count})
- {description} — already in memory, no action
```
---

## Phase 5: PROPOSE — Present Changes to User

**Goal**: Show the change list and get explicit approval before modifying anything.

Present to the user in this structure:

```
📋 Dream Changes for {date_range}

## ADD ({count})
- {description} (confidence: {level}, source: {session})
- ...

## UPDATE ({count})
- {existing} → {proposed} (reason: {finding})
- ...

## CONFLICT ({count})
- Memory says "{existing}" but recent session shows "{finding}"
  → Proposed: {resolution}
- ...

## ARCHIVE ({count})
- {stale entry} (reason: not referenced in {time_range})
- ...

## MEMORY HEALTH
- Daily logs: {present} present, {missing} missing, {incomplete} incomplete
- Coherence issues: {count} (contradictions, relative dates, duplicates)
```

**Ask the user**: "Review the changes above. Reply with 'apply' to proceed, or tell me which changes to skip/modify."

Wait for explicit approval. Do NOT proceed to Phase 6 without it.

If user asks to modify specific changes, update the plan accordingly and re-confirm before applying.

---

## Phase 6: APPLY — Write Approved Changes

**Goal**: Modify memory files according to approved changes.

### Before writing — Backup

```bash
cp -r ~/.config/opencode/memory ~/.config/opencode/memory.bak.$(date +%Y%m%d)
```

### Writing rules

1. **Use the Edit tool** — make targeted edits, never rewrite entire files
2. **Match existing format** — preserve the style and conventions of each file
3. **Add ISO dates** — new entries get a leading date: `(YYYY-MM-DD)`
4. **Source attribution** — note origin: `(from: session "{title}")`
5. **One edit per change** — make separate Edit tool calls for independent changes

### Per-file rules

**MEMORY.md** (`~/.config/opencode/memory/MEMORY.md`):
- New rules/lessons → add to the appropriate section, maintaining chronological order
- Updates → modify existing entry in place, preserving its timestamp and adding a "(updated YYYY-MM-DD)" note
- Conflicts → newer evidence wins. Replace old entry with new, add a note: `(replaces earlier entry, updated YYYY-MM-DD)`
- Stale entries → comment out with `<!-- archived YYYY-MM-DD: reason -->` rather than deleting

**USER.md** (`~/.config/opencode/memory/USER.md`):
- Preferences → update relevant section
- Tech stack → add/remove tools, languages
- Communication style → refine based on patterns observed

**IDENTITY.md** (`~/.config/opencode/memory/IDENTITY.md`):
- Behavioral rules → update based on user corrections
- Personality notes → refine from observed patterns

**Daily logs** (`~/.config/opencode/memory/daily/YYYY-MM-DD.md`):
- Only create if missing AND user explicitly approved
- Follow the existing daily log format from adjacent files

**Project logs** (`~/.config/opencode/memory/project/{name}.md`):
- Update based on new project knowledge from sessions

### Verify after writing

After applying, read each modified file to confirm changes were applied correctly. Summarize the final state:

```
Dream complete. Changes applied:
- Added {count} entries to MEMORY.md
- Updated {count} entries in USER.md
- Archived {count} stale entries
- Created {count} daily logs
Backup saved to: ~/.config/opencode/memory.bak.{date}
```

---

## Safety

- **Read-only until Phase 6**: Phases 1-5 never modify files. Only Phase 6 writes.
- **Backup before write**: Always backup the memory directory before Phase 6
- **Explicit approval required**: Never write without Phase 5 user approval
- **Minimal edits**: Prefer targeted Edit tool calls over full file rewrites
- **Validate after write**: Always re-read modified files to confirm correctness

## Error Handling

| Scenario | Handling |
|----------|----------|
| `opencode db` fails | Try `/opt/homebrew/bin/opencode db` — the CLI might not be in PATH |
| No sessions found in time range | Report and stop — nothing to consolidate |
| All sessions are noise (cost=0) | Report and stop — no meaningful signals to extract |
| Subagent fails/times out | Note the failed session ID, continue with remaining sessions |
| Memory files don't exist at expected paths | Ask the user for the correct path |
| User rejects all changes | Report: "No changes applied. Backup not needed." |

## Output Cleanup

After completion (whether applied or rejected), clean up temp files:
```bash
rm -f /tmp/dream-audit.md /tmp/dream-findings.json /tmp/dream-analysis.md
```
