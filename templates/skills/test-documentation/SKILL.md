---
name: test-documentation
description: Writes Portal Page manual test cases and bug reports in Markdown—TC numbering, BUG numbering, priorities, severity, QA roles. Use when creating or editing test-documentation, test cases, test suite, bug reports, bugs.md, TC-01, BUG-01, or relevant test-cases.md files.
---

# Test documentation (manual cases and bugs)

## Rules source

Test case, page suite, and bug report rules are managed by the **`@metricinsights/qa-ai-rules`** npm package and auto-installed to:

- `.cursor/rules/qa-ai-rules--test-case-rules.mdc` — content, structure, formatting rules
- `.cursor/rules/qa-ai-rules--test-suite-template.mdc` — starter `{{page}}` template
- `.cursor/rules/qa-ai-rules--bug-report-rules.mdc` — `BUG-01..BUG-N`, severity, reproduction, expected/actual, evidence

These files are gitignored and regenerated on `npm install`. **Follow them as the primary reference** for TC and bug report format. If a generated rule file is absent in the current checkout, use the matching local pointer under `.cursor/rules/` and keep the same naming/structure.

## QA user roles

Three standard roles used in test cases: **Regular**, **Power**, **Admin**.

In test case steps, write `Login as Regular`, `Login as Admin`, etc. Actual usernames and passwords are resolved from `.env` vars (`QA_USER_REGULAR` / `QA_PASS_REGULAR`, `QA_USER_POWER` / `QA_PASS_POWER`, `QA_USER_ADMIN` / `QA_PASS_ADMIN`). Never hardcode usernames in test documentation.

## Bug documentation

When QA execution finds a defect, write it to `test-documentation/<CONTEXT_KEY>/bugs.md` using the bug report rule. Number bugs sequentially as `BUG-01`, `BUG-02`, etc., link each bug to related TCs, use abstract role names (`Regular`, `Power`, `Admin`), and attach evidence paths from `screenshots/` when available.
