---
name: code-review
description: General review checklist distilled from ~330 human and AI review findings on merged PRs. Load when reviewing a diff, plan, or PR, and before reporting your own implementation as done (self-check). Covers the passes that catch most real issues (unneeded code, reimplemented helpers, missed sibling paths), boundaries, data semantics, test quality, PR hygiene, what not to block on, and the preferred fix order (delete, reuse, extend, new). Pair it with the repository's own *-review skill when one exists. Trigger on "review", "code review", "self-review", "check my diff", "before reporting", "before raising a PR".
---

# Code review

Run the passes in order. In past reviews the first three found most of the real issues. The repo's own `*-review` skill, if it has one, names the concrete helpers and conventions, and its rules win when they conflict with these.

When self-checking your own work, run the same passes on your diff and apply the fixes yourself before reporting.

## Passes

1. **Is it needed?** Check every new file, function, tool, endpoint, parameter, prop, state, constant, comment, and test: is it used, and is it needed for this goal now?
   - Findings: speculative generality (multi-tenant branches with one caller, options nobody passes, modes nobody asked for), leftovers from an earlier iteration, debug artifacts (`breakpoint()`, customer or tenant names in logs), and duplicated blocks.
   - The fix is to delete.
2. **Does it already exist?** For each new helper, DAO, component, page, flow, prompt, or schema, search the codebase for something doing the same job. Grep for the behavior, not just the name.
   - A parallel implementation is should-fix. Name the existing one with its path.
   - Prefer subclassing a schema over copying its fields, extending a prompt over adding a second LLM call on the same inputs, and filtering an existing page over building a second view of the same data.
   - If the canonical one lacks something, extend it once instead of forking it.
3. **Siblings.** For each behavior change, list where else the same behavior lives and check each place:
   - other entry points: API, tool, background job, admin;
   - other backends or SQL dialects (NULL semantics differ);
   - legacy and new pipelines;
   - read and write paths;
   - the filter predicate and the value it displays;
   - client and server validation;
   - every consumer of a new enum value, type, or variant;
   - renames carried into tests, URL names, docs, and agent-facing tool descriptions.

   A fix on one path and not its twin is a bug.
4. **Boundaries.** For every new entry point, check tenant or account scope, authorization, the feature gate, and audit. For inputs:
   - SQL is parameterized;
   - LIKE and JSON values are escaped;
   - size limits apply before buffering;
   - new routes don't shadow existing ones;
   - batches are checked for duplicates;
   - rollback deletes only what this request created.
5. **Data semantics.**
   - Fields read actually exist in the schema.
   - The right timestamp is used: immutable event time, not `updated_at`.
   - Omitted, null, and empty stay distinct; `""` must not silently mean "clear".
   - The right enum type is used.
   - Copy or update helpers don't skip validation.
   - A value computed in two places has one source of truth.
   - Parse failures are not swallowed into empty results; log a warning and keep the raw value.
6. **Tests.**
   - Would the test fail if the code were wrong? Seed the case that breaks it.
   - Does it enter through the real seam, or through a mock of it?
   - Is it at the cheapest level that proves the contract?
   - Does an existing test already own this? Extend it before adding a file.
   - Are inputs fixed and expectations literal, rather than a copy of the implementation's formula?
   - Was it updated after signature or flag changes, and is it actually collected by CI (markers, test paths)?
   - Is it free of real customer data?
7. **Hygiene.** Look for:
   - unrelated changes and merge-from-main residue;
   - description claims the diff doesn't support ("verified", "type-check passes", "removed X");
   - intentional behavior changes missing from the description;
   - names that don't match behavior;
   - unexplained magic numbers or math, where simplifying usually beats commenting.

Flag concurrency and performance only with a realistic trigger: duplicate work or data loss under normal use, N+1 queries, unbounded loads on real data sizes, or blocking I/O on hot paths.

## Calibration

Do not block on:

- Rare races whose fix needs a lock held across storage or network I/O, when the author documents the drawback.
- Pre-existing gaps the change only exposes. Note them as follow-ups.
- Systemic refactors inside a hotfix.
- Scope the brief or PR explicitly defers (v1, deprecated paths), and product decisions the author gives a reason for.
- Defensive code for inputs no caller sends.
- Style that a formatter or linter owns.

Do block on: scope or permission leaks, missing gates, data loss or duplicate work under realistic use, injection, a broken sibling path, and tests that cannot fail.

## Fix order

Every finding names the smallest fix, in this order of preference:

1. **Delete.** Most large fixes in past reviews were deletions of an unneeded endpoint, tool, page, algorithm, or state.
2. **Reuse** the existing helper, and give its path.
3. **Extend** the existing helper or test once.
4. **New code**, kept minimal.

Never propose a new abstraction, wrapper, fallback, lock, or test file when deleting, reusing, or extending an existing test would work. If a fix would add more than it removes for a low-impact issue, downgrade it to a nit. Accepted drawbacks go in the PR description under "Decisions and drawbacks".
