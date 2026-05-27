# Claude Code — skills mirror

Canonical **Cursor** skills live under **`.cursor/skills/`**. The following are **copies** for Claude Code sessions that load **`.claude/skills/`** first:

- **`ai-development`** — Linear CLI + dev gate, greenfield pp-dev, Figma MCP, Form Builder / schema (MI backend), PR review, DoD + **`DOD-FULL.md`**.
- **`ai-testing`** — Linear CLI + test gate, UI check (screenshots in comments), manual test-documentation format.
- **`ui-check`** — focused UI verification against a Linear issue (see also **`.claude/workflows/ui-check.md`**).
- **`figma-code-connect`** — Figma **Code Connect** template authoring (`.figma.ts`) via Figma MCP, plus reference docs under `references/`. _(Present only when Figma MCP was enabled at bootstrap.)_

**QA orchestration** for Claude Code is under **`.claude/workflows/`** (testing flow, Linear-driven QA, playwright-mcp, linear-qa-report, etc.). See **`CLAUDE.md`** for routing.

**Rules** (Linear gates, CLI) live under **`.cursor/rules/*.mdc`** — Claude Code should still respect them when working in this repo.

When you change a skill, update **both** `.cursor/skills/...` and `.claude/skills/...` (or matching workflows), or re-run the installer.
