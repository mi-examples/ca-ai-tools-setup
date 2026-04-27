**2.4. MCP servers (Claude Code — Playwright)**

This repository was bootstrapped **with** **`.mcp.json`** in the **project root** (`<repo>/.mcp.json`) — the **playwright** MCP entry is already on disk for **Claude Code** (and other clients that read this file from the repo).

**What you need to do**

- Confirm **`.mcp.json`** exists at the repository root. If it was removed, recreate it (merge with any existing **`mcpServers`** — do not remove unrelated servers):

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

- **No global npm install** is required: **`@playwright/mcp`** is pulled the first time the MCP server starts (**`npx -y`**).
- Ensure **Claude Code** is configured to load **project-level** MCP from this repo (per current Claude Code / Anthropic docs for your version). After changing **`.mcp.json`**, reload MCP or restart Claude Code and confirm **playwright** tools are available.

**Commit policy:** Commit **`.mcp.json`** when it contains no secrets; use env-based config for tokens if you extend the file later.
