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

**Browser automation without MCP:** the **Playwright Agent CLI** (`npx playwright-cli ...`) is the
**preferred**, token-efficient way to drive a browser and needs **no MCP config or IDE enablement**.
It ships with the repo (`@playwright/cli` pinned devDependency + committed skill at
**`.cursor/skills/playwright-cli/SKILL.md`**), so `npm install` is all a teammate needs. See
**Step 2.6** below.

**If the developer does not use Cursor**, skip this subsection entirely.
