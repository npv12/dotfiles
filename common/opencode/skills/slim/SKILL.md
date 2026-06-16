---
name: slim
description: >
  Reviews a diff or set of changes for unnecessary complexity, bloat, and
  over-engineering. Finds what to delete, where stdlib replaces custom code,
  and which abstractions are premature. One line per finding. Activate by
  saying "slim this diff", "review for over-engineering", "what can we cut",
  "is this over-engineered", or "simplify this".
license: MIT
compatibility: opencode
---

# Slim

Review diffs for unnecessary complexity. One line per finding: location, what to cut, what replaces it. The diff's best outcome is getting shorter.

## Format

`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for multi-file diffs.

Tags:

| Tag | Meaning |
|-----|---------|
| `delete:` | Dead code, unused flexibility, speculative feature. Nothing replaces it. |
| `stdlib:` | Hand-rolled thing the standard library ships. Name the function. |
| `native:` | Dependency or code doing what the platform already does. Name the feature. |
| `yagni:` | Abstraction with one implementation, config nobody sets, layer with one caller. |
| `shrink:` | Same logic, fewer lines. Show the shorter form. |

## Examples

❌ "This EmailValidator class might be more complex than necessary..."
✅ `L12-38: stdlib: 27-line validator class. "@" in email, 1 line, real validation is the confirmation mail.`

✅ `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`

✅ `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.`

✅ `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), 1 line.`

## Scoring

End with the only metric that matters: `net: -<N> lines possible.`

If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

Complexity only — correctness bugs, security holes, and performance go to a normal review pass. A single smoke test or `assert`-based self-check is the minimum, not bloat — never flag it for deletion. Does not apply the fixes, only lists them.
