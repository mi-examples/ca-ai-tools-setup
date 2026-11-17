# Agents and project instructions

Shared entry point for AI assistants in this repository. It is a **Metric Insights Portal Page / Custom App**
project (see `pp-dev.config` and `@metricinsights/pp-dev`); the rules and skills listed below are generated and
kept current by **`ca-ai-tools-setup`**.

## Setup health

Check **`.assistant-setup/SETUP_STATUS.md`** before setup-sensitive work. Its absence means
**`ca-ai-tools-setup` is missing or incomplete**. Follow the **`assistant-setup-health`** rule for the read-only
freshness check, and never run `update` or `--force` without explicit developer approval.

## Where things live

| What | Location |
| --- | --- |
<!-- only:cursor -->
| Rules for Cursor | `.cursor/rules/*.mdc` |
<!-- /only -->
<!-- only:claude -->
| Rules for Claude Code | `.claude/rules/*.md` |
| Skills | `.claude/skills/` — read by Claude Code and by Cursor |
| Subagents (Claude Code) | `.claude/agents/` |
<!-- /only -->
<!-- only:cursor-only -->
| Skills | `.cursor/skills/` |
<!-- /only -->

Always-on rules are `assistant-setup-health` and `linear-task-gates`; `code-style` and `frontend-architecture`
apply to files under `src/`. Everything else is a skill, picked up from its description or run by name — start
from `start-working-with-task` for a Linear issue.
<!-- only:claude -->

## Registered agents

Claude Code subagents under **`.claude/agents/`**. Each runs in its own context and follows the skills it
names.

| File                 | Purpose                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `qa-tester.md`       | Test cases, browser execution (Playwright CLI), bug documentation, and local `test-documentation/` layout. |
| `ui-verifier.md`     | Browser UI checks (Playwright CLI), visual verification, and screenshot evidence for Linear comments.      |
| `linear-reporter.md` | Publish QA results to Linear (comments, state, embedded screenshots).                                      |

Add a row when you introduce a new **`.claude/agents/<name>.md`** file.
<!-- /only -->

## Keeping this file current

This starter is produced by **`ca-ai-tools-setup`** as a **shared** repo-root file (not tied to a single
assistant).

- **Customize** it for your repo: fix descriptions, add agents, or remove rows for files you delete.
- **Re-running the installer:** Existing **`AGENTS.md`** content is preserved, including with **`--force`**. The
  installer only adds missing generated agent rows; review the resulting diff and update existing descriptions
  manually when needed.
