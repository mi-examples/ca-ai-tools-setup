# @metricinsights/ca-ai-tools-setup

Bootstrap Metric Insights Linear CLI setup files for both Cursor and Claude.

## What this package generates

**Shared (every run):** `LINEAR_CLI.md`, `AGENTS.md`, `.dev-environment.md`,
`.assistant-setup/page-workflow-context.md`, `.assistant-setup/SETUP_STATUS.md`,
`.assistant-setup/ca-ai-tools-setup.json`

**Cursor rules (Cursor and/or Claude):** `.cursor/rules/*.mdc` — Claude Code follows the same rules. Emitted for **Claude-only** runs too.

| Path                                                                                                                                                                                                                                                     | When                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `setup-cursor-assistant.md`                                                                                                                                                                                                                              | Cursor selected      |
| `.cursorrules`, `.cursorignore`                                                                                                                                                                                                                          | Cursor selected      |
| `.cursor/rules/*` (assistant-setup-health, code-style, linear-cli, linear-task-gates, portal-env-credentials, test-case-rules, test-suite-template, README; `figma-mcp.mdc` if Figma MCP)                                                                | Cursor and/or Claude |
| `.cursor/skills/*` (ai-development + DOD-FULL, testing-flow, testing-with-linear, ui-check-simple, linear-report, linear-workflow, test-documentation, playwright-mcp, figma-implementation, form-builder; figma-code-connect + references if Figma MCP) | Cursor selected      |
| `.cursor/prompts/react-component-unit.md`                                                                                                                                                                                                                | Cursor selected      |
| `.cursor/mcp.json`, `.cursor/ca-ai-tools-setup.json`                                                                                                                                                                                                     | Cursor + MCP option  |
| `setup-claude-assistant.md`, `CLAUDE.md`, `.claude/settings.json`                                                                                                                                                                                        | Claude selected      |
| `.claude/skills/*` (same skill set as Cursor, under `.claude/skills/`)                                                                                                                                                                                   | Claude selected      |
| `.claude/agents/code-style.md`                                                                                                                                                                                                                           | Claude selected      |
| `.claude/agents/figma-mcp.md`                                                                                                                                                                                                                            | Claude + Figma MCP   |
| `.mcp.json` (repo root)                                                                                                                                                                                                                                  | Claude + MCP option  |

Skip/`--force` behavior: setup assistant markdown is always refreshed; most other paths are created once, then skipped unless `--force` (see package docs below).

## Where Rule/Agent Template Content Comes From

The `.mdc` / `.md` rule and agent content under `templates/` is not written from scratch — it is kept in sync with real Metric Insights repos that use this bootstrapper day to day (for example `mi-pp/AI-Test-App`). Teams refine a rule while doing actual work in a bootstrapped repo (tighten a convention, add a new rule/agent file, fix a cross-reference); those refinements get ported back here so the next bootstrap ships them.

When auditing `templates/` for drift against a reference repo:

1. Diff this repo's `templates/` tree against the reference repo's generated `.claude/` / `.cursor/` files.
2. For anything that exists downstream but not here, check the commit that introduced it in the reference repo — a new rule usually lands together with cross-reference updates in `code-style.*`, `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/README.md`; port those alongside it.
3. Don't assume staleness only runs one direction: a reference repo can also fall behind **this** tool's structural additions (new skills/workflows) if it wasn't re-bootstrapped with `--force`. Treat each file independently rather than blanket-copying either direction.

## Distribution

This public repository ships a **prebuilt npm tarball** as a GitHub Release asset named
**`ca-ai-tools-setup.tgz`**. A release tag such as **`v0.1.0`** must match `package.json`; release CI validates
the source, smoke-tests the packed artifact, verifies the tag commit is on **`main`**, and attaches the tarball
to the GitHub Release. Prerelease versions (`1.2.3-rc.1`) create a GitHub prerelease.

No GitHub Packages registry or package token is required. Developers install the CLI directly from the public
release asset:

```bash
# Latest stable release
https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz

# Exact version (preferred for reviewable setup/update PRs)
https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.1.0/ca-ai-tools-setup.tgz
```

The `package-release` GitHub environment should require an internal reviewer before the release job can publish.
To release, merge a reviewed version bump, create and push the matching `vX.Y.Z` tag, then approve the protected
job. Roll back a target repository by running `check` and `update` with the previous release tarball and reviewing
the reverse diff.

The tarball contains prebuilt **`dist/**`** plus **`templates/**`**; developer machines do not compile TypeScript
during installation.

## Usage

Binary name: **`ca-ai-tools-setup`**. Below, **`TARGET`** is another repo path; omit **`--target`** to use the
**current directory**.

Set a package URL once, then reuse it with **`npx`** or **`pnpm`**:

