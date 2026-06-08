# Claude Code Instructions

This repository targets **Metric Insights Portal Page / Custom App**
development (see `pp-dev.config` and `@metricinsights/pp-dev`). Treat
`setup-claude-assistant.md` as the full bootstrap playbook and `LINEAR_CLI.md`
as the `linear-cli` command reference.

## Scope

- Read `AGENTS.md` and `README.md` before non-trivial code changes.
- Prefer `pp-dev.config` and `package.json` scripts for dev commands
  (`npm run dev`, `npx pp-dev`, or `npx pp-dev next` when applicable).
- Local app URL is `http://localhost:<port>`; default `3000`, then the next
  free port if busy. Resolve the port from config, server output, or browser.
- Authentication and API quirks belong in `.dev-environment.md` or `.env`.
  Never invent or commit secrets.
- Search before creating components, hooks, API modules, test docs, workflow
  files, or agent files.
- Do not revert user changes unless explicitly requested.

## QA and Linear Routing

Before Linear-driven **testing**, check **`.cursor/rules/linear-task-gates.mdc`**
(`Waiting AI Test`). Before **development**, check the same file
(`Waiting AI Development`).

When the user references a Linear issue, task URL, issue key, or says
`start working with task`, use only the issue from the current user message and
read:

`./.claude/workflows/linear-workflow.md`

For a full QA run against a Linear issue, read and follow:

`./.claude/workflows/testing-with-linear.md`

For QA without Linear, read and follow:

`./.claude/workflows/testing-flow.md`

For quick UI checks, read and follow:

`./.claude/workflows/ui-check-simple.md`

For publishing QA results to Linear, read and follow:

`./.claude/workflows/linear-qa-report.md`

## Slash Commands

Use project commands from `./.claude/commands/` when available:

- `/testing-with-linear <ISSUE_KEY_OR_URL>`
- `/testing-flow <CONTEXT>`
- `/ui-check <TARGET_OR_ISSUE>`
- `/linear-report <ISSUE_KEY_OR_URL>`
- `/start-working-with-task <ISSUE_KEY_OR_URL>`
- `/test-documentation <CONTEXT>`

## Specialized Agents

Use agents from `./.claude/agents/` when a task benefits from a focused role:

- `qa-tester` for test cases, execution, and bug documentation.
- `ui-verifier` for browser UI checks and visual verification.
- `linear-reporter` for publishing QA results to Linear.
- `figma-mcp` for Figma MCP inspection and design-to-code guidance.

`AGENTS.md` lists available agent files and short purposes. Keep it aligned
when agent files are added, renamed, or removed.

## Required Workflow Habits

- Always read Linear comments before generating test cases. The latest
  dev/product/review comment overrides older issue description text when they
  conflict.
- Test documentation lives in `test-documentation/<CONTEXT_KEY>/`.
- Use abstract QA roles in docs: `Regular`, `Power`, `Admin`.
- Actual role credentials come from `.env` variables:
  `QA_USER_REGULAR`, `QA_PASS_REGULAR`, `QA_USER_POWER`, `QA_PASS_POWER`,
  `QA_USER_ADMIN`, `QA_PASS_ADMIN`.
- For browser automation or UI verification, read
  `./.claude/workflows/playwright-mcp.md`.
- For Figma implementation or visual matching, read
  `./.claude/agents/figma-mcp.md`.

## Claude Code Settings

- Project `/.claude/settings.json` is the shared Claude Code JSON config
  (permissions, hooks, `env`, etc.).
- Use `/.claude/settings.local.json` for personal overrides.
- Re-running `ca-ai-tools-setup` without `--force` does not overwrite an
  existing `.claude/settings.json`; extend it in place or manually merge new
  template keys.
