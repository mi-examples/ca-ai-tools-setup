**2.4. MCP servers (Cursor — Playwright)**

This repository was bootstrapped **with** **`.cursor/mcp.json`** — the **playwright** MCP entry is already on disk (project-level Cursor MCP).

**What you need to do**

- Open the repo in **Cursor** and confirm **`.cursor/mcp.json`** exists. If someone deleted it, recreate it (merge with any existing `mcpServers` — do not remove unrelated servers):

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

- **No global npm install** is required: **`@playwright/mcp`** is pulled the first time Cursor starts the server (**`npx -y`**).
- After any edit to **`mcp.json`**, reload MCP in Cursor (**Settings → Features → MCP**, or restart Cursor) and confirm **playwright** appears and tools work.

**If the developer does not use Cursor**, this file is harmless in git; they can ignore it or remove it by team policy.
