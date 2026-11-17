# @metricinsights/ca-ai-tools-setup

Bootstrap Metric Insights AI assistant setup files (rules, skills, subagents) for both Cursor and Claude Code.

## What this package generates

Every rule and skill has **one source** under `templates/`. What differs per assistant is only where the file
goes and its frontmatter.

| Path                                                                                                                                                                               | When                                           | Source                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `AGENTS.md`, `.gitignore` entry, `.dev-environment.md`, `.assistant-setup/page-workflow-context.md`, `.assistant-setup/SETUP_STATUS.md`, `.assistant-setup/ca-ai-tools-setup.json` | every run                                      | `templates/AGENTS.md`, `templates/assistant-setup/*`            |
| `.cursor/rules/*.mdc`                                                                                                                                                              | Cursor selected                                | `templates/rules/*.md`                                          |
| `.claude/rules/*.md`                                                                                                                                                               | Claude selected                                | `templates/rules/*.md`                                          |
| `.claude/skills/*`                                                                                                                                                                 | Claude selected (Cursor reads this folder too) | `templates/skills/*`                                            |
| `.cursor/skills/*`                                                                                                                                                                 | Cursor selected **without** Claude             | `templates/skills/*`                                            |
| `setup-cursor-assistant.md`, `.cursorignore`                                                                                                                                       | Cursor selected                                | `templates/setup-assistant.md`, `templates/cursor/cursorignore` |
| `setup-claude-assistant.md`, `CLAUDE.md`, `.claude/settings.json`                                                                                                                  | Claude selected                                | `templates/setup-assistant.md`, `templates/claude/CLAUDE.md`    |
| `.claude/agents/*` (`qa-tester`, `ui-verifier`, `linear-reporter`), `.claude/commands/*` (`/ui-check`, `/customer-docs`)                                                           | Claude selected                                | `templates/claude/*`                                            |
| `.cursor/mcp.json`, `.mcp.json`, the `figma-implementation` skill                                                                                                                  | Figma MCP selected                             | `src/generators/mcp.ts`, `templates/skills/figma-*`             |

**Rules** (`assistant-setup-health`, `linear-task-gates`, `code-style`, `frontend-architecture`): the first two
apply always, the other two only to files under `src/`. A rule source declares `apply: always` or a `paths`
list; the generator turns that into `alwaysApply` / `globs` for Cursor and into `paths` for Claude Code.

**Skills** cover everything that is needed only now and then: `start-working-with-task`, `ai-development`,
`testing-with-linear`, `testing-flow`, `ui-check-simple`, `linear-workflow`, `linear-report`,
`linear-merge-notification`, `test-documentation`, `playwright-cli`, `commit-convention`,
`portal-env-credentials`, `customer-app-docs`. A skill runs as `/<name>` or is picked up from its description,
so there are no separate workflow or command copies. Assistant-specific blocks in a shared template are marked
with `<!-- only:cursor -->` / `<!-- only:claude -->` / `<!-- only:cursor-only -->` … `<!-- /only -->`.

There is no `.cursorrules`: Cursor deprecated it in favor of `.cursor/rules/` and `AGENTS.md`.

Skip/`--force` behavior: setup assistant markdown is always refreshed; most other paths are created once, then skipped unless `--force` (see package docs below).

## Where Rule/Agent Template Content Comes From

The `.mdc` / `.md` rule and agent content under `templates/` is not written from scratch — it is kept in sync with real Metric Insights repos that use this bootstrapper day to day (for example `mi-pp/AI-Test-App`). Teams refine a rule while doing actual work in a bootstrapped repo (tighten a convention, add a new rule/agent file, fix a cross-reference); those refinements get ported back here so the next bootstrap ships them.

When auditing `templates/` for drift against a reference repo:

1. Diff this repo's `templates/` tree against the reference repo's generated `.claude/` / `.cursor/` files.
2. For anything that exists downstream but not here, check the commit that introduced it in the reference repo — a new rule usually lands together with cross-reference updates in `code-style.*`, `AGENTS.md` and `CLAUDE.md`; port those alongside it.
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

**Selects** both assistants, Figma MCP **off**, QA AI rules **off**. **`.cursor/mcp.json`** / **`.mcp.json`**
are written only when Figma MCP is enabled.

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

