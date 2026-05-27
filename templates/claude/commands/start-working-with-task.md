# Start Working With Task

Universal Linear task entry point for development, investigation, UI work, QA,
or reporting.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Parse the Linear issue key or URL from `$ARGUMENTS`. Use only the issue from
   the current command arguments.
2. Read `./.claude/workflows/linear-workflow.md`.
3. Fetch the issue with `linear-cli i get <ISSUE_KEY>`.
4. Read all comments before deciding scope.
5. Start the issue with `linear-cli i start <ISSUE_KEY>` if appropriate.
6. Route the work:
   - Development or bug fix: follow `AGENTS.md`, `README.md`, and `CLAUDE.md`.
   - Investigation only: read relevant code and return findings.
   - UI verification: read `./.claude/workflows/ui-check.md`.
   - Full QA: read `./.claude/workflows/testing-with-linear.md`.
   - QA report only: read `./.claude/workflows/linear-report.md`.

Default: if only an issue key or URL is provided, treat it as a development
task unless the issue or comments clearly say it is QA-only.
