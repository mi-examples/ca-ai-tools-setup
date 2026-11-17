# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo does

`ca-ai-tools-setup` is a private CLI tool that bootstraps AI assistant setup files (Cursor and Claude Code) into target repositories. From the templates in `templates/` it generates:

- rules: `.cursor/rules/*.mdc` for Cursor, `.claude/rules/*.md` for Claude Code — both rendered from one source per rule;
- skills in **one** folder: `.claude/skills/` when Claude Code is selected (Cursor reads it too), otherwise `.cursor/skills/`;
- for Claude Code: `CLAUDE.md`, `.claude/agents/`, `.claude/commands/`, `.claude/settings.json`;
- for Cursor: `.cursorignore`;
- MCP JSON (`.mcp.json`, `.cursor/mcp.json`) only when Figma MCP is selected;
- `setup-cursor-assistant.md` / `setup-claude-assistant.md`, `AGENTS.md`, `.gitignore` entries and `.assistant-setup/*`.

`README.md` has the full list and the ownership rules.

## Commands

```bash
npm install        # installs deps and auto-builds dist/ via prepare script
npm run build      # compile src/ → dist/ (tsconfig.build.json)
npm run typecheck  # tsc --noEmit over src/ and tests/
npm run lint       # ESLint, max-warnings 0
npm run lint:fix   # auto-fix lint issues
npm run format     # Prettier
npm test           # npm run build && tsx --test tests/**/*.test.ts
npm run test:package  # pack the tarball and generate a setup from it
```

Run a single test file:

```bash
tsx --test tests/generator.test.ts
```

Run the CLI locally (after `npm install`):

```bash
node dist/cli.js --target ../some-other-repo --assistants cursor,claude --dry-run
```

## Architecture

**Data flow:**

- Initial setup: `src/cli.ts` → parses args/prompts → `src/generator.ts:generateSetup()` → generators → writes files to the target directory; optionally `src/qa-ai-rules-setup.ts` runs `npx @metricinsights/qa-ai-rules init` after writes when `--qa-ai-rules` is enabled (not in `--dry-run`).
- `check` / `update`: `src/cli.ts` → `src/reconcile.ts` compares the files `getGeneratedFiles()` would write with the target directory and the hashes recorded in `.assistant-setup/ca-ai-tools-setup.json`.

**Key source files:**

- `src/cli.ts` — entry point; arg parsing (`minimist`), interactive prompts (`@clack/prompts`), orchestrates generation, `check` and `update`
- `src/generator.ts` — `getGeneratedFiles()` composes the full file list; `generateSetup()` writes it (skip/overwrite/merge per file) and removes known obsolete paths (`REMOVABLE_LEGACY_SETUP_PATHS`, `retiredSetupPaths()`)
- `src/reconcile.ts` — `check` / `update`: per-file plan from ownership (managed / protected / structured) and recorded hashes; conflicts block the whole update
- `src/setup-metadata.ts` — the metadata file (schema `METADATA_VERSION`), per-file ownership, and the text of `.assistant-setup/SETUP_STATUS.md`
- `src/generators/rules.ts` — renders each `templates/rules/*.md` into a Cursor rule and a Claude rule
- `src/generators/skills.ts` — copies `templates/skills/<name>/**` into the one skills folder; the Figma skills only with Figma MCP
- `src/generators/claude.ts` — files only Claude Code reads (`CLAUDE.md`, `.claude/settings.json`, agents, commands, `setup-claude-assistant.md`, `.mcp.json`)
- `src/generators/cursor.ts` — files only Cursor reads (`setup-cursor-assistant.md`, `.cursorignore`, `.cursor/mcp.json`)
- `src/generators/mcp.ts` — MCP JSON config objects; also keeps the definitions of servers that are no longer generated, so `update` can remove them
- `src/mcp-json-merge.ts` — merges existing MCP JSON, Claude settings, `AGENTS.md` and `.gitignore` with generated content, and prunes retired generated entries
- `src/cli-json.ts` — the `--json` payload contract (`CLI_JSON_SCHEMA_VERSION`, currently `1`) and the `CliError` codes automated callers branch on. Bump the schema version on any breaking shape change: `mi-pp/repo-standards`' org-wide rollout (PP-4239) pins against it instead of parsing the prose summary from `cli-summary.ts`
- `src/previous-setup.ts` — reads `.assistant-setup/ca-ai-tools-setup.json` to pre-fill interactive prompts on re-runs (including QA AI rules preference)
- `src/qa-ai-rules-setup.ts` / `src/qa-ai-rules-choice.ts` — optional `@metricinsights/qa-ai-rules` post-setup in the target repo
- `src/package-manager.ts` — detects npm / pnpm / Yarn (Berry vs classic) / Bun to choose `npx`, `pnpm dlx`, `yarn dlx`, or `bunx`
- `templates/` — all markdown and JSON templates; read at runtime by `src/templates.ts`

**Template conventions (`src/templates.ts`):**

- `{{NAME}}` placeholders: `readTemplate()` fills in `{{PLAYWRIGHT_CLI_VERSION}}` and `{{MIN_NODE_MAJOR}}` from `src/constants.ts` — never write those versions into a template literally. `{{SKILLS_ROOT}}` is the folder a skill is generated into; a skill uses it wherever it names its own files by full path. An unknown upper-case placeholder fails generation.
- Blocks: `<!-- only:cursor -->`, `<!-- only:claude -->`, `<!-- only:cursor-only -->`, `<!-- only:figma -->`, `<!-- only:no-figma -->` … `<!-- /only -->` keep a part of a template for one selection. Use them whenever a template would otherwise name a file or skill that some selection does not generate — `tests/templates-contract.test.ts` checks every selection for such references.
- A rule source has frontmatter `description` plus `apply: always` or a `paths:` list.

**File ownership (details in `README.md`, "Update ownership rules"):**

- Managed (rules, skills, agents, commands, setup assistant documents): follow their template; a locally edited one is a conflict that `update --force` replaces
- Protected (`CLAUDE.md`, `.cursorignore`, `.dev-environment.md`, page context): follow their template only while untouched; once edited they are never overwritten, and a newer template goes to `.assistant-setup/pending-updates/`
- Structured (`AGENTS.md`, `.gitignore`, MCP JSON, `.claude/settings.json`): merged, never replaced, once they hold repository content — including with `update --force`
- Plain generation (no `check`/`update`): existing files are skipped unless `--force`; setup assistant documents are always refreshed; existing MCP JSON gets an interactive Skip/Merge/Overwrite prompt, is left unchanged with `--yes`, and is replaced with `--force`

## Testing

Changes under `templates/skills/customer-app-docs/**` are also scored against
`evals/customer-app-docs/` (a golden document + its ledgers, semantic comparison by subagent) before
shipping — see that README for the metrics and the current status.

Tests use Node's built-in test runner via `tsx`. The build step compiles templates access; tests run against `dist/`. `generator.test.ts` covers file-generation combinations (skip/merge/overwrite, legacy cleanup, MCP inclusion), `reconcile.test.ts` covers `check` / `update`, and `templates-contract.test.ts` checks the generated content itself.

## Distribution

Published as a private GitHub package (`github:mi-examples/ca-ai-tools-setup`). `dist/` is built on `npm install` via the `prepare` script and is not committed to git.
