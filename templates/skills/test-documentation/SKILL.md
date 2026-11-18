---
name: test-documentation
description: Writes Portal Page manual test cases and bug reports in Markdown—TC numbering, BUG numbering, priorities, severity, QA roles. Use when creating or editing test-documentation, test cases, test suite, bug reports, bugs.md, TC-01, BUG-01, or relevant test-cases.md files.
---

# Test documentation (manual cases and bugs)

## Rules source

Test case, page suite, and bug report rules are managed by the **`@metricinsights/qa-ai-rules`** npm package. It installs them for the assistant in use:

| Rules | Cursor | Claude Code |
|-------|--------|-------------|
| Test cases — content, structure, formatting | `.cursor/rules/qa-ai-rules--test-case-rules.mdc` | `.claude/rules/qa-ai-rules/test-case-rules.md` |
| Page suite — starter `{{page}}` template | `.cursor/rules/qa-ai-rules--test-suite-template.mdc` | `.claude/rules/qa-ai-rules/test-suite-template.md` |
| Bug reports — `BUG-01..BUG-N`, severity, reproduction, expected/actual, evidence | `.cursor/rules/qa-ai-rules--bug-report-rules.mdc` | `.claude/rules/qa-ai-rules/bug-report-template.md` |

These files are gitignored and regenerated on `npm install`. **Follow them as the primary reference** for TC and bug report format. If a generated rule file is absent, QA AI rules are not installed in this checkout: say so, and keep the `TC-01` / `BUG-01` numbering and the folder layout described here.

## Folder structure

```
test-documentation/
└── <CONTEXT_KEY>/
    ├── test-cases.md
    ├── bugs.md
    └── screenshots/
```

`<CONTEXT_KEY>` is the Linear issue key (e.g. `PP-3388`) or a descriptive slug when no issue exists.

## QA user roles

Three standard roles used in test cases: **Regular**, **Power**, **Admin**.

In test case steps, write `Login as Regular`, `Login as Admin`, etc. If a reusable template contains legacy placeholders such as `QA_PP_Regular`, normalize them to these role names. Actual tokens, usernames and passwords come from `.env` — see the **`portal-env-credentials`** skill. Never hardcode usernames or passwords in test documentation.

## Test cases

- Number cases sequentially as `TC-01`, `TC-02`, and so on.
- Keep expected results aligned with the acceptance criteria and the latest Linear comments.
- Do not turn implementation details into hard pass/fail criteria unless the acceptance criteria require them.
- Group multi-role scenarios by role to reduce logout and login churn.
- Verify the final TC count before browser execution, and pass the exact list `TC-01..TC-N` to the execution step.

## Bug documentation

When QA execution finds a defect, write it to `test-documentation/<CONTEXT_KEY>/bugs.md` using the bug report rule. Number bugs sequentially as `BUG-01`, `BUG-02`, etc., link each bug to related TCs, use abstract role names (`Regular`, `Power`, `Admin`), and attach evidence paths from `screenshots/` when available. The report format and the severity guide are in the **`testing-flow`** skill.
