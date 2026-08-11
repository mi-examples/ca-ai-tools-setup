# Claude Code Instructions

This repository targets **Metric Insights Portal Page / Custom App**
development (see `pp-dev.config` and `@metricinsights/pp-dev`). Treat
`setup-claude-assistant.md` as the full bootstrap playbook and `LINEAR_CLI.md`
as the `linear-cli` command reference.

## Scope

- Read `AGENTS.md` and `README.md` before non-trivial code changes.
- Follow **`.claude/agents/code-style.md`** (Portal Page naming, SCSS modules, BEM,
  `app-context` / `app-provider`, `constants.ts`, `index.html` globals). Cursor mirror:
  **`.cursor/rules/code-style.mdc`**.
- Follow **`.claude/agents/frontend-architecture.md`** (component hierarchy, design
  system first, reuse, JS/TS formatting (tooling-first), TypeScript, minimal scope).
  Cursor mirror: **`.cursor/rules/frontend-architecture.mdc`**.
- Follow **`.claude/agents/commit-convention.md`** for commit messages (Angular
  commit message convention: `type(scope): subject`). Cursor mirror:
  **`.cursor/rules/commit-convention.mdc`**.
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
- For browser automation or UI verification, choose one transport (both stay available):
  - `./.claude/workflows/playwright-cli.md` — Playwright Agent CLI via `npx playwright-cli`
    (**preferred**, token-efficient, no MCP config).
  - `./.claude/workflows/playwright-mcp.md` — Playwright MCP tools (`playwright_*`).
- For Figma implementation or visual matching, read
  `./.claude/agents/figma-mcp.md`.

## Browser Automation: MCP or CLI

This repo ships **two interchangeable** browser-automation transports for AI agents — pick one
per task; nothing is removed:

- **Playwright MCP** — `playwright_*` tools from `.mcp.json` / `.claude/settings.json`. See
  `./.claude/workflows/playwright-mcp.md` (Cursor mirror: `.cursor/skills/playwright-mcp/SKILL.md`).
- **Playwright Agent CLI** (**preferred**) — `npx playwright-cli ...` via Bash; lower token
  cost, no MCP config. See `./.claude/workflows/playwright-cli.md` (Cursor mirror:
  `.cursor/skills/playwright-cli/SKILL.md`).

**Universal setup (not per-developer):** the CLI ships with the repo so `npm install` is all a
teammate needs — no global install, no per-machine MCP config.

- Keep `@playwright/cli` as a **pinned devDependency** in `package.json`
  (`npm install --save-dev @playwright/cli@0.1.17`). Invoke it as `npx playwright-cli ...`.
- Add the CLI workspace state to `.gitignore` and never commit it:

  ```gitignore
  .playwright/       # CLI workspace state (sessions, browser profiles)
  .playwright-cli/   # page snapshots, console logs
  ```

## Keeping Generated Files Current

Files under `.claude/agents/`, `.claude/workflows/`, `.claude/commands/`, `.claude/skills/`,
and `.cursor/rules/` are templates from **`ca-ai-tools-setup`**
(`github:mi-examples/ca-ai-tools-setup`, see its `templates/` directory). Re-running the
installer without `--force` does **not** refresh files that already exist, so a repo
bootstrapped earlier can silently fall behind the current template set — missing new
agents/rules, stale cross-references, or superseded conventions.

If you notice a generated file that looks outdated — it doesn't reference an agent/rule
another current file points at, or it documents a convention a newer file contradicts —
treat that as a signal this repo predates the latest templates:

1. Fetch the current version of the affected file(s) from `github:mi-examples/ca-ai-tools-setup`
   (local `.claude/agents/<name>.md` maps to `templates/claude/agents/<name>.md`; local
   `.cursor/rules/<name>.mdc` maps to `templates/cursor/rules/<name>.mdc`).
2. Update the local file(s) to match, preserving any repo-specific customizations already
   made.
3. Tell the user what changed and why so they can review before committing.

Do not blanket-overwrite with `--force` — that would also discard customizations in files
meant to be edited per-repo (`AGENTS.md`, this file, `code-style.md`, etc.).

## Claude Code Settings

- Project `/.claude/settings.json` is the shared Claude Code JSON config
  (permissions, hooks, `env`, etc.).
- Use `/.claude/settings.local.json` for personal overrides.
- Re-running `ca-ai-tools-setup` without `--force` does not overwrite an
  existing `.claude/settings.json`; extend it in place or manually merge new
  template keys.