### MCP — enable Figma

Figma is the only MCP server the setup writes. It is the Framelink server (`figma-developer-mcp`, pinned to a
version), signed in with a personal access token — no OAuth. Put the token into the target repository's `.env`
as **`FIGMA_API_KEY`**; the server reads it from there, or from an environment variable. Browser automation does not use
MCP: it runs through the Playwright CLI (`npx playwright-cli`), which ships with the generated skills.

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-figma yes
```

```powershell
npx --yes --package="$env:CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup --assistants cursor,claude --yes --mcp-figma yes
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
- Protected files such as `CLAUDE.md`, `.cursorignore`, `.dev-environment.md` and the page context follow their
  template only while they are still exactly what the generator wrote. Once the repository edits one, it is never
  overwritten: when its template changes, the new template is written to
  `.assistant-setup/pending-updates/<path>` and listed under `pendingMerges`, and `SETUP_STATUS.md` tells the
  assistant how to merge it. The personal `.dev-environment.md` never gets a pending template.
- Structured files (`AGENTS.md`, `.gitignore`, MCP JSON, Claude settings) follow their template while they are
  still exactly what the generator wrote. Once one holds repository content it is merged, never replaced.
- MCP JSON and Claude settings use semantic merge only when their baseline is unchanged. A server the generator
  wrote earlier and no longer generates is removed from them while the entry is still exactly what the generator
  wrote; repository servers and edited entries stay.
- `AGENTS.md` content the repository wrote is never replaced, including with `--force`; missing generated agent
  rows are merged into its registry table or appended as a separate generated section.
- Locally modified managed/structured files block the entire update so a partial write cannot occur. With
  `--force` a managed file is replaced. MCP JSON and Claude settings are merged instead: generated entries win
  over same-named ones, while repository servers, real tokens in `env` and other settings stay. Only a file
  that is not valid JSON is replaced.
- Files a release stops generating:
  - an untouched generated file is deleted, together with any directory it leaves empty;
  - a file with local edits, or with content adopted from the repository, is a conflict that blocks the update
    like any other. `--force` deletes a managed file; from MCP JSON and Claude settings it removes only the
    generated entries;
  - a protected file the repository edited, and an MCP file left with repository servers only, stay in place
    and are no longer tracked — after that update `check` returns `0`.
- A plain re-run (without `update`) deletes untouched obsolete files the same way. It never deletes an edited
  one: the file stays tracked, so `check` and `update` report the conflict.
- Repositories on schema 5 metadata, or with no metadata, have no per-file hashes to compare with. `update`
  removes the known obsolete paths there only with `--force`; a plain re-run removes them and lists them under
  "Removed legacy files". The known paths include the `.cursor/skills/` copies when Claude is selected and the
  Cursor rules of a Claude-only setup. A generated MCP server that is no longer generated is removed from
  `.mcp.json` / `.cursor/mcp.json` without `--force`, as long as the entry still equals the generated one.
  `.cursorrules` is reported and never removed.

The metadata file records package version, release commit/template revision, and per-file SHA-256 hashes with
line endings normalized for Windows/macOS/Linux checkouts. It contains no timestamp, so identical content
produces identical tracked output.

`.assistant-setup/SETUP_STATUS.md` is the agent-facing marker. Its absence means setup is missing or incomplete;
its embedded package version identifies what generated the repository. The always-on `assistant-setup-health`
rule (`.cursor/rules/assistant-setup-health.mdc` for Cursor, `.claude/rules/assistant-setup-health.md` for Claude
Code) tells the assistant to run the read-only `check` command when freshness matters and to request approval
before any update.

## Options

