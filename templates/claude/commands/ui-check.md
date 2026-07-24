# UI Check

Run a UI verification flow.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Inspect `$ARGUMENTS`.
2. If it contains a Linear issue key or URL, read and follow
   `./.claude/workflows/testing-with-linear.md` (full QA) unless the user
   explicitly asks for a quick check — then use
   `./.claude/workflows/ui-check-simple.md`.
3. If it does not contain a Linear issue, read and follow
   `./.claude/workflows/ui-check-simple.md`.
4. For browser verification use one transport (both work) —
   `./.claude/workflows/playwright-cli.md` (Playwright Agent CLI, **preferred**,
   token-efficient) or `./.claude/workflows/playwright-mcp.md` (Playwright MCP).
5. If a Figma link or node is included, read `./.claude/agents/figma-mcp.md`.
6. Report concrete pass/fail findings, screenshot paths, discrepancies, and
   console errors.