```bash
export CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz
# or pin a version:
# export CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.1.0/ca-ai-tools-setup.tgz
```

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup
pnpm --package="$CA_AI_TOOLS_SETUP_TGZ" exec ca-ai-tools-setup
```

- **pnpm:** **`pnpm exec`** runs the **`bin`** from the temporary **`--package`** install; add **`--`** before
  **`ca-ai-tools-setup`** only if your shell swallows flags meant for the CLI.
- **Yarn / Bun:** prefer **`npx`** or **`pnpm`** for HTTPS tarball one-shots.

### Windows

The `export VAR=...` / `"$VAR"` syntax used throughout this README is Bash. On Windows, set and reference the
variable using your shell's own syntax instead:

**PowerShell:**

```powershell
$env:CA_AI_TOOLS_SETUP_TGZ = "https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz"
# or pin a version:
# $env:CA_AI_TOOLS_SETUP_TGZ = "https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.1.0/ca-ai-tools-setup.tgz"

npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup
pnpm --package="$env:CA_AI_TOOLS_SETUP_TGZ" exec ca-ai-tools-setup
```

**cmd.exe:**

```bat
set CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz

npx --yes --package="%CA_AI_TOOLS_SETUP_TGZ%" ca-ai-tools-setup
pnpm --package="%CA_AI_TOOLS_SETUP_TGZ%" exec ca-ai-tools-setup
```

Every Bash example below that uses `export VAR=...` / `"$VAR"` has a PowerShell equivalent shown right after it,
using the `$env:CA_AI_TOOLS_SETUP_TGZ` form above.

Git Bash / WSL on Windows can use the original Bash examples unchanged.

### Interactive (prompts for assistants, MCP, QA rules)

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup
```

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app
```

### Non-interactive — defaults (`--yes`)

**Selects** both assistants, Playwright MCP **on**, Figma MCP **off**, QA AI rules **off**. Emits
**`.cursor/mcp.json`** / **`.mcp.json`** when MCP is enabled for the selected assistants.

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes
```

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
pnpm --package="$CA_AI_TOOLS_SETUP_TGZ" exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```powershell
pnpm --package="$env:CA_AI_TOOLS_SETUP_TGZ" exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

### Preview only (`--dry-run`)

No files written; QA AI rules init is **not** executed.

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

### One assistant only

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor --yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor --yes
```

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants claude --yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants claude --yes
```

### MCP — disable Playwright or enable Figma

Disable Playwright MCP (no **`.cursor/mcp.json`** / **`.mcp.json`** from this run unless Figma is on):

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

Enable **both** Playwright and Figma MCP (requires **`FIGMA_API_KEY`** where Figma is used):

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright yes --mcp-figma yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright yes --mcp-figma yes
```

### QA AI rules (`@metricinsights/qa-ai-rules`)

After generating files, runs **`init`** for the package using the detected runner (**`pnpm dlx`**, **`yarn dlx`**,
**`bunx`**, or **`npx`**) with **`--cursor`** / **`--claude`** aligned to **`--assistants`**. Needs **`package.json`**
in the target repo.

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --qa-ai-rules yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --qa-ai-rules yes
```

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor --yes --qa-ai-rules yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor --yes --qa-ai-rules yes
```

### Overwrite existing generated files

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --force
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --force
```

### Local clone (development)

From this repository after **`npm install && npm run build`**:

```bash
node dist/cli.js --target ../my-app --assistants cursor,claude --dry-run
```

## Tracked setup and update workflow

All generated Cursor and Claude files are intended to be committed. Any authenticated developer may prepare
the initial setup or an update; after the PR merges, everyone else receives the files through a normal pull.
The installer is not added to the application package or lockfile.

### Initial setup

Use an exact release tarball, inspect the complete generated diff, run the target repository's validation, and
open a setup PR:

```bash
export CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.1.0/ca-ai-tools-setup.tgz
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup \
  --target ../my-app --assistants cursor,claude --yes
```

```powershell
$env:CA_AI_TOOLS_SETUP_TGZ = "https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.1.0/ca-ai-tools-setup.tgz"
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup `
  --target ../my-app --assistants cursor,claude --yes
```

### Check for changes

