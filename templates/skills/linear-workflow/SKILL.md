---
name: linear-workflow
description: Uses linear-cli for Metric Insights Portal Page tasks—fetch issues, list, start work, update status, comment. Use when the user references a Linear issue, task link, ISSUE_KEY, or says start working with task.
---

# Linear CLI workflow (Portal Page / Custom App)

## Local app

- URL: **`http://localhost:<port>`** — default **3000**, then **3001**, **3002**, … if busy.
- Confirm **`pp-dev.config.ts`** (or `pp-dev.config`) and **`npm run dev`** / **`pp-dev`** terminal output for the real port.

## Auth

If API calls fail:

```bash
linear-cli auth oauth
```

## Issue identity

- **`linear-cli i get <ISSUE_KEY>`** — full issue (description, state, team). Example: `PP-3388`.
- **Note:** the CLI uses **`issues get`**, not `view` (`linear-cli i get` is the short form).

List mine:

```bash
linear-cli i list --assignee me --limit 20
```

## Team workflow states

State names differ by team. List them:

```bash
linear-cli statuses list --team "<Team name from issue>"
```

Use the exact **`-s` state name** from that list with `linear-cli i update`.

## Start work

```bash
linear-cli i start <ISSUE_KEY>
```

Maps the issue to that team’s “started” state (e.g. **In Progress** or **To Deploy**—depends on Linear team config).

## Update and comment

```bash
linear-cli i update <ISSUE_KEY> -s "To Test"
linear-cli i comment <ISSUE_KEY> --body "Short markdown summary of what changed / how to verify."
```

Use **`--body`** (or **`-b`**) for comment text.

## Conventions

- Parse **`<ISSUE_KEY>`** only from the **current** user message (URL segment after `/issue/`, or pasted key). Do not substitute example keys from docs.
- Keep Linear updates concise; include **`<ISSUE_KEY>`** in summaries.
- **QA login** for local app: use role-based credentials from `.env` (`QA_USER_REGULAR` / `QA_PASS_REGULAR`, `QA_USER_POWER` / `QA_PASS_POWER`, `QA_USER_ADMIN` / `QA_PASS_ADMIN`). Reference roles as **Regular**, **Power**, **Admin** in documentation — never hardcode usernames.
