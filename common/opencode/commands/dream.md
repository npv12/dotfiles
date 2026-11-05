---
description: Consolidate cross-session learnings from OpenCode history into durable memory
---

Run cross-session memory consolidation for OpenCode (time range: $ARGUMENTS, default: last 7 days).

Pipeline: AUDIT -> GATHER (parallel workers) -> CONSOLIDATE -> ANALYZE -> PROPOSE -> APPLY (on approval).

Target files live under `~/.config/opencode/memory/`. The helper is `~/dotfiles/common/opencode/scripts/memory-sessions.py` (read-only; subcommands `sessions`, `coverage`, `dump`).

## Hard rules

- Never apply without explicit approval in this conversation. If no human is present, stop after PROPOSE.
- Back up before writing: `cp -R ~/.config/opencode/memory ~/.config/opencode/memory.bak.$(date +%Y%m%d-%H%M%S)`.
- Check `git -C ~/.config/opencode/memory status --short` before and after. Another session or the user may be editing memory mid-run; preserve those edits, never revert them.
- Read a file before replacing content, and prefer targeted edits. Aggregate project files are large; do not rewrite them wholesale.
- One project file per repository, named after the session's working directory (memory plugin v2.0.9+). Verify with `memory read --target project` before writing; if it resolves to another repository's file, stop and report the plugin version.
- Use the default models. Do not pin a model for yourself or for workers.
- Do not run the test suite; this workflow has none. Verify with the checks at the end.

## Phase 0: preflight

1. Run the git status check. If the tree is dirty, read the diff and decide whether it is user work to preserve or leftover from a crashed run.
2. Confirm project resolution (`memory read --target project`) and record the plugin version.
3. List file sizes under `memory/`; anything over ~4 KB will fail the plugin's 1,000-token read limit, so those files need `memory search` instead.

## Phase 1: audit

Build a coverage table and a health list before reading any session content.

```
python3 ~/dotfiles/common/opencode/scripts/memory-sessions.py coverage --from YYYY-MM-DD --to YYYY-MM-DD
```

Report:
- Days with sessions but no daily file, and days with a file but no entries.
- Project files older than 30 days; flag dormant ones, do not delete them.
- Orphan or malformed filenames (for example a bare `.md`).
- Duplicate entries, entries with no date, and references to files that no longer exist.
- Project files that duplicate or diverge from each other (same bullets in two files).

## Phase 2: gather

1. Resolve the window in epoch milliseconds. Default is the last 7 days; `$ARGUMENTS` may give a range.
2. List candidates:

```
python3 ~/dotfiles/common/opencode/scripts/memory-sessions.py sessions --from YYYY-MM-DD --to YYYY-MM-DD
```

3. Batch root sessions by date and spawn 4-6 workers in parallel, one date batch each. Every worker gets the helper path, its session ids, and this contract:

```
python3 ~/dotfiles/common/opencode/scripts/memory-sessions.py dump <session-id> --user-chars 300 --assistant-chars 200
```

Extract only durable signals, one JSON array with `type`, `description`, `evidence` (<120 chars, verbatim), `session`, `date`, `confidence`, `recurrence`:

- CORRECTION: the user changes the agent's approach.
- PREFERENCE: an explicit or clearly repeated way of working.
- DECISION: a technical or product choice that outlives the task.
- FAILURE_MODE: a dead end or repeated mistake worth never repeating.
- PATTERN: a recurring workflow or sequence.
- FACT: durable project, API, or architecture knowledge.

Workers exclude anything already present in `MEMORY.md`, `USER.md` and the project files, and exclude task trivia (ticket lookups, one-off log reads, status updates). Zero findings from a batch is a valid result. Findings are unverified input: spot-check every evidence quote against the session before proposing it.

## Phase 3: consolidate

Merge findings across workers. Normalize descriptions and deduplicate identical items, including items that differ only by wording. Group by target file and sort by confidence, then recency. When two findings conflict, keep the more recent one unless it is a one-off, and record the older as evidence.

## Phase 4: analyze

Classify each item against current memory:

- NEW: not present, propose adding.
- MATCH: already accurate, no action.
- UPDATE: refines an existing entry, propose replacing it.
- CONFLICT: contradicts an existing entry, propose resolving with evidence.
- ARCHIVE: stale or superseded, propose removing or merging.
- SPLIT: a project bullet whose content belongs to another repository's file.

## Phase 5: propose

Present, with exact entry text and target file for every item:

```
## ADD (n)
## UPDATE (n)
## CONFLICT (n)
## ARCHIVE (n)
## MEMORY HEALTH
```

MEMORY HEALTH covers daily coverage, orphan files, files over the read limit, undated entries, diverged project files, and anything left as-is. Then ask:

> Review the changes above. Reply with 'apply' to proceed, or tell me which changes to skip/modify.

Wait for approval. Do not start Phase 6 without it.

## Phase 6: apply

Only after approval:

1. Back up.
2. Apply targeted edits per target file. Rewrite contradictory entries instead of appending a second version.
3. Backfill daily logs: create a missing day file when that day has sessions, one timestamped entry per session using the real start time.
4. Delete retired files and merged orphans.
5. Trigger `memory reindex` after any deletion.
6. Re-read every modified file.
7. Commit with a `chore:`/`fix:` subject that says why the change was made, how, and which files moved.
8. Summarize what changed, what was left as-is, and the backup path.

## Verification

- `grep -rn '<retired-file>' memory/` only matches historical daily logs.
- Coverage has no missing day for the window.
- No duplicate headings and no file over the read limit unless it was already over.
- `git status` is clean after the commit.
- Reindex was requested.
