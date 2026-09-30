---
description: "Harvest intentional shortcuts (ponytail: comments) into a structured tech debt report"
---

Scan the codebase for intentional shortcuts marked with `ponytail:` comments (path: $ARGUMENTS, or entire repository if empty).

Every `ponytail:` comment is a deliberate shortcut with a named ceiling and upgrade path. Harvest them into a structured debt report.

## Process

### 1. Scan

Search the codebase for `ponytail:` comments:
`rg --no-heading 'ponytail:' --type-add 'all:*' -g '!.git'`

Filter out false positives (e.g. definitions in docs, commands, or agents).

### 2. Parse

For each finding, extract:
- **Location**: `File:line`
- **Shortcut**: One-line summary of what was simplified
- **Ceiling**: Known limit named in comment (e.g., "global lock", "O(n^2) scan", "no pagination")
- **Upgrade**: Named upgrade path (e.g., "per-account locks if throughput matters")

### 3. Rank

Order by risk:
1. **Hot**: shortcuts touching security, data integrity, billing, or production reliability
2. **Warm**: performance ceilings, missing pagination, missing validation, TODO-grade items
3. **Cool**: style, naming, convenience shortcuts, known acceptable limits

### 4. Report

Format:
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

### 5. Recommendation

Recommend 1-3 high-leverage items to tackle next and why.

## Boundaries

Read-only. Do not modify files. If no `ponytail:` comments exist, report: `Clean ledger - no shortcuts deferred.`
