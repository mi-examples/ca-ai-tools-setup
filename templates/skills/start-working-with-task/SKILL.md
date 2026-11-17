---
name: start-working-with-task
description: Entry point for any work that starts from a Linear issue—fetch the issue and its comments, check the state gate, then route to development, full QA, a quick UI check or reporting. Use when the user gives a Linear issue key or URL, or says "start working with task".
---

# Start working with a Linear task

Universal entry point for development, investigation, UI work, QA or reporting on a Linear issue.

Use only the issue key or URL from the **current** request. Do not reuse keys from earlier messages or from
examples in the docs.

1. Follow the **`linear-workflow`** skill to fetch the issue (`linear-cli i get <ISSUE_KEY>`).
2. Read **all** comments before deciding the scope. The latest dev / product / review comment overrides older
   text in the issue description when they conflict.
3. Check the issue state against the **`linear-task-gates`** rule and route the work:
   - **`Waiting AI Development`** — development or bug fix: the **`ai-development`** skill.
   - **`Waiting AI Test`** — full QA: the **`testing-with-linear`** skill.
   - Investigation only: read the relevant code and return findings.
   - Quick UI look, no full test suite: the **`ui-check-simple`** skill.
   - QA report only: the **`linear-report`** skill.
4. Start the issue with `linear-cli i start <ISSUE_KEY>` if the team uses "start work" and it is appropriate.

Default: with only an issue key or URL and nothing else, treat it as a development task unless the issue or its
comments clearly say it is QA-only. If the state does not allow the work, stop and report the state.
