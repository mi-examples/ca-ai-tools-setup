# Test Documentation

Create or update QA test documentation.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Treat `$ARGUMENTS` as the context: Linear issue, feature, route, page,
   component, bug, screenshot, or acceptance criteria.
2. Read `./.claude/workflows/test-documentation.md`.
3. If a Linear issue is present, fetch the issue and all comments before
   writing cases.
4. Create or update `test-documentation/<CONTEXT_KEY>/test-cases.md`.
5. If documenting defects, create or update
   `test-documentation/<CONTEXT_KEY>/bugs.md`.
6. Use abstract roles only: `Regular`, `Power`, `Admin`.
