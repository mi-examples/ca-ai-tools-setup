# UI Check

Run a UI verification flow.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Inspect `$ARGUMENTS`.
2. If it contains a Linear issue key or URL, read and follow
   `./.claude/workflows/ui-check.md`.
3. If it does not contain a Linear issue, read and follow
   `./.claude/workflows/ui-check-simple.md`.
4. Use Playwright MCP for browser verification.
5. If a Figma link or node is included, read `./.claude/agents/figma-mcp.md`.
6. Report concrete pass/fail findings, screenshot paths, discrepancies, and
   console errors.
