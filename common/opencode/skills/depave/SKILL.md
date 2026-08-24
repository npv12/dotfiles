---
name: depave
description: >
  Audits the entire codebase for over-engineering. Like slim but scans the
  whole repo instead of a diff: a ranked list of what to delete, simplify,
  or replace with stdlib/native equivalents. Activate by saying "depave this
  repo", "audit for over-engineering", "find bloat", "what can I delete",
  "audit this codebase".
license: MIT
compatibility: opencode
---

# Depave

Slim, but repo-wide. Scan the whole tree instead of a diff. Rank findings biggest cut first.

## Tags

Same as slim:

| Tag | Meaning |
|-----|---------|
| `delete:` | Dead code, unused flexibility, speculative feature. Nothing replaces it. |
| `stdlib:` | Hand-rolled thing the standard library ships. Name the function. |
| `native:` | Dependency or code doing what the platform already does. Name the feature. |
| `yagni:` | Abstraction with one implementation, config nobody sets, layer with one caller. |
| `shrink:` | Same logic, fewer lines. Show the shorter form. |

## Hunt

Deps the stdlib or platform already ships, single-implementation interfaces, factories with one product, wrappers that only delegate, files exporting one thing, dead flags and config, hand-rolled stdlib.

## Output

One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`. End with `net: -<N> lines, -<M> deps possible.` Nothing to cut: `Lean already. Ship.`

## Boundaries

Complexity only - correctness bugs, security holes, and performance go to a normal review pass. Lists findings, applies nothing. One-shot.
