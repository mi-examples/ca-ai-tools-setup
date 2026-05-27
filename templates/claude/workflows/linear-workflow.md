# Linear Workflow

Use this workflow for Metric Insights Portal Page / custom app tasks that
reference Linear.

## Local App

- URL: `http://localhost:<port>`.
- Confirm the real port from `pp-dev.config.ts`, `pp-dev.config`, or the
  `npm run dev` / `pp-dev` terminal output.

## Auth

If Linear API calls fail, authenticate:

```bash
linear-cli auth oauth
```

## Issue Identity

Parse `ISSUE_KEY` only from the current user message:

- Full Linear URL: use the segment after `/issue/`.
- Bare issue key: use the pasted key, for example `PP-3388`.

Do not use example keys from docs.

Fetch the issue:

```bash
linear-cli i get <ISSUE_KEY>
```

The CLI uses `issues get`; `linear-cli i get` is the short form.

List assigned issues when the user asks for their tasks:

```bash
linear-cli i list --assignee me --limit 20
```

## Comments

Always read comments before generating test cases or posting QA results:

```bash
linear-cli api query -o json --compact \
  'query { issue(id: "<ISSUE_KEY>") { comments { nodes { body createdAt user { name } } } } }'
```

Comments may contain revised acceptance criteria, product decisions, dev notes,
review feedback, or verification URLs. If comments conflict with the original
description, the latest relevant dev/product/review comment takes precedence.

## Team Workflow States

State names differ by team. List them before updating:

```bash
linear-cli statuses list --team "<Team name from issue>"
```

Use the exact `-s` state name from that list:

```bash
linear-cli i update <ISSUE_KEY> -s "To Test"
```

## Start Work

```bash
linear-cli i start <ISSUE_KEY>
```

This maps the issue to that team's started state.

## Comment

```bash
linear-cli i comment <ISSUE_KEY> --body "Short markdown summary."
```

Use `--body` or `-b` for comment text.

## QA Credentials

Use role-based credentials from `.env`. Never hardcode usernames or passwords.

| Role | Username variable | Password variable |
| --- | --- | --- |
| Regular | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| Power | `QA_USER_POWER` | `QA_PASS_POWER` |
| Admin | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |
