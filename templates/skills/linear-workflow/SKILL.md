---
name: linear-workflow
description: Works with Linear through the Linear MCP tools for Metric Insights Portal Page tasks—fetch an issue and its comments, list issues, check team states, start work, update the state, comment. Use when the user references a Linear issue, task link, ISSUE_KEY, or says start working with task.
---

# Linear workflow (Portal Page / Custom App)

Linear is reached through the **Linear MCP** tools. Tool names are written here without a server prefix
(`get_issue`); your client may show them with one. There is no CLI for Linear in this setup.

## When a Linear tool is missing or fails

**Stop.** Tell the user that Linear MCP is not available in this session and ask them to connect or reconnect
Linear in the client. **Never guess** the state or the content of an issue, and do not continue work that
depends on it.

## Local app

- URL: **`http://localhost:<port>`** — default **3000**, then **3001**, **3002**, … if busy.
- Confirm **`pp-dev.config.ts`** (or `pp-dev.config`) and **`npm run dev`** / **`pp-dev`** terminal output for the real port.

## Issue identity

- Parse **`<ISSUE_KEY>`** only from the **current** user message (URL segment after `/issue/`, or pasted key). Do not substitute example keys from docs.
- **`get_issue`** with `id: <ISSUE_KEY>` — title, description, state (the `status` field), team, assignee. Example key: `PP-3388`.
- My issues: **`list_issues`** with `assignee: "me"`; add `team` or `state` to narrow the list.

## Comments

`get_issue` does not return the discussion. Always read it before generating test cases, deciding the scope or posting results: **`list_comments`** with `issueId: <ISSUE_KEY>`.

Comments may contain revised acceptance criteria, product decisions, dev notes, review feedback, or verification URLs. If they conflict with the original description, the latest relevant dev / product / review comment takes precedence.

## Team workflow states

State names differ by team. List them with **`list_issue_statuses`** (`team`: the team from the issue) and use the exact name.

## Start work

**`save_issue`** with `id: <ISSUE_KEY>`, `state` set to the state the team uses for work in progress (for the Portal Pages team: **In Development**) and `assignee: "me"`.

## Update and comment

- State: **`save_issue`** with `id` and the exact `state` name, for example `"To Test"`.
- Comment: **`save_comment`** with `issueId` and a markdown `body` — a short summary of what changed and how to verify it. Send real newlines, not `\n` escapes.
- A screenshot or file inside a comment has to be uploaded first — see the **`linear-report`** skill.

## Conventions

- Keep Linear updates concise; include **`<ISSUE_KEY>`** in summaries.
- Ask before posting a comment or changing a state, unless the user asked for exactly that.
- **QA login** for the local app: follow the **`portal-env-credentials`** skill. Reference roles as **Regular**, **Power**, **Admin** in documentation — never hardcode usernames.
