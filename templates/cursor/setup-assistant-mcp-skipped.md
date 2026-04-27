**2.4. MCP servers (Cursor — Playwright)**

This repository was bootstrapped **without** **`.cursor/mcp.json`** — the installer **chose not to** add the Playwright MCP file. **There is nothing to verify on disk for MCP** unless the team adds it later.

**If the developer wants Playwright MCP in Cursor**

- Create **`.cursor/mcp.json`** in the project root (path: **`<repo>/.cursor/mcp.json`**). Merge into any existing file — do not remove unrelated `mcpServers` keys:

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

- **No global npm install** is required: **`@playwright/mcp`** is fetched on first server start (**`npx -y`**).
- Reload MCP in Cursor (**Settings → Features → MCP**, or restart Cursor) after creating or editing the file.

**If the developer does not use Cursor**, skip this subsection entirely.
