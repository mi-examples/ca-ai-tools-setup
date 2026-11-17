---
name: testing-with-linear
description: Orchestrates full QA workflow with Linear—fetch issue, run testing-flow, publish results via linear-report. Combines testing-flow, ui-check-simple, and linear-report into a single Linear-driven flow. Use when starting work with a Linear task, testing a Linear issue, or running QA on a Linear task.
---

# Testing with Linear (Full Orchestrated Flow)

Orchestrates the complete QA workflow driven by a Linear issue: **fetch context → test → report**.

Depends on: **`linear-workflow`** (Linear MCP tools), **`testing-flow`** (test execution and bug investigation), **`linear-report`** (results publishing).

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ISSUE_KEY` | **Yes** | Linear issue key (e.g. `PP-3388`) or full Linear URL |
| Figma link | No | Figma URL or node ID — passed to **`testing-flow`** for visual accuracy checks via **`figma-implementation`** skill |

Parse `<ISSUE_KEY>` from the **current** user message only (URL segment after `/issue/`, or pasted key). Do not use example keys from docs.

## Workflow

### Step 1 — Fetch issue context

Call the Linear MCP tool **`get_issue`** with the issue key (see the **`linear-workflow`** skill).

Extract from the response:
- **Title** and **Description** — acceptance criteria, user stories
- **State** — current workflow state
- **Team** — for status list lookup

If the Linear tools are missing or return an error, **stop** and ask the user to reconnect Linear. Do not guess the issue content.

#### Step 1b — Read issue comments

Call **`list_comments`** with `issueId: <ISSUE_KEY>` — `get_issue` does not include the discussion.

**Always read all comments before generating test cases.** Comments often contain:
- **Revised acceptance criteria** that override the original description (e.g. product decision changes)
- **Dev implementation notes** — what was actually fixed and how to verify
- **Review feedback** — reviewer may have changed the scope or expected behavior
- **Verification environment** — the correct URL/instance to test on (may differ from the issue description)

If comments contradict the issue description, **comments take precedence** (latest comment wins). Use the most recent dev/review comments to define the actual acceptance criteria for TCs.

### Step 2 — Run testing-flow

Execute the **`testing-flow`** skill with the Linear issue as context source:

- Pass acceptance criteria from Step 1 as the test scope
- `<CONTEXT_KEY>` = `<ISSUE_KEY>` for folder naming
- Generate TCs, execute in the browser with **`playwright-cli`**, investigate bugs per the bug report rule referenced in **`test-documentation`**
- Results land in `test-documentation/<ISSUE_KEY>/`

### Step 3 — Publish results to Linear

Execute the **`linear-report`** skill:

- Upload screenshots to Linear
- Post structured comment with results table
- Optionally update issue status

## Notes

- This skill is purely **orchestration** — all logic lives in the referenced sub-skills.
- If the user only wants **part** of the flow (e.g. just generate test cases, or just publish results), use the individual skill directly instead of this one.
- For UI checks without Linear, use **`ui-check-simple`** skill instead.