`check` is read-only. It returns exit code `0` when the tracked setup is synchronized, `2` when files or metadata
need attention, and `1` for invalid input or I/O failures. Use the **`latest`** release asset here — the point of
`check` is to see whether a newer release exists at all, so pinning to a specific tag defeats the purpose (that
tag may be older than what's tracked, or not exist yet):

```bash
export CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup check ../my-app
```

```powershell
$env:CA_AI_TOOLS_SETUP_TGZ = "https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz"
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup check ../my-app
```

### Prepare an update PR

Run a preview, apply the update, review `git diff`, resolve any reported protected-file conflicts, validate the
target repository, and open a normal PR. `update --dry-run` also exits `2` when changes or conflicts are pending.
Once `check` tells you which release is newer, pin **`update`** to that exact tag (not `latest`) so the PR stays
reproducible and reviewable:

```bash
export CA_AI_TOOLS_SETUP_TGZ=https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.2.0/ca-ai-tools-setup.tgz
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup update ../my-app --dry-run
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup update ../my-app
```

```powershell
$env:CA_AI_TOOLS_SETUP_TGZ = "https://github.com/mi-examples/ca-ai-tools-setup/releases/download/v0.2.0/ca-ai-tools-setup.tgz"
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup update ../my-app --dry-run
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup update ../my-app
```

Update ownership rules:

- Managed rules, skills, workflows, prompts, agents, and shared references update automatically only when their
  current hash matches the recorded generated baseline.
- Repository-owned files such as `.cursorrules`, `CLAUDE.md`, `.dev-environment.md`, and page context are
  preserved and recorded as adopted content.
- MCP JSON and Claude settings use semantic merge only when their baseline is unchanged.
- Existing `AGENTS.md` content is never replaced, including with `--force`; missing generated agent rows are
  merged into its registry table or appended as a separate generated section.
- Locally modified managed/structured files block the entire update so a partial write cannot occur. Use
  `--force` only when replacing those generated baselines is intentional.
- Unchanged managed files removed by a release are deleted; modified or protected orphaned files are preserved
  and reported.

The metadata file records package version, release commit/template revision, and per-file SHA-256 hashes with
line endings normalized for Windows/macOS/Linux checkouts. It contains no timestamp, so identical content
produces identical tracked output.

`.assistant-setup/SETUP_STATUS.md` is the agent-facing marker. Its absence means setup is missing or incomplete;
its embedded package version identifies what generated the repository. The always-on
`.cursor/rules/assistant-setup-health.mdc` rule tells Cursor and Claude to run the read-only `check` command when
freshness matters and to request approval before any update.

## Options

- `check [target]`: inspect a tracked setup without writing; exits `2` when an update or migration is required
- `update [target]`: apply a deterministic tracked-file update using the configuration stored in setup metadata
- `--version` / `-v`: print the installed CLI package version
- `--target <path>`: target repo directory (resolved from the current working directory; omit or press Enter in the prompt to use the current directory)
- `--assistants <list>`: comma-separated assistants, e.g. `cursor,claude`
- `--dry-run`: preview generation or update changes without writing; for `update`, exits `2` when changes or conflicts are pending
- `--force`: overwrite generated managed/structured baselines; protected files remain preserved in `update` mode
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

`npm install` installs development dependencies without producing `dist/`. Run `npm run build` for a local CLI.
`prepack` builds the release artifact and records release provenance. Use **`npm run typecheck`** for
**`tsc --noEmit`** over **`src/`** and **`tests/`**.

## Notes

- **Interactive MCP conflicts:** If any MCP server is enabled and **`.cursor/mcp.json`** or **`.mcp.json`** already exists, the CLI asks per file: **Skip** (keep as-is), **Merge** (union of `mcpServers`; generated server names override duplicates), or **Overwrite** (replace with the template). **`--dry-run`** and **`--yes`** skip these prompts; **`--force`** overwrites every generated path without merging.
- Legacy metadata migration: old files **`.cursor/linear-cli-setup.json`** and **`.assistant-setup/linear-cli-setup.json`** are migrated to new names on update when possible; with **`--force`**, old legacy files are removed.
- Obsolete QA flow cleanup (PP-3640): every re-run removes legacy **`ai-testing`** / **`ui-check`** skills and **`.claude/workflows/ui-check.md`** if they still exist from older bootstraps, then deletes any **empty parent folders** left behind (e.g. `.cursor/skills/ai-testing/`).
- Setup assistant markdown files are always refreshed by the legacy generation flow. For subsequent tracked updates,
  prefer `check` and `update`, which use recorded baselines instead of blanket replacement.
- `.dev-environment.md` is tracked repository guidance and may describe **Authentication** (`MI_ACCESS_TOKEN`,
  `/data/page/index/auth/info`, session cookies), but must not contain credentials. Store **`MI_USERNAME` /
  `MI_PASSWORD`** only in **`.mi-credentials.local.env`** (gitignored).
- Page workflow context file (`.assistant-setup/page-workflow-context.md`) is generated as a shared artifact and can be refined per project.
- **Node.js:** This package keeps **`engines.node` `>=20`** for running the bootstrap CLI. Repositories on **`@metricinsights/pp-dev` ≥ 1.0** need **Node.js ≥ 24** (declared in its `engines`); align `engines` and workflow images in those app repos when you adopt that pp-dev version.
- **CI:** Consumer app repositories may not have GitHub Actions (or other CI) yet—that is still often the exception—but the goal is for **build / lint / test on every change** to become the default. This tool does not generate CI files; add workflows in each app repo when you standardize, and pin the same Node version you use locally (see above for pp-dev).
