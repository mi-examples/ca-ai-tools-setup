# UI Check

Run a UI verification flow for:

```text
$ARGUMENTS
```

1. If the arguments contain a Linear issue key or URL, read and follow
   `./.claude/skills/testing-with-linear/SKILL.md` (full QA) — unless the user explicitly asks for a quick
   check.
2. Otherwise, or for a quick check, read and follow `./.claude/skills/ui-check-simple/SKILL.md`.
3. Report concrete pass/fail findings, screenshot paths, discrepancies, and console errors.
