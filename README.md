# @metricinsights/ca-ai-tools-setup

Bootstrap Metric Insights Linear CLI setup files for both Cursor and Claude.

## What this package generates

**Shared (every run):** `LINEAR_CLI.md`, `AGENTS.md`, `.dev-environment.md`, `.assistant-setup/page-workflow-context.md`, `.assistant-setup/ca-ai-tools-setup.json`

**Cursor rules (Cursor and/or Claude):** `.cursor/rules/*.mdc` — Claude Code follows the same rules. Emitted for **Claude-only** runs too.

| Path | When |
|------|------|
| `setup-cursor-assistant.md` | Cursor selected |
| `.cursorrules`, `.cursorignore` | Cursor selected |
| `.cursor/rules/*` (code-style, linear-cli, linear-task-gates, portal-env-credentials, test-case-rules, test-suite-template, README; `figma-mcp.mdc` if Figma MCP) | Cursor and/or Claude |
| `.cursor/skills/*` (ai-development + DOD-FULL, testing-flow, testing-with-linear, ui-check-simple, linear-report, linear-workflow, test-documentation, playwright-mcp, figma-implementation, form-builder; figma-code-connect + references if Figma MCP) | Cursor selected |
| `.cursor/prompts/react-component-unit.md` | Cursor selected |
| `.cursor/mcp.json`, `.cursor/ca-ai-tools-setup.json` | Cursor + MCP option |
| `setup-claude-assistant.md`, `CLAUDE.md`, `.claude/settings.json` | Claude selected |
| `.claude/skills/*` (same skill set as Cursor, under `.claude/skills/`) | Claude selected |
| `.claude/agents/code-style.md` | Claude selected |
| `.claude/agents/figma-mcp.md` | Claude + Figma MCP |
| `.mcp.json` (repo root) | Claude + MCP option |

Skip/`--force` behavior: setup assistant markdown is always refreshed; most other paths are created once, then skipped unless `--force` (see package docs below).

## Distribution

This package is **private** and consumed **directly from its GitHub repository** (not the public npm registry). Push changes to the repo; consumers install with npm’s GitHub shorthand.

Authenticate to the private repo the same way you clone it (SSH, or HTTPS with a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and credential helper).

Optional: pin a **branch**, **tag**, or **commit** after `#` (for example `github:mi-examples/ca-ai-tools-setup#main` or `github:mi-examples/ca-ai-tools-setup#v0.1.0`).

The **`prepare`** script runs **`npm run build`** after **`npm install`** (including installs from `github:…` and `npm pack`), so **`dist/`** is generated and is not committed to git. **`dist/`** contains only compiled **`src/`** (the CLI and library JS); tests stay in **`tests/*.ts`** and are run with **`tsx`** — they are not emitted into **`dist/`**.

## Usage

Binary name: **`ca-ai-tools-setup`**. Package spec: **`github:mi-examples/ca-ai-tools-setup`** (optional pin: **`#main`**, **`#v0.1.0`**, commit hash). Below, **`TARGET`** is another repo path; omit **`--target`** to use the **current directory**.

The subsections **Interactive** through **Local clone** show **`npx`** invocations; swap the **`npx -p github:… ca-ai-tools-setup`** prefix for **`pnpm --package=… exec`**, **`yarn dlx …`**, or **`bunx …`** as in **Fetching the CLI with pnpm, Yarn, or Bun** — all other flags stay the same.

### Fetching the CLI with pnpm, Yarn, or Bun

One-shot install + run from GitHub (equivalent to **`npx -p … ca-ai-tools-setup`**):

```bash
pnpm --package=github:mi-examples/ca-ai-tools-setup exec ca-ai-tools-setup --assistants cursor,claude --yes
```

```bash
yarn dlx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes
```

```bash
bunx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes
```

- **pnpm:** **`pnpm exec`** runs the **`bin`** from the temporary **`--package`** install; add **`--`** before **`ca-ai-tools-setup`** only if your shell swallows flags meant for the CLI.
- **Yarn:** requires **Yarn 2+** (**`yarn dlx`**). **Yarn 1 (Classic)** has no equivalent — use **`npx`** or **`pnpm exec`** for GitHub one-shots.
- **Bun:** **`bunx`** (same idea as **`npx`**). You can also try **`bun x …`** if you standardize on Bun’s CLI.

### Interactive (prompts for assistants, MCP, QA rules)

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup
```

```bash
pnpm --package=github:mi-examples/ca-ai-tools-setup exec ca-ai-tools-setup
```

```bash
yarn dlx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup
```

```bash
bunx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup
```

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app
```

```bash
pnpm --package=github:mi-examples/ca-ai-tools-setup exec ca-ai-tools-setup --target ../my-app
```

```bash
yarn dlx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app
```

```bash
bunx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app
```

### Non-interactive — defaults (`--yes`)

**Selects** both assistants, Playwright MCP **on**, Figma MCP **off**, QA AI rules **off**. Emits **`.cursor/mcp.json`** / **`.mcp.json`** when MCP is enabled for the selected assistants.

