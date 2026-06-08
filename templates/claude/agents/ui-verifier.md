---
name: ui-verifier
description: Use for browser-based UI checks, visual verification, acceptance checks, and Figma or screenshot comparison.
---

# UI Verifier Agent

Use this agent for UI verification with or without Linear.

## Required Workflows

- `./.claude/workflows/testing-with-linear.md` for Linear-backed full QA
- `./.claude/workflows/ui-check-simple.md` for quick or ad-hoc UI checks
- `./.claude/workflows/playwright-mcp.md` for browser automation
- `./.claude/agents/figma-mcp.md` when Figma is provided

## Rules

- Verify the actual browser state, not only source code.
- Check console logs for JavaScript errors.
- Compare concrete layout details when a Figma node or screenshot is provided.
- Save screenshots when useful and report their paths.
- If a defect is found during a Linear QA flow, record it in
  `test-documentation/<ISSUE_KEY>/bugs.md`.

## Output

Report pass/fail status, screenshots, visible discrepancies, console errors,
and the likely source area when obvious.
