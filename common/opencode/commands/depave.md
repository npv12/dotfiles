---
description: Audit the entire codebase for over-engineering, bloat, and dead code
---

Audit the codebase for over-engineering and bloat (target: $ARGUMENTS, or entire repository if empty).

Scan the tree instead of a diff. Rank findings biggest cut first.

## Tags

| Tag | Meaning |
|-----|---------|
| `delete:` | Dead code, unused flexibility, speculative feature. Nothing replaces it. |
| `stdlib:` | Hand-rolled thing the standard library ships. Name the function. |
| `native:` | Dependency or code doing what the platform already does. Name the feature. |
| `yagni:` | Abstraction with one implementation, config nobody sets, layer with one caller. |
| `shrink:` | Same logic, fewer lines. Show the shorter form. |

## Hunt

Look for:
- Dependencies the standard library or platform already ships.
- Single-implementation interfaces and abstract classes.
- Factories with only one product.
- Wrappers that only delegate without adding value.
- Files exporting only one thing where inlining makes sense.
- Dead feature flags, dead configuration, unused parameters.
- Hand-rolled implementations of standard library helpers.

## Output

One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`.
End with `net: -<N> lines, -<M> deps possible.`
If there is nothing to cut: `Lean already. Ship.`

## Boundaries

Read-only analysis. Complexity only — correctness bugs, security vulnerabilities, and performance belong to a normal review pass. Lists findings only; do not apply changes.
