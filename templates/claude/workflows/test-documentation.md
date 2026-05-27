# Test Documentation

Use this workflow when creating or editing manual test cases, test suites,
`test-cases.md`, bug reports, `bugs.md`, `TC-01`, or `BUG-01` files.

## Rules Source

Use the Claude-local QA rules first:

- `.claude/rules/qa-ai-rules/test-case-rules.md`
- `.claude/rules/qa-ai-rules/test-suite-template.md`
- `.claude/rules/qa-ai-rules/bug-report-template.md`

If those files are absent, fall back to the generated Cursor rules from the
`@metricinsights/qa-ai-rules` npm package:

- `.cursor/rules/qa-ai-rules--test-case-rules.mdc`
- `.cursor/rules/qa-ai-rules--test-suite-template.mdc`
- `.cursor/rules/qa-ai-rules--bug-report-rules.mdc`

Keep the same TC and bug naming structure across both rule sources.

## Folder Structure

```text
test-documentation/
  <CONTEXT_KEY>/
    test-cases.md
    bugs.md
    screenshots/
```

`CONTEXT_KEY` is the Linear issue key, for example `PP-3388`, or a descriptive
slug when no Linear issue exists.

## QA User Roles

Use abstract role names in test documentation:

- `Regular`
- `Power`
- `Admin`

Write steps like `Login as Regular` or `Login as Admin`. If a reusable template
contains legacy placeholders such as `QA_PP_Regular`, normalize them to the
abstract role names below. Actual usernames and passwords are resolved from
`.env`:

| Role | Username variable | Password variable |
| --- | --- | --- |
| Regular | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| Power | `QA_USER_POWER` | `QA_PASS_POWER` |
| Admin | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

Never hardcode real usernames or passwords in test docs.

## Test Case Rules

- Number cases sequentially as `TC-01`, `TC-02`, and so on.
- Keep expected results aligned with the acceptance criteria and latest Linear
  comments.
- Do not turn implementation details into hard pass/fail criteria unless the
  acceptance criteria require them.
- Group multi-role scenarios by role to reduce logout and login churn.
- Always verify the final TC count before browser execution. Pass the exact
  list of cases, `TC-01..TC-N`, to the browser execution step.

## Bug Documentation

When QA execution finds a defect, write it to:

`test-documentation/<CONTEXT_KEY>/bugs.md`

Use sequential IDs: `BUG-01`, `BUG-02`, and so on.

Each bug should include:

- Severity: `Critical`, `Major`, `Minor`, or `Low`.
- Related TC IDs.
- Environment URL.
- User role.
- Reproduction steps.
- Expected result.
- Actual result.
- Console errors when present.
- Root cause when investigated.
- Screenshot path from `screenshots/` when available.

## Severity Guide

| Severity | Criteria |
| --- | --- |
| Critical | App crash, data loss, feature blocked, or security issue |
| Major | Partially broken behavior with no reasonable workaround |
| Minor | Cosmetic issue or workaround exists |
| Low | Enhancement, polish, or edge case |
