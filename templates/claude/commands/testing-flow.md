# Testing Flow

Run the local QA testing flow. Linear is optional.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Treat `$ARGUMENTS` as the test context. It may be a Linear issue, route,
   component, feature description, screenshot, or Figma link.
2. Read `./.claude/workflows/testing-flow.md`.
3. If `$ARGUMENTS` contains a Linear issue, also read
   `./.claude/workflows/linear-workflow.md` and fetch comments first.
4. Create or update `test-documentation/<CONTEXT_KEY>/test-cases.md`.
5. Execute the cases through Playwright MCP when browser verification is
   required.
6. Write bugs to `test-documentation/<CONTEXT_KEY>/bugs.md`.
7. Summarize local results in the conversation.
