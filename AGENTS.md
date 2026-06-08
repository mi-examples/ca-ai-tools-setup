# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this repo does

`ca-ai-tools-setup` is a private CLI tool that bootstraps AI assistant setup files (Cursor and Claude Code) into target repositories. It generates `.cursorrules`, `.cursor/rules/*.mdc`, modular QA skills under `.cursor/skills/`, `CLAUDE.md`, `.claude/workflows/`, `.claude/settings.json`, `.mcp.json`, `LINEAR_CLI.md`, `AGENTS.md`, and related markdown docs from templates in `templates/`.

## Commands

```bash
npm install        # installs deps and auto-builds dist/ via prepare script
npm run build      # compile src/ → dist/ (tsconfig.build.json)
npm run typecheck  # tsc --noEmit over src/ and tests/
npm run lint       # ESLint, max-warnings 0
npm run lint:fix   # auto-fix lint issues
npm run format     # Prettier
npm test           # npm run build && tsx --test tests/**/*.test.ts
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

**Data flow:** `src/cli.ts` → parses args/prompts → `src/generator.ts:generateSetup()` → assistant-specific generators → writes files to target directory; optionally `src/qa-ai-rules-setup.ts` runs `npx @metricinsights/qa-ai-rules init` after writes when `--qa-ai-rules` is enabled (not in `--dry-run`).

**Key source files:**

- `src/cli.ts` — entry point; arg parsing (`minimist`), interactive prompts (`@clack/prompts`), orchestrates generation
- `src/generator.ts` — core file-write logic; handles skip/overwrite/merge per file; migrates/removes legacy paths; calls `generators/claude.ts` and `generators/cursor.ts`
- `src/generators/claude.ts` — builds `GeneratedFile` objects for Claude (CLAUDE.md, `.claude/settings.json`, workflows, commands, agents, `.mcp.json`, figma-mcp.md)
- `src/generators/cursor.ts` — builds `GeneratedFile` array for Cursor (`.cursorrules`, `.cursor/rules/*`, `.cursor/mcp.json`, prompts, skills)
- `src/generators/portal-page-ai.ts` — shared Cursor rules and Portal Page skills (QA modular stack, ai-development)
- `src/generators/mcp.ts` — constructs MCP JSON config objects
- `src/mcp-json-merge.ts` — union-merges existing `.mcp.json` / `.cursor/mcp.json` with generated config (generated names win on conflict)
- `src/previous-setup.ts` — reads `.cursor/ca-ai-tools-setup.json` or `.assistant-setup/ca-ai-tools-setup.json` to pre-fill interactive prompts on re-runs (including QA AI rules preference)
- `src/qa-ai-rules-setup.ts` / `src/qa-ai-rules-choice.ts` — optional `@metricinsights/qa-ai-rules` post-setup in the target repo
- `src/package-manager.ts` — detects npm / pnpm / Yarn (Berry vs classic) / Bun to choose `npx`, `pnpm dlx`, `yarn dlx`, or `bunx`
- `templates/` — all markdown and JSON templates; read at runtime by `src/templates.ts`

**File overwrite policy (generator.ts):**

- Setup assistant markdown files (`setup-cursor-assistant.md`, `setup-claude-assistant.md`) are always overwritten
- `CLAUDE.md`, `.cursorrules`, `.cursor/skills/*`, `.claude/skills/*`, `.claude/settings.json`, `AGENTS.md`, `.dev-environment.md` — created on first run, skipped on subsequent runs unless `--force`
- Obsolete legacy QA paths (`ai-testing`, `ui-check` skills, `.claude/workflows/ui-check.md`) are removed on every re-run via `REMOVABLE_LEGACY_SETUP_PATHS`
- MCP JSON files — interactive prompt (Skip/Merge/Overwrite) in interactive mode; left unchanged with `--yes`; fully replaced with `--force`

## Testing

Tests use Node's built-in test runner via `tsx`. The build step compiles templates access; tests run against `dist/`. `generator.test.ts` is the most comprehensive — it tests file-generation combinations including skip/merge/overwrite behavior, legacy cleanup, and MCP inclusion.

## Distribution

Published as a private GitHub package (`github:mi-examples/ca-ai-tools-setup`). `dist/` is built on `npm install` via the `prepare` script and is not committed to git.
