# Testing Flow

End-to-end QA workflow:

context -> test cases -> Playwright MCP execution -> bug investigation -> local
results.

Use this when running tests, testing a feature, or doing a full QA flow. Linear
is optional.

## Dependencies

Before executing this workflow, read as needed:

- `./.claude/workflows/test-documentation.md`
- `./.claude/workflows/playwright-mcp.md`
- `./.claude/agents/figma-mcp.md` when a Figma link or node is provided
- `./.claude/workflows/linear-workflow.md` when a Linear issue is provided

## Known Lessons

- Sandbox permissions may block `npm run dev`; use the configured local app
  proxy and inspect `pp-dev.config.ts` when needed.
- Always verify the TC count. Count cases in `test-cases.md` and execute the
  exact list `TC-01..TC-N`.
- Test cases must stay within scope. Expected results should match acceptance
  criteria and latest comments, not incidental implementation details.
- Multi-user testing needs explicit session switching. Group TCs by role where
  possible.
- Always read Linear comments before generating TCs when a Linear issue exists.

## Context Sources

Use whichever context is available:

| Source | How |
| --- | --- |
| Linear issue | `linear-cli i get <ISSUE_KEY>` |
| Linear comments | GraphQL `issue.comments`; latest relevant comment wins |
| User-provided context | Description, acceptance criteria, screenshots |
| Figma design | Read Figma node data and compare layout/style details |
| Codebase | Inspect `src/components/`, `src/pages/`, `src/routes/`, `src/api/`, `src/types/` |

If no explicit context is given, analyze the codebase to identify testable
behavior.

## Output Folder

Create or update:

```text
test-documentation/
  <CONTEXT_KEY>/
    test-cases.md
    bugs.md
    screenshots/
```

`CONTEXT_KEY` is the Linear issue key or a descriptive slug.

## Environment and Auth

Read `.env` for target environment and credentials. Never hardcode credentials.

| Role | Username variable | Password variable |
| --- | --- | --- |
| Regular | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| Power | `QA_USER_POWER` | `QA_PASS_POWER` |
| Admin | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

## Dev Server

Start the app when needed:

```bash
npm run dev
```

Default port is `3000`; use `3001`, `3002`, and so on if busy. Confirm with
`pp-dev.config.ts` or terminal output.

## Generate Test Cases

Generate test cases according to `./.claude/workflows/test-documentation.md`.

Also inspect relevant source code for behavior not covered by the explicit
acceptance criteria, but do not expand pass/fail criteria beyond the requested
scope.

## Execute Via Playwright MCP

Use `./.claude/workflows/playwright-mcp.md`.

### Form Login

1. Navigate to `BASE_URL` or the requested page URL.
2. If redirected to `/auth`, fill credentials for the requested role.
3. Click `Sign In`.
4. Capture a screenshot to verify authenticated state.

### Execution Loop

For each TC:

1. Navigate.
2. Perform the steps.
3. Verify using screenshot, visible text/HTML, console logs, and evaluate/API
   checks where useful.
4. Record `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`.
5. Save evidence screenshots under `screenshots/`.

## Bug Investigation

When a test fails:

1. Screenshot the current state.
2. Check the URL and route.
3. Read console logs.
4. Search source for relevant errors or labels.
5. Verify API data if applicable.
6. Isolate the likely cause: data, rendering, routing, permissions, or state.
7. Write `BUG-XX` entries in `bugs.md`.

## Final Local Result

At the end, summarize:

- Environment URL.
- Roles tested.
- Total passed / failed / blocked / not tested.
- Bug IDs and short titles.
- Screenshot evidence paths.
