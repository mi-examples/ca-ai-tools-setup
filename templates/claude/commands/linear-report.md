# Linear Report

Publish QA results to a Linear issue.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Parse the Linear issue key or URL from `$ARGUMENTS`.
2. Read `./.claude/workflows/linear-report.md`.
3. Verify `test-documentation/<ISSUE_KEY>/test-cases.md` exists and contains
   execution results.
4. If screenshots exist, upload them to Linear Cloud before posting.
5. Compose a markdown QA report with `PASS`, `FAIL`, `BLOCKED`, or
   `NOT TESTED` statuses.
6. Post it with `linear-cli i comment <ISSUE_KEY> --body -`.
7. Do not use local screenshot paths in the Linear comment body.
