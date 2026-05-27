# Testing With Linear

Run the full QA workflow for a Linear issue.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Parse the Linear issue key or URL from `$ARGUMENTS`.
2. Read `./.claude/workflows/testing-with-linear.md`.
3. Use only the issue key from `$ARGUMENTS`; do not use example keys from docs.
4. Fetch the issue with `linear-cli i get <ISSUE_KEY>`.
5. Fetch all comments before generating test cases.
6. Generate and execute tests using `./.claude/workflows/testing-flow.md`.
7. Save output under `test-documentation/<ISSUE_KEY>/`.
8. Publish results with `./.claude/workflows/linear-report.md` unless the user
   explicitly asks for local-only results.
