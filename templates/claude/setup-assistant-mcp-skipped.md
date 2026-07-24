**2.4. MCP servers (Claude Code — Playwright)**

This repository was bootstrapped **without** **`.mcp.json`** in the project root — the installer **chose not to** add the Playwright MCP file for this run.

**If the developer wants Playwright MCP**

- Create **`.mcp.json`** at **`<repository-root>/.mcp.json`** (same directory as **`package.json`** / **`pp-dev.config`**). Merge **`mcpServers`** with any existing file — do not remove unrelated keys:

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

- **No global npm install** is usually required (**`npx -y`** on first server start).
- Register the project MCP file in **Claude Code** per current product documentation, then reload or restart so tools appear.

Do **not** block onboarding on MCP; skip this subsection if browser automation is not needed.

**Browser automation without MCP:** the **Playwright Agent CLI** (`npx playwright-cli ...`) is the
**preferred**, token-efficient way to drive a browser and needs **no MCP config at all**. It ships
with the repo (`@playwright/cli` pinned devDependency + committed skill), so `npm install` is all a
teammate needs. See **`./.claude/workflows/playwright-cli.md`** and **Step 2.5** below.
