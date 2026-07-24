# Playwright Agent CLI Workflow

Token-efficient, command-line alternative to `./.claude/workflows/playwright-mcp.md` for
browser automation, UI verification, manual QA execution, and debugging UI failures. Drives a
real browser through Bash (`npx playwright-cli ...`) instead of MCP tools.

**Both options stay available — pick one per task.** The CLI is preferred when token cost
matters (concise output, no MCP tool schemas loaded); the MCP path remains fully supported.

Reference: https://playwright.dev/agent-cli/introduction

## Install (universal, not per-developer)

The CLI ships with the repository so every team member gets it from `npm install` — no global
install and no per-machine MCP config:

- `@playwright/cli` is a **pinned devDependency**. If missing: `npm install --save-dev @playwright/cli@0.1.17`.
- Invoke as **`npx playwright-cli ...`** (resolves the pinned local version; `npx -y @playwright/cli@0.1.17 ...` is a fallback).
- Gitignore the workspace state — never commit `.playwright/` or `.playwright-cli/`.

## Core commands

```bash
npx playwright-cli open http://localhost:3000   # open browser at the dev server
npx playwright-cli goto <url>
npx playwright-cli snapshot                      # accessibility tree with element refs (e1, e2, ...)
npx playwright-cli find "Sign in"                # grep the snapshot for text/regex
npx playwright-cli click e3
npx playwright-cli fill e5 "value" --submit      # --submit presses Enter
npx playwright-cli select e9 "option"
npx playwright-cli hover e4
npx playwright-cli press Enter
npx playwright-cli resize 1280 800               # or: open --mobile / --device="iPhone 15"
npx playwright-cli eval "el => getComputedStyle(el).fill" "svg path"
npx playwright-cli console                       # console logs (append a level: console warning)
npx playwright-cli requests                      # network requests; request <n> for one body
npx playwright-cli screenshot --filename=state.png
npx playwright-cli close
```

Default to **refs** from the snapshot (`e5`); CSS selectors and Playwright locators
(`getByRole(...)`, `getByTestId(...)`) also work. After each command the CLI prints the page
URL, title, and a snapshot reference — use it to verify and pick the next ref. Prefer
`snapshot`/`find` over `screenshot`: snapshots are cheaper and give precise refs.

The `eval` argument is a JS expression or an `el => ...` arrow function scoped to a
ref/selector — no IIFE wrapper needed (unlike the MCP `playwright_evaluate`).

## Portal Page flow

Same environment as `./.claude/workflows/ui-check-simple.md` — only the transport changes.

1. **Dev server** — `npm run dev` (proxy in `pp-dev.config.ts`; default port 3000, then next free).
2. **Auth (form login)** — read `.env`; 
   ```bash
   npx playwright-cli open http://localhost:3000     # redirects to /auth (or /login)
   npx playwright-cli snapshot
   npx playwright-cli fill <user-ref> "$QA_USER_ADMIN"
   npx playwright-cli fill <pass-ref> "$QA_PASS_ADMIN" --submit
   ```

   Reuse a logged-in session with `state-save auth.json` / `state-load auth.json`.
3. **Verify** — `goto` the target, `snapshot`, compare against acceptance criteria / Figma /
   reference; `console` for JS errors; `requests` for API data; `resize` for responsive checks.
4. **Evidence** — `screenshot --filename=...` saved under
   `test-documentation/<CONTEXT_KEY>/screenshots/`. For Linear comments, upload to Linear Cloud
   first — see `./.claude/workflows/linear-report.md`.
5. **Cleanup** — always `npx playwright-cli close` (or `close-all`) when done.

## Parallel / worktree sessions

Use `-s=<name>` to run isolated sessions without collisions:

```bash
npx playwright-cli -s=admin open http://localhost:3000
npx playwright-cli -s=admin snapshot
npx playwright-cli list
npx playwright-cli close-all
```

## Failure investigation

When a browser check fails:

1. `snapshot` (and `screenshot` if visual evidence helps) the failing state.
2. Confirm the current URL from the command output.
3. `console warning` / `console` — filter for `TypeError`, `Error`, `Uncaught`.
4. Inspect around the element with `find` / `eval`.
5. Verify API data with `requests` / `request <n>` or `eval` on a `fetch`.
6. Trace the likely UI, routing, data, or state source in the codebase.

## Known limitation: new tabs

`window.open(url, "_blank")` may not register automatically in a sandboxed context. Verify with
`tab-list`, or intercept the call via `eval`:

```bash
npx playwright-cli eval "() => { let c=null; const o=window.open; window.open=(u,t)=>{c={u,t};return o.apply(window,arguments)}; document.querySelector('[class*=\"edit\"]').click(); window.open=o; return c; }"
```

A returned URL + `_blank` means the app behavior is correct.
