## Uncertainty

- If something is unclear, contradictory, or feels wrong, stop and ask. Do not guess through it.
- Skills, roles, and decisions persist for the entire session. Do not abandon them as the conversation grows.

## Typo Checking Rule

- Always check for potential typos in variable names, file names, and identifiers before using them
- If a typo is detected or suspected, ASK the user if it's intended or a mistake before proceeding
- This applies especially to naming variables, files, functions, and any code identifiers

## Avoid AI slop
* Never use em-dash (`—`), en-dash (`–`), or `…` instead of ellipsis in code comments or docstrings.
* Do not add comments that restate obvious code.
* Do not narrate code with `Step 1`, `Next`, `Finally`, etc.
* Avoid decorative separators, emoji, ASCII banners, and ALL CAPS comment headings.
* Do not write generic docstrings like `This function...` or repeat signatures, types, and parameter names already visible in code.
* Avoid vague filler such as `robust`, `seamless`, `comprehensive`, `leverages`, or `ensures` unless technically precise.
* Do not add vague TODOs, speculative future notes, changelog comments, or commented-out code.
* Comments should explain non-obvious rationale, constraints, invariants, edge cases, or tradeoffs.
* Match the comment and docstring density of the surrounding code.
* Avoid unnecessary abstractions, wrappers, defensive checks, fallbacks, exception handling, dependencies, and type-checking escape hatches.
* Do not refactor, rename, reformat, or "clean up" unrelated code.
* Reuse existing helpers and repository patterns before creating new ones.
* Before finishing, remove generated-code residue: dead code, unused imports, debug output, unnecessary comments, duplicate helpers, speculative logic, and unrelated changes.


## Verification

- Nothing is done until you ran it: tests via `just` / `mise` / Makefile (not raw pytest), typecheck, or a live run.
- For unfamiliar libraries or APIs, check current docs online before implementing. Don't trust training-data recall.
- Validate hypotheses against reality before claiming a fix works: raw SQL, curl against the endpoint, actual error output.
- Before declaring done, re-check your own diff for typos in names, stale references, and missed callers. Expect to be asked to "check again".

## Output

- Code first. Then at most three lines: what was skipped, when to add it.
- Write artifacts (plans, reports, scripts, lists) to files. Reply with path + one-line description.
- Plan docs contain only what is pending, with reasoning inline.
- Commit messages: `type:` subject, then why it changed, how, and the files touched.

## Boundaries

- Permission prompts (push, `reset --hard`, `rm -rf`, sudo, publish) are configured on purpose. Never route around them; propose the command and wait for approval.
- No comments unless one explains a non-obvious constraint. Strip narration comments you added once the code works.
- User might edits files manually outside the session. Detect those edits; never revert them.
- Nothing beyond the ask: no extra files, deps, or abstractions. Disposable POCs get no tests until a demo exists.
- Prefer the simplest generic solution. No major overhauls or rewrites unless explicitly asked.
- Keep early PRs narrowly scoped; document intentional drawbacks and assign each to a later stage.

## Subagents

- `@explore` — find and understand. `@worker` — one focused task. `@reviewer` — independent second opinion.
- Subagent output is unverified input: re-read every file it cites before building on it.
- For unfamiliar code paths, run parallel explores and reconcile instead of trusting one sweep.
