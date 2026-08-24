---
name: ledger
description: >
  Harvests intentional shortcuts (marked with `ponytail:` comments) into a
  structured tech debt ledger so "later" doesn't become "never". Scans the
  repo for ponytail markers and produces a ranked report. Activate by saying
  "run the ledger", "track shortcuts", "show ponytail debt", "debt report",
  "what shortcuts did we take".
license: MIT
compatibility: opencode
---

# Ledger

Every `ponytail:` comment in the codebase is a deliberate shortcut with a named ceiling and upgrade path. This skill harvests them into a structured debt report so you can decide what to fix and when.

## Process

### 1. Scan

Search the entire codebase for `ponytail:` comments:

```bash
# Grep for ponytail: comments across all tracked files
rg --no-heading 'ponytail:' --type-add 'all:*' -g '!.git'
```

Filter out:
- False positives (the string appearing outside a comment context)
- The definition of the convention itself (e.g., this skill file or the agent definition)

### 2. Parse

For each finding, extract:

| Field | Source |
|-------|--------|
| **Location** | File:line |
| **Shortcut** | One-line summary of what was simplified |
| **Ceiling** | The known limit named in the comment (e.g., "global lock", "O(n²) scan", "no pagination") |
| **Upgrade** | The named upgrade path (e.g., "per-account locks if throughput matters") |

### 3. Rank

Order by risk:

1. **Hot** - shortcuts touching security, data integrity, money, or production reliability
2. **Warm** - performance ceilings, missing pagination, missing validation, TODO-grade items
3. **Cool** - style, naming, convenience shortcuts, known-but-acceptable limits

### 4. Report

```
# Debt Ledger - {date}

## Hot ({count})
- `{file}:L{line}` - {shortcut}. Ceiling: {ceiling}. Upgrade: {upgrade}.

## Warm ({count})
- ...

## Cool ({count})
- ...

## Summary
{total} shortcuts across {files} files. {hot} hot, {warm} warm, {cool} cool.
```

### 5. Action

End with a recommendation: which 1-3 items to tackle next and why.

## Boundaries

Read-only. Does not modify any files. If no `ponytail:` comments exist, report: `Clean ledger - no shortcuts deferred.`
