# @metricinsights/ca-ai-tools-setup

Bootstrap Metric Insights Linear CLI setup files for both Cursor and Claude.

## What this package generates

- `setup-cursor-assistant.md`
- `setup-claude-assistant.md`
- `.cursor/rules/linear-cli.mdc`
- `.cursor/rules/README.md`
- `.cursor/linear-cli-setup.json`
- `.cursor/mcp.json` (optional — when Cursor is selected and you enable Playwright MCP in the CLI)
- `.mcp.json` in the repository root (optional — when Claude is selected and Playwright MCP is enabled; same Playwright server via `npx -y @playwright/mcp`)
- `.assistant-setup/linear-cli-setup.json`

## Distribution

This package is **private** and consumed **directly from its GitHub repository** (not the public npm registry). Push changes to the repo; consumers install with npm’s GitHub shorthand.

Authenticate to the private repo the same way you clone it (SSH, or HTTPS with a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and credential helper).

Optional: pin a **branch**, **tag**, or **commit** after `#` (for example `github:mi-examples/ca-ai-tools-setup#main` or `github:mi-examples/ca-ai-tools-setup#v0.1.0`).

The **`prepare`** script runs **`npm run build`** after **`npm install`** (including installs from `github:…` and `npm pack`), so **`dist/`** is generated and is not committed to git. **`dist/`** contains only compiled **`src/`** (the CLI and library JS); tests stay in **`tests/*.ts`** and are run with **`tsx`** — they are not emitted into **`dist/`**.

## Usage

### Interactive (multi-select assistants)

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup
```

The CLI prompts with a multi-select for assistants (Cursor and Claude), defaulting to both.

### Non-interactive

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes
```

With **`--yes`**, Playwright MCP defaults to **on**: it writes **`.cursor/mcp.json`** if Cursor is selected and **`.mcp.json`** in the repo root if Claude is selected. Turn it off non-interactively:

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

## Options

- `--target <path>`: target repo directory (resolved from the current working directory; omit or press Enter in the prompt to use the current directory)
- `--assistants <list>`: comma-separated assistants, e.g. `cursor,claude`
- `--dry-run`: preview created/skipped/overwritten files without writing
- `--force`: overwrite existing generated files (no merge prompts; MCP files are fully replaced)
- `--yes` / `-y`: non-interactive defaults (existing **`.cursor/mcp.json`** / **`.mcp.json`** are left unchanged unless you pass **`--force`**)
- `--mcp-playwright <yes|no>`: add or skip Playwright MCP files for the assistants you selected (`yes` / `true` / `1` / `cursor` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **yes**

## Local development

```bash
npm install
npm test
```

`npm install` runs `prepare` and builds `dist/`. Use `npm run build` alone when you only need a compile without reinstalling. Use **`npm run typecheck`** for **`tsc --noEmit`** over **`src/`** and **`tests/`** (no output).

## Notes

- **Interactive MCP conflicts:** If Playwright MCP is enabled and **`.cursor/mcp.json`** or **`.mcp.json`** already exists, the CLI asks per file: **Skip** (keep as-is), **Merge** (union of `mcpServers`; generated server names override duplicates), or **Overwrite** (replace with the template). **`--dry-run`** and **`--yes`** skip these prompts; **`--force`** overwrites every generated path without merging.
- Docker/MySQL setup is intentionally excluded from generated templates.
- Re-run with `--force` to update existing generated files.
- **Node.js:** This package keeps **`engines.node` `>=20`** for running the bootstrap CLI. Repositories that use current **`@metricinsights/pp-dev`** should use **Node.js 22+** for dev and CI (recent pp-dev requires it); align `engines` and workflow images in those app repos when you adopt newer pp-dev.
- **CI:** Consumer app repositories may not have GitHub Actions (or other CI) yet—that is still often the exception—but the goal is for **build / lint / test on every change** to become the default. This tool does not generate CI files; add workflows in each app repo when you standardize, and pin the same Node version you use locally (see above for pp-dev).
