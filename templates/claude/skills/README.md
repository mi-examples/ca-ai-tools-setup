# Claude Code — skills mirror

Canonical **Cursor** skills live under **`.cursor/skills/`**. The following are **copies or mirrors** for Claude Code sessions that load **`.claude/skills/`** first:

- **`ai-development`** — Linear CLI + dev gate, greenfield pp-dev, Figma MCP, Form Builder / schema (MI backend), PR review, DoD + **`DOD-FULL.md`**.
- **`figma-code-connect`** — Figma **Code Connect** template authoring (`.figma.ts`) via Figma MCP, plus reference docs under `references/`.

### QA (use Cursor canonical skills or Claude workflows)

| Purpose | Claude workflow | Cursor skill |
|---------|-----------------|--------------|
| Linear full QA | `./.claude/workflows/testing-with-linear.md` | `.cursor/skills/testing-with-linear/SKILL.md` |
| QA without Linear | `./.claude/workflows/testing-flow.md` | `.cursor/skills/testing-flow/SKILL.md` |
| Quick UI check | `./.claude/workflows/ui-check-simple.md` | `.cursor/skills/ui-check-simple/SKILL.md` |
| Linear report | `./.claude/workflows/linear-qa-report.md` | `.cursor/skills/linear-report/SKILL.md` |

**Rules** (Linear gates, CLI) live under **`.cursor/rules/*.mdc`** — Claude Code should still respect them when working in this repo.

When you change a QA skill, update **both** `.cursor/skills/...` and the matching `.claude/workflows/...` (or re-run `cp` from Cursor tree).
