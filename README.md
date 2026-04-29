# @metricinsights/ca-ai-tools-setup

Bootstrap Metric Insights Linear CLI setup files for both Cursor and Claude.

## What this package generates

- `setup-cursor-assistant.md`
- `.cursorrules` — short legacy entry point (points to **`.cursor/rules/`** and **`AGENTS.md`**; skipped on later runs if already present unless `--force`)
- `setup-claude-assistant.md`
- `CLAUDE.md` — Claude Code project instructions (starter; skipped on later runs if already present unless `--force`)
- `.cursor/rules/linear-cli.mdc`
- `.cursor/rules/README.md`
- `.cursor/ca-ai-tools-setup.json`
- `.cursor/mcp.json` (optional — when Cursor is selected and you enable one or more MCP servers in the CLI)
- `.mcp.json` in the repository root (optional — when Claude is selected and you enable one or more MCP servers in the CLI)
- `.claude/agents/figma-mcp.md` (optional — when Claude is selected and Figma MCP is enabled)
- `.dev-environment.md`
- `.assistant-setup/page-workflow-context.md`
- `.assistant-setup/ca-ai-tools-setup.json`
- `LINEAR_CLI.md` — Linear CLI command reference (Rust `linear-cli`)
- `AGENTS.md` — index of **`.claude/agents/*.md`** (shared with every bootstrap; same overwrite behavior as **`LINEAR_CLI.md`**)

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

With **`--yes`**, Playwright MCP defaults to **on** and Figma MCP defaults to **off**. It writes **`.cursor/mcp.json`** if Cursor is selected and **`.mcp.json`** in the repo root if Claude is selected when at least one MCP server is enabled.

Turn both off non-interactively:

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

Enable both Playwright and Figma MCP non-interactively:

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright yes --mcp-figma yes
```

## Options

- `--target <path>`: target repo directory (resolved from the current working directory; omit or press Enter in the prompt to use the current directory)
- `--assistants <list>`: comma-separated assistants, e.g. `cursor,claude`
- `--dry-run`: preview created/skipped/overwritten files without writing
- `--force`: overwrite existing generated files (no merge prompts; MCP files are fully replaced)
- `--yes` / `-y`: non-interactive defaults (existing **`setup-cursor-assistant.md`** / **`setup-claude-assistant.md`** are always replaced; existing **`.cursor/mcp.json`** / **`.mcp.json`** are left unchanged unless you pass **`--force`**)
- `--mcp-playwright <yes|no>`: add or skip Playwright MCP files for the assistants you selected (`yes` / `true` / `1` / `cursor` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **yes**
- `--mcp-figma <yes|no>`: add or skip Figma MCP files for the assistants you selected (`yes` / `true` / `1` / `figma` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **no** (requires `FIGMA_API_KEY`)

## Page Workflow Context

The generator creates **`.assistant-setup/page-workflow-context.md`** as a lightweight working document for page-focused tasks.

Use it to capture:

- Key routes/page entry points
- Primary user flows
- Preconditions (auth, env, feature flags, seed data)
- Expected stable UI markers and known caveats

The file is template-first by design and should be updated per repository.

## Backend API Version Notes

Use Metric Insights API docs as a baseline reference: [API Access](https://help.metricinsights.com/m/API_Access).

Important:

- Documentation coverage is helpful but not always complete for every environment.
- Request/response shapes and validation rules may differ by instance version.
- Validate assumptions against the target instance (token + representative API checks) and record confirmed differences in **`.dev-environment.md`** (under **API compatibility notes**).

## Local development

```bash
npm install
npm test
```

`npm install` runs `prepare` and builds `dist/`. Use `npm run build` alone when you only need a compile without reinstalling. Use **`npm run typecheck`** for **`tsc --noEmit`** over **`src/`** and **`tests/`** (no output).

## Notes

- **Interactive MCP conflicts:** If any MCP server is enabled and **`.cursor/mcp.json`** or **`.mcp.json`** already exists, the CLI asks per file: **Skip** (keep as-is), **Merge** (union of `mcpServers`; generated server names override duplicates), or **Overwrite** (replace with the template). **`--dry-run`** and **`--yes`** skip these prompts; **`--force`** overwrites every generated path without merging.
- Legacy metadata migration: old files **`.cursor/linear-cli-setup.json`** and **`.assistant-setup/linear-cli-setup.json`** are migrated to new names on update when possible; with **`--force`**, old legacy files are removed.
- Setup assistant markdown files are always refreshed on each run; use `--force` to update other generated files in place. Root **`AGENTS.md`**, **`CLAUDE.md`** (Claude only), and **`.cursorrules`** (Cursor only), follow the same rules as **`.dev-environment.md`**: created when missing, skipped if they already exist unless **`--force`**.
- `.dev-environment.md` is generated as a personal local profile (including **Authentication**: `MI_ACCESS_TOKEN` for the dev proxy, `/data/page/index/auth/info` smoke check on localhost, session cookies); keep it up to date and add it to `.gitignore`. Store **`MI_USERNAME` / `MI_PASSWORD`** only in **`.mi-credentials.local.env`** (gitignored), never in `.dev-environment.md`.
- Page workflow context file (`.assistant-setup/page-workflow-context.md`) is generated as a shared artifact and can be refined per project.
- **Node.js:** This package keeps **`engines.node` `>=20`** for running the bootstrap CLI. Repositories that use current **`@metricinsights/pp-dev`** should use **Node.js 22+** for dev and CI (recent pp-dev requires it); align `engines` and workflow images in those app repos when you adopt newer pp-dev.
- **CI:** Consumer app repositories may not have GitHub Actions (or other CI) yet—that is still often the exception—but the goal is for **build / lint / test on every change** to become the default. This tool does not generate CI files; add workflows in each app repo when you standardize, and pin the same Node version you use locally (see above for pp-dev).
