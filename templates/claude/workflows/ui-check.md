# UI Check With Linear

Use this workflow when verifying or fixing Portal Page UI against a Linear
issue.

## Task Context

The issue is only the one from the current user message:

```text
start working with task <Task link>
```

`Task link` can be a full Linear URL or a bare issue key. Parse the issue key
from the current message only.

## Dependencies

Read and follow:

- `./.claude/workflows/linear-workflow.md`
- `./.claude/workflows/test-documentation.md`
- `./.claude/workflows/playwright-mcp.md`
- `./.claude/workflows/linear-report.md` when posting results

## Stack

- Start dev server with `npm run dev`.
- Proxy config comes from `pp-dev.config.ts` or `pp-dev.config`.
- Acceptance checklist comes from `linear-cli i get <ISSUE_KEY>` and latest
  issue comments.

## Flow

1. Fetch issue context:

```bash
linear-cli i get <ISSUE_KEY>
```

2. Read all comments:

```bash
linear-cli api query -o json --compact \
  'query { issue(id: "<ISSUE_KEY>") { comments { nodes { body createdAt user { name } } } } }'
```

3. Generate test cases using `./.claude/workflows/test-documentation.md`.
4. Save them to `test-documentation/<ISSUE_KEY>/test-cases.md`.
5. Execute via Playwright MCP.
6. Record screenshots under `test-documentation/<ISSUE_KEY>/screenshots/`.
7. If a bug is found, document it in
   `test-documentation/<ISSUE_KEY>/bugs.md`.
8. Unless the user opts out, publish results via
   `./.claude/workflows/linear-report.md`.

## Screenshots in Linear

Screenshots for UI proof belong in the Linear comment body, not primarily in
the issue attachment list.

Upload screenshots through the Linear `fileUpload` GraphQL mutation, then embed
the returned `assetUrl` as a markdown link or image in the comment.

Do not rely on local screenshot paths in Linear comments.