- `check [target]`: inspect a tracked setup without writing; exits `2` when an update or migration is required
- `update [target]`: apply a deterministic tracked-file update using the configuration stored in setup metadata
- `--version` / `-v`: print the installed CLI package version
- `--target <path>`: target repo directory (resolved from the current working directory; omit or press Enter in the prompt to use the current directory)
- `--assistants <list>`: comma-separated assistants, e.g. `cursor,claude`
- `--dry-run`: preview generation or update changes without writing; for `update`, exits `2` when changes or conflicts are pending
- `--force`: overwrite generated managed baselines; in `update` mode protected files remain preserved and MCP JSON / Claude settings are merged, not replaced (see the ownership rules above)
- `--yes` / `-y`: non-interactive defaults (existing **`setup-cursor-assistant.md`** / **`setup-claude-assistant.md`** are always replaced; existing **`.cursor/mcp.json`** / **`.mcp.json`** are left unchanged unless you pass **`--force`**)
- `--json`: emit the run as a single machine-readable JSON document on stdout instead of the human summary; see [Machine-readable output](#machine-readable-output-json)
- `--mcp-playwright <yes|no>`: **deprecated and ignored.** Playwright MCP is no longer generated; browser automation uses the Playwright CLI. The flag is still accepted so existing commands keep working, and prints a warning on stderr. On `update`, the `playwright` server an older release wrote is removed from the MCP files and Claude settings (see the ownership rules above)
- `--mcp-figma <yes|no>`: add or skip Figma MCP files for the assistants you selected (`yes` / `true` / `1` / `figma` / `on` vs `none` / `no` / `false` / `0` / `off`). **Cursor** → **`.cursor/mcp.json`**; **Claude** → **`.mcp.json`** at repo root. With **`--yes`** and no flag, defaults to **no** (requires `FIGMA_API_KEY`)
- `--qa-ai-rules <yes|no>`: after generating files, run **`@metricinsights/qa-ai-rules`** setup in the target repo (`yes` / `true` / `1` / `on` vs `none` / `no` / `false` / `0` / `off`). Uses **`--cursor`** / **`--claude`** flags aligned with **`--assistants`**. The CLI picks a one-shot runner from **`package.json`** **`packageManager`** (Corepack) and lockfiles: **`pnpm dlx`** when pnpm, **`yarn dlx`** for Yarn 2+ / Berry layout, **`bunx`** when Bun, otherwise **`npx`**. Skipped when **`--dry-run`** is set. If there is no **`package.json`** in the target, the CLI skips with a warning (you can run **`npx`** / **`pnpm dlx`** / **`yarn dlx`** / **`bunx`** manually). With **`--yes`** and no flag, defaults to **no**

## Machine-readable output (`--json`)

`--json` replaces the human summary with a single JSON document on stdout. Everything else the CLI
would print — banners, the prose summary, skip warnings — is suppressed or goes to stderr, so stdout
always parses as one document, including when the run fails. Exit codes are unchanged, and the
payload repeats the exit code in its own `exitCode` field so a caller can read either one.

Automated callers should pin against `schemaVersion` (currently `1`) rather than parsing the human
summary, which is free to change at any time.

```bash
npx --yes --package="$CA_AI_TOOLS_SETUP_TGZ" ca-ai-tools-setup check ../my-app --json
```

```json
{
  "schemaVersion": 1,
  "ok": true,
  "mode": "check",
  "targetDir": "/repos/my-app",
  "cli": { "package": "@metricinsights/ca-ai-tools-setup", "version": "0.1.0", "…": "…" },
  "previousVersion": "0.1.0",
  "desiredVersion": "0.2.0",
  "hasChanges": true,
  "hasConflicts": false,
  "counts": { "created": 1, "updated": 3, "conflicts": 0, "…": 0 },
  "created": [".cursor/rules/code-style.mdc"],
  "conflicts": [],
  "plan": [{ "path": ".cursor/rules/code-style.mdc", "ownership": "managed", "state": "missing", "action": "create" }],
  "exitCode": 2
}
```

`plan` carries each file's classification only — never its content, which the caller already has in
the working tree. The named buckets (`created`, `updated`, `merged`, `removed`, `preserved`,
`unchanged`, `conflicts`, `missing`, `outdated`, `orphaned`) hold the same paths grouped for
convenience.

A failure is reported the same way, with a stable `error.code` so a caller can branch without
matching on prose:

```json
{
  "schemaVersion": 1,
  "ok": false,
  "mode": "check",
  "error": { "code": "setup-metadata-missing", "message": "…" },
  "exitCode": 1
}
```

`setup-metadata-missing` means the repository has no tracked setup yet — install rather than update.
`setup-metadata-invalid` means the metadata file exists but could not be read. Anything else is
`unknown`.

Because `generate` prompts, `--json` requires `--yes` in that mode; `check` and `update` never prompt
and need no extra flag.

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
