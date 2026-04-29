# Claude Code — agent registry

Markdown files under **`.claude/agents/`** define **specialized rules** Claude should follow when a task matches (e.g. Figma MCP implementation). **`CLAUDE.md`** instructs Claude to consult these agents; this file is a **human-readable index** so contributors know what exists and when to use it. **Cursor** can read **`AGENTS.md`** too for the same index (see **`.cursorrules`**).

## Registered agents

| File | Purpose |
|------|---------|
| `figma-mcp.md` | Figma MCP: structure-first implementation, tokens, Code Connect, layout fidelity. *(Present only if this repo was bootstrapped with Figma MCP for Claude.)* |

Add a row when you introduce a new **`.claude/agents/<name>.md`** file.

## Keeping this file current

This starter is produced by **`ca-ai-tools-setup`** as a **shared** repo-root file (not tied to a single assistant).

- **Customize** the table for your repo: fix descriptions, add agents, or remove rows for files you delete.
- **Re-running the installer:** Without **`--force`**, existing **`AGENTS.md`** is **left unchanged**. To replace with the latest template from the tool, back up your file, run with **`--force`**, or **manually merge** updates (especially new rows for agents added by the bootstrapper).
- **After changing `.claude/agents/`** on disk, update this index so it stays accurate.
