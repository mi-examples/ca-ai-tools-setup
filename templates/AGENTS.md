# Claude Code — agent registry

Markdown files under **`.claude/agents/`** define **specialized rules** Claude should follow when a task matches (e.g. Figma MCP implementation). **`CLAUDE.md`** instructs Claude to consult these agents; this file is a **human-readable index** so contributors know what exists and when to use it. **Cursor** can read **`AGENTS.md`** too for the same index (see **`.cursorrules`**).

## Setup health

Check **`.assistant-setup/SETUP_STATUS.md`** before setup-sensitive work. Its absence means
**`ca-ai-tools-setup` is missing or incomplete**. Follow
**`.cursor/rules/assistant-setup-health.mdc`** for the read-only freshness check, and never run
`update` or `--force` without explicit developer approval.

## Registered agents

| File                       | Purpose                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code-style.md`            | Portal Page naming, SCSS modules, BEM, `app-context` / `app-provider`, `constants.ts`, `index.html` globals. Always-on for development.                     |
| `frontend-architecture.md` | Component hierarchy, design system first, reuse, JS/TS formatting (tooling-first), TypeScript, minimal scope. Always-on for development.                    |
| `commit-convention.md`     | Git commit message format — Angular commit message convention (`type(scope): subject`, body, footer). Always-on whenever writing commit messages.           |
| `qa-tester.md`             | Test cases, Playwright execution (CLI or MCP), bug documentation, and local `test-documentation/` layout.                                                   |
| `ui-verifier.md`           | Browser UI checks (Playwright CLI or MCP), visual verification, and screenshot evidence for Linear comments.                                                |
| `linear-reporter.md`       | Publish QA results to Linear (comments, state, embedded screenshots).                                                                                       |
| `figma-mcp.md`             | Figma MCP: structure-first implementation, tokens, Code Connect, layout fidelity. _(Present only if this repo was bootstrapped with Figma MCP for Claude.)_ |

Add a row when you introduce a new **`.claude/agents/<name>.md`** file.

## Keeping this file current

This starter is produced by **`ca-ai-tools-setup`** as a **shared** repo-root file (not tied to a single assistant).

- **Customize** the table for your repo: fix descriptions, add agents, or remove rows for files you delete.
- **Re-running the installer:** Existing **`AGENTS.md`** content is preserved, including with **`--force`**. The installer only adds missing generated agent rows; review the resulting diff and update existing descriptions manually when needed.
- **After changing `.claude/agents/`** on disk, update this index so it stays accurate.