**npm:**

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes
```

**pnpm / Yarn / Bun:** use the same shape as in **Fetching the CLI with pnpm, Yarn, or Bun** (same flags: **`--assistants cursor,claude --yes`**). Example with **`--target`:**

```bash
pnpm --package=github:mi-examples/ca-ai-tools-setup exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
yarn dlx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
bunx github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

### Preview only (`--dry-run`)

No files written; QA AI rules init is **not** executed.

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

```bash
pnpm --package=github:mi-examples/ca-ai-tools-setup exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

### One assistant only

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor --yes
```

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants claude --yes
```

### MCP — disable Playwright or enable Figma

Disable Playwright MCP (no **`.cursor/mcp.json`** / **`.mcp.json`** from this run unless Figma is on):

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

Enable **both** Playwright and Figma MCP (requires **`FIGMA_API_KEY`** where Figma is used):

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright yes --mcp-figma yes
```

### QA AI rules (`@metricinsights/qa-ai-rules`)

After generating files, runs **`init`** for the package using the detected runner (**`pnpm dlx`**, **`yarn dlx`**, **`bunx`**, or **`npx`**) with **`--cursor`** / **`--claude`** aligned to **`--assistants`**. Needs **`package.json`** in the target repo.

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --assistants cursor,claude --yes --qa-ai-rules yes
```

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor --yes --qa-ai-rules yes
```

### Overwrite existing generated files

```bash
npx -p github:mi-examples/ca-ai-tools-setup ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --force
```

### Local clone (development)

From this repository after **`npm install`**:

```bash
node dist/cli.js --target ../my-app --assistants cursor,claude --dry-run
```

## Options

- `--target <path>`: target repo directory (resolved from the current working directory; omit or press Enter in the prompt to use the current directory)
- `--assistants <list>`: comma-separated assistants, e.g. `cursor,claude`
- `--dry-run`: preview created/skipped/overwritten files without writing
- `--force`: overwrite existing generated files (no merge prompts; MCP files are fully replaced)
- `--yes` / `-y`: non-interactive defaults (existing **`setup-cursor-assistant.md`** / **`setup-claude-assistant.md`** are always replaced; existing **`.cursor/mcp.json`** / **`.mcp.json`** are left unchanged unless you pass **`--force`**)
- `--mcp-playwright <yes|no>`: add or skip Playwright MCP files for the assistants you selected (`yes` / `true` / `1` / `cursor` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **yes**
- `--mcp-figma <yes|no>`: add or skip Figma MCP files for the assistants you selected (`yes` / `true` / `1` / `figma` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **no** (requires `FIGMA_API_KEY`)
- `--qa-ai-rules <yes|no>`: after generating files, run **`@metricinsights/qa-ai-rules`** setup in the target repo (`yes` / `true` / `1` / `on` vs `none` / `no` / `false` / `0` / `off`). Uses **`--cursor`** / **`--claude`** flags aligned with **`--assistants`**. The CLI picks a one-shot runner from **`package.json`** **`packageManager`** (Corepack) and lockfiles: **`pnpm dlx`** when pnpm, **`yarn dlx`** for Yarn 2+ / Berry layout, **`bunx`** when Bun, otherwise **`npx`**. Skipped when **`--dry-run`** is set. If there is no **`package.json`** in the target, the CLI skips with a warning (you can run **`npx`** / **`pnpm dlx`** / **`yarn dlx`** / **`bunx`** manually). With **`--yes`** and no flag, defaults to **no**

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
- Obsolete QA flow cleanup (PP-3640): every re-run removes legacy **`ai-testing`** / **`ui-check`** skills and **`.claude/workflows/ui-check.md`** if they still exist from older bootstraps, then deletes any **empty parent folders** left behind (e.g. `.cursor/skills/ai-testing/`).
- Setup assistant markdown files are always refreshed on each run; use `--force` to update other generated files in place. Root **`AGENTS.md`**, **`CLAUDE.md`** and **`.claude/settings.json`** (Claude only), and **`.cursorrules`** (Cursor only), follow the same rules as **`.dev-environment.md`**: created when missing, skipped if they already exist unless **`--force`**.
- `.dev-environment.md` is generated as a personal local profile (including **Authentication**: `MI_ACCESS_TOKEN` for the dev proxy, `/data/page/index/auth/info` smoke check on localhost, session cookies); keep it up to date and add it to `.gitignore`. Store **`MI_USERNAME` / `MI_PASSWORD`** only in **`.mi-credentials.local.env`** (gitignored), never in `.dev-environment.md`.
- Page workflow context file (`.assistant-setup/page-workflow-context.md`) is generated as a shared artifact and can be refined per project.
- **Node.js:** This package keeps **`engines.node` `>=20`** for running the bootstrap CLI. Repositories that use current **`@metricinsights/pp-dev`** should use **Node.js 22+** for dev and CI (recent pp-dev requires it); align `engines` and workflow images in those app repos when you adopt newer pp-dev.
- **CI:** Consumer app repositories may not have GitHub Actions (or other CI) yet—that is still often the exception—but the goal is for **build / lint / test on every change** to become the default. This tool does not generate CI files; add workflows in each app repo when you standardize, and pin the same Node version you use locally (see above for pp-dev).
