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

This package is published to **GitHub Packages** as a private, prebuilt package. A release tag such as
**`v0.1.0`** must match `package.json`; release CI validates the source, smoke-tests the packed artifact, and
publishes normal versions under **`stable`** and prereleases under **`next`**.

Developers who run the installer need GitHub Packages read access. Configure npm once:

```ini
@metricinsights:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Yarn 2+ users can configure the same access in their user-level `.yarnrc.yml`:

```yaml
npmScopes:
  metricinsights:
    npmRegistryServer: https://npm.pkg.github.com
    npmAlwaysAuth: true
    npmAuthToken: '${GITHUB_PACKAGES_TOKEN}'
```

Use a classic PAT with `read:packages` (and repository access when GitHub requires it), authorize SSO when
applicable, and expose it as `GITHUB_PACKAGES_TOKEN`. Do not commit the token.

Release CI uses the repository secret `METRICINSIGHTS_PACKAGES_TOKEN`; it must have `write:packages` access to
the `@metricinsights` package scope because the source repository is owned by the separate `mi-examples` account.
The `package-release` GitHub environment should require an internal reviewer before the publish job can access
that secret.

To release, merge a reviewed version bump, create and push the matching `vX.Y.Z` tag, then approve the protected
publish job. Roll back a target repository by running `check` and `update` with the previous exact package
version and reviewing the reverse diff.

Use **`@stable`** for the current team release or an exact version such as **`@0.1.0`** for reproducible setup
and update PRs. The package contains prebuilt **`dist/**`** plus **`templates/**`**; developer machines do not
compile TypeScript during installation.

## Usage

Binary name: **`ca-ai-tools-setup`**. Package spec: **`@metricinsights/ca-ai-tools-setup@stable`** (replace
`stable` with an exact version for a reviewable update). Below, **`TARGET`** is another repo path; omit
**`--target`** to use the **current directory**.

The subsections **Interactive** through **Local clone** show **`npx`** invocations; swap the
**`npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup`** prefix for
**`pnpm --package=… exec`**, **`yarn dlx …`**, or **`bunx …`** as below.

### Fetching the CLI with pnpm, Yarn, or Bun

One-shot install + run from GitHub (equivalent to **`npx -p … ca-ai-tools-setup`**):

```bash
pnpm --package=@metricinsights/ca-ai-tools-setup@stable exec ca-ai-tools-setup --assistants cursor,claude --yes
```

```bash
yarn dlx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes
```

```bash
bunx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes
```

- **pnpm:** **`pnpm exec`** runs the **`bin`** from the temporary **`--package`** install; add **`--`** before **`ca-ai-tools-setup`** only if your shell swallows flags meant for the CLI.
- **Yarn:** requires **Yarn 2+** (**`yarn dlx`**). **Yarn 1 (Classic)** has no equivalent — use **`npx`** or **`pnpm exec`** for GitHub one-shots.
- **Bun:** **`bunx`** (same idea as **`npx`**). You can also try **`bun x …`** if you standardize on Bun’s CLI.

### Interactive (prompts for assistants, MCP, QA rules)

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup
```

```bash
pnpm --package=@metricinsights/ca-ai-tools-setup@stable exec ca-ai-tools-setup
```

```bash
yarn dlx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup
```

```bash
bunx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup
```

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app
```

```bash
pnpm --package=@metricinsights/ca-ai-tools-setup@stable exec ca-ai-tools-setup --target ../my-app
```

```bash
yarn dlx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app
```

```bash
bunx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app
```

### Non-interactive — defaults (`--yes`)

**Selects** both assistants, Playwright MCP **on**, Figma MCP **off**, QA AI rules **off**. Emits **`.cursor/mcp.json`** / **`.mcp.json`** when MCP is enabled for the selected assistants.

**npm:**

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes
```

**pnpm / Yarn / Bun:** use the same shape as in **Fetching the CLI with pnpm, Yarn, or Bun** (same flags: **`--assistants cursor,claude --yes`**). Example with **`--target`:**

```bash
pnpm --package=@metricinsights/ca-ai-tools-setup@stable exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
yarn dlx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
bunx @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes
```

### Preview only (`--dry-run`)

No files written; QA AI rules init is **not** executed.

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

```bash
pnpm --package=@metricinsights/ca-ai-tools-setup@stable exec ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --dry-run
```

### One assistant only

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor --yes
```

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants claude --yes
```

### MCP — disable Playwright or enable Figma

Disable Playwright MCP (no **`.cursor/mcp.json`** / **`.mcp.json`** from this run unless Figma is on):

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright none
```

Enable **both** Playwright and Figma MCP (requires **`FIGMA_API_KEY`** where Figma is used):

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes --mcp-playwright yes --mcp-figma yes
```

### QA AI rules (`@metricinsights/qa-ai-rules`)

After generating files, runs **`init`** for the package using the detected runner (**`pnpm dlx`**, **`yarn dlx`**, **`bunx`**, or **`npx`**) with **`--cursor`** / **`--claude`** aligned to **`--assistants`**. Needs **`package.json`** in the target repo.

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --assistants cursor,claude --yes --qa-ai-rules yes
```

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor --yes --qa-ai-rules yes
```

### Overwrite existing generated files

```bash
npx -p @metricinsights/ca-ai-tools-setup@stable ca-ai-tools-setup --target ../my-app --assistants cursor,claude --yes --force
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

Use an exact package version, inspect the complete generated diff, run the target repository's validation, and
open a setup PR:

```bash
npx -p @metricinsights/ca-ai-tools-setup@0.1.0 ca-ai-tools-setup \
  --target ../my-app --assistants cursor,claude --yes
```

### Check for changes

`check` is read-only. It returns exit code `0` when the tracked setup is synchronized, `2` when files or metadata
need attention, and `1` for invalid input or I/O failures:

```bash
npx -p @metricinsights/ca-ai-tools-setup@0.2.0 ca-ai-tools-setup check ../my-app
```

### Prepare an update PR

Run a preview, apply the update, review `git diff`, resolve any reported protected-file conflicts, validate the
target repository, and open a normal PR:

```bash
npx -p @metricinsights/ca-ai-tools-setup@0.2.0 ca-ai-tools-setup update ../my-app --dry-run
npx -p @metricinsights/ca-ai-tools-setup@0.2.0 ca-ai-tools-setup update ../my-app
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
- `--dry-run`: preview generation or update changes without writing
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
