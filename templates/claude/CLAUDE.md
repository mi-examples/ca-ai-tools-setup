# Claude Code Instructions

This repository is a **Metric Insights Portal Page / Custom App** (see `pp-dev.config` and
`@metricinsights/pp-dev`). `setup-claude-assistant.md` is the bootstrap playbook for a new machine.

Keep this file for what is specific to this repository. The shared rules and workflows are generated files,
kept current by `ca-ai-tools-setup`:

- **Rules** — `.claude/rules/` (loaded automatically; `code-style` and `frontend-architecture` apply when you
  work on files under `src/`).
- **Skills** — `.claude/skills/` (run one as `/<name>`, or it is picked up from its description).
- **Subagents** — `.claude/agents/` (`qa-tester`, `ui-verifier`, `linear-reporter`); `AGENTS.md` lists them.

## Working here

- Check `.assistant-setup/SETUP_STATUS.md` before setup-sensitive work; the `assistant-setup-health` rule has
  the steps. Never run `update` or `--force` without explicit developer approval.
- Read `AGENTS.md` and `README.md` before non-trivial code changes.
- Prefer `pp-dev.config` and `package.json` scripts for dev commands (`npm run dev`, `npx pp-dev`, or
  `npx pp-dev next` when applicable).
- Local app URL is `http://localhost:<port>`; default `3000`, then the next free port if busy. Resolve the
  port from config, server output, or browser.
- Authentication and API quirks belong in `.dev-environment.md` or `.env`. Never invent or commit secrets.
- Search before creating components, hooks, API modules, test docs, or agent files.
- Do not revert user changes unless explicitly requested.

## Which skill for what

| Task | Skill |
| --- | --- |
| A Linear issue key or URL, "start working with task" | `start-working-with-task` (routes by issue state; see the `linear-task-gates` rule) |
| Development from a Linear issue | `ai-development` |
| Full QA for a Linear issue | `testing-with-linear` |
| QA without Linear | `testing-flow` |
| Quick UI check | `ui-check-simple` |
| Publishing QA results to Linear | `linear-report` |
| Test cases and bug reports | `test-documentation` |
| Browser automation and UI verification | `playwright-cli` |
| Commit messages | `commit-convention` |
| After a commit or merge on a Linear-issue branch | `linear-merge-notification` |
| Credentials and instance URLs | `portal-env-credentials` |
| Customer-facing documentation | `customer-app-docs` |
<!-- only:figma -->
| Figma design to code | `figma-implementation` |
<!-- /only -->

Customer-facing documentation is written **only when a person asks for it** — never on your own initiative,
and never gated on how finished the work looks. Never send or publish a customer document; hand back the file
paths.

## Claude Code settings

- `.claude/settings.json` is the shared Claude Code config (permissions, hooks, `env`).
- Use `.claude/settings.local.json` for personal overrides.
