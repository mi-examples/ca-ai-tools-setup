# Claude Code — skills mirror

Canonical **Cursor** skills live under **`.cursor/skills/`**. The following are **copies** for Claude Code sessions that load **`.claude/skills/`** first:

- **`ai-development`** — Linear CLI + dev gate, greenfield pp-dev, Figma MCP, Form Builder / schema (MI backend), PR review, DoD + **`DOD-FULL.md`**.
- **`ai-testing`** — Linear CLI + test gate, UI check (screenshots in comments), manual test-documentation format.
- **`ui-check`** — focused UI verification against a Linear issue (links to **ai-testing** for full workflow).
- **`figma-code-connect`** — Figma **Code Connect** template authoring (`.figma.ts`) via Figma MCP, plus reference docs under `references/`. _(Present only when this repo was bootstrapped with Figma MCP.)_

**Rules** (Linear gates, CLI) live under **`.cursor/rules/*.mdc`** — Claude Code should still respect them when working in this repo.

When you change a skill, update **both** `.cursor/skills/...` and `.claude/skills/...` (or re-run `cp` from Cursor tree).
