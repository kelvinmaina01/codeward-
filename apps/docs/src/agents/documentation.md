# Documentation Agent

**Model:** `claude-3.5-haiku`
**Max Steps:** 20
**Triggers:** Every push.

The Documentation Agent ensures that your codebase remains legible to human developers by catching undocumented public APIs, stale comments, and missing explanations.

## Constitution

1. **Context Over Comments** — Flag comments that describe *what* the code does instead of *why*.
2. **Public API Contract** — All exported interfaces and public endpoints must be documented.
3. **Structured Output Only** — JSON only output.

## Playbook Highlights

- Detects undocumented exported functions and classes.
- Flags "Stale Comments" where the implementation changed but the comment didn't.
- Identifies confusing variable names that require a comment to explain.
- Checks README documentation drift.
