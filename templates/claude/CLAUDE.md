# Claude Code — project instructions

This repository targets **Metric Insights Portal Page / Custom App** development (see **`pp-dev.config`**, **`@metricinsights/pp-dev`**). Treat **`setup-claude-assistant.md`** as the full bootstrap playbook (tools, Linear CLI, MCP). **`LINEAR_CLI.md`** documents **`linear-cli`** commands.

## Scope for Claude in this repo

- Prefer **`pp-dev.config`** and **`package.json`** scripts for dev commands (`npm run dev`, `npx pp-dev`, Next.js: `npx pp-dev next` when applicable).
- Local app URL is **`http://localhost:<port>`** (default **3000**; next free port if busy). Resolve port from config, server output, or the browser.
- Authentication and API quirks belong in **`.dev-environment.md`** (personal; often gitignored). Do not invent secrets; follow that file for **`MI_ACCESS_TOKEN`**, session checks, and credentials layout.

## Claude Code settings

- Project **`/.claude/settings.json`** is the shared **Claude Code** JSON config (permissions, hooks, `env`, etc.). Use **`/.claude/settings.local.json`** for personal overrides (typically gitignored). See [Claude Code settings](https://code.claude.com/docs/en/settings).
- When this repo was bootstrapped **with** root **`.mcp.json`**, the generated **`.claude/settings.json`** includes **`enableAllProjectMcpServers`**, **`enabledMcpjsonServers`** (matching server keys such as **`playwright`** / **`figma`**), and **`permissions.allow`** patterns so those MCP tools are permitted—reload MCP in Claude Code after changes.
- **Re-running `ca-ai-tools-setup`:** Without **`--force`**, an existing **`.claude/settings.json`** is **not** overwritten—extend it in place or merge new keys from the template after back-up.

## Agents

- Read task-specific rules under **`.claude/agents/*.md`** when the task matches (design implementation, MCP-specific workflows, etc.).
- **`AGENTS.md`** lists available agent files and short purposes—keep it aligned when you add or rename agents.

### Figma MCP

If **`.claude/agents/figma-mcp.md`** exists, use it for Figma MCP design-to-code work instead of ad-hoc styling guesses.

## Keeping this file current

This starter was produced by **`ca-ai-tools-setup`** when Claude was selected. **Customize it** with repo-specific conventions (test commands, branching, code owners, naming).

- **First run:** You get this template at the repo root; extend it rather than duplicating long sections from **`setup-claude-assistant.md`** (link to that file instead).
- **Re-running the installer:** Without **`--force`**, existing **`CLAUDE.md`** is **left unchanged** so local edits are preserved. To refresh from the latest tool template, back up your file, run with **`--force`**, or **manually merge** new paragraphs from the updated template.
- **After setup:** When tooling or MCP choices change, update this file (and **`AGENTS.md`**) so Claude Code sees accurate project rules.
