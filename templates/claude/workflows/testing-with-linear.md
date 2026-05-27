# Testing With Linear

Full orchestrated QA flow for a Linear issue:

fetch context -> read comments -> generate and execute test cases -> investigate
bugs -> publish results.

## Input

| Parameter | Required | Description |
| --- | --- | --- |
| `ISSUE_KEY` | Yes | Linear issue key or full Linear URL |
| Figma link | No | Optional visual reference passed to testing flow |

Parse `ISSUE_KEY` only from the current user message. Do not reuse example keys.

## Step 1: Read Linear Workflow

Read and follow:

`./.claude/workflows/linear-workflow.md`

## Step 2: Fetch Issue Context

```bash
linear-cli i get <ISSUE_KEY>
```

Extract:

- Title.
- Description.
- Acceptance criteria.
- User stories.
- State.
- Team.
- Verification environment if present.

If auth fails:

```bash
linear-cli auth oauth
```

## Step 3: Read Issue Comments

Always read all comments before generating test cases:

```bash
linear-cli api query -o json --compact \
  'query { issue(id: "<ISSUE_KEY>") { comments { nodes { body createdAt user { name } } } } }'
```

Look for:

- Revised acceptance criteria.
- Product decisions.
- Dev implementation notes.
- Review feedback.
- Verification URLs or environment notes.

If comments contradict the issue description, use the latest relevant
dev/product/review comment as the current source of truth.

## Step 4: Generate and Run Tests

Read and follow:

`./.claude/workflows/testing-flow.md`

Use:

- `CONTEXT_KEY = <ISSUE_KEY>`.
- Acceptance criteria from the issue plus latest relevant comments.
- Figma link when provided.

Write results under:

```text
test-documentation/<ISSUE_KEY>/
```

Expected files:

```text
test-documentation/<ISSUE_KEY>/
  test-cases.md
  bugs.md
  screenshots/
```

## Step 5: Publish Results

Read and follow:

`./.claude/workflows/linear-report.md`

Upload screenshots to Linear Cloud before embedding them in a comment. Do not
use local file paths in the Linear comment body.

## Step 6: Optional Status Update

If the user asks to update status, list exact team states first:

```bash
linear-cli statuses list --team "<Team name from issue>"
```

Then use the exact state name:

```bash
linear-cli i update <ISSUE_KEY> -s "<State name>"
```

## Stop Conditions

Stop and ask the user if:

- The issue key cannot be resolved.
- Linear auth fails after `linear-cli auth oauth`.
- No verification environment is available and local dev cannot be started.
- Acceptance criteria are contradictory and comments do not clarify the scope.
