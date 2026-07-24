---
name: playwright-cli
description: Playwright Agent CLI reference for browser automation—token-efficient command-line alternative to the Playwright MCP server. Command catalog, snapshot/ref targeting, Portal Page dev-server + role login, and debugging. Use for UI checks, manual QA execution, or browser automation when you prefer the CLI over MCP.
---

# Browser Automation with Playwright Agent CLI

Token-efficient, command-line alternative to the **`playwright-mcp`** skill. Drives a real
browser through Bash commands instead of MCP tools. Concise CLI output keeps large tool
schemas out of the model context, so this is the **preferred** option for browser work when
low token cost matters. The MCP path (`playwright-mcp`) stays fully available — pick one per
task; both reach the same browser.

Reference: https://playwright.dev/agent-cli/introduction

## Why CLI vs MCP

| | `playwright-cli` (this skill) | `playwright-mcp` skill |
|-|-------------------------------|------------------------|
| Transport | Bash (`npx playwright-cli ...`) | MCP tools (`playwright_*`) |
| Token cost | Low — concise text output, no tool schemas loaded | Higher — snapshots + tool schemas in context |
| Setup | Committed skill + `@playwright/cli` devDependency; `npm install` only | `.mcp.json` / `.cursor/mcp.json` + MCP reload |
| Best for | Most UI checks and QA, especially long sessions | Existing MCP flows, or when MCP tools are already loaded |

## Install (universal, not per-developer)

The CLI ships **with the repository** so every team member gets it from a plain
`npm install` — no global install and no per-machine MCP config:

1. `@playwright/cli` is a **pinned devDependency** in `package.json`. If it is missing, add it:
   ```bash
   npm install --save-dev @playwright/cli@0.1.17
   ```
2. Invoke it as **`npx playwright-cli ...`** — this resolves the pinned local version. A global
   install is optional. If no local version is present, `npx -y @playwright/cli@0.1.17 ...` works
   as a fallback.
3. Confirm it resolves: `npx playwright-cli --version`.
4. Ensure the CLI workspace state is **gitignored** (never commit it):
   ```
   .playwright/       # CLI workspace state (sessions, browser profiles)
   .playwright-cli/   # page snapshots, console logs
   ```

## Quick start

```bash
npx playwright-cli open http://localhost:3000   # open a browser at the dev server
npx playwright-cli snapshot                      # accessibility snapshot with element refs (e1, e2, ...)
npx playwright-cli fill e1 "user@example.com"    # interact using refs from the snapshot
npx playwright-cli click e3
npx playwright-cli console                        # read console logs
npx playwright-cli close                          # release the browser
```

After every command the CLI prints the current page URL, title, and a snapshot reference —
use it to verify the action and pick the next `eN` ref. Prefer `snapshot`/`find` over
`screenshot`: snapshots are cheaper and give precise refs.

## Command reference

### Core interaction

```bash
npx playwright-cli open                 # open a blank browser
npx playwright-cli open http://localhost:3000
npx playwright-cli goto <url>
npx playwright-cli snapshot             # full accessibility tree with refs
npx playwright-cli snapshot "#main"     # scope to a selector
npx playwright-cli snapshot --depth=4   # limit depth for efficiency
npx playwright-cli find "Sign in"       # grep the snapshot for text/regex (returns matches + context)
npx playwright-cli find --regex "/sign (in|up)/i"
npx playwright-cli click e3
npx playwright-cli dblclick e7
npx playwright-cli fill e5 "value" --submit   # --submit presses Enter after filling
npx playwright-cli type "search query"
npx playwright-cli press Enter
npx playwright-cli select e9 "option-value"
npx playwright-cli check e12
npx playwright-cli uncheck e12
npx playwright-cli hover e4
npx playwright-cli drag e2 e8
npx playwright-cli upload ./document.pdf
npx playwright-cli dialog-accept
npx playwright-cli dialog-dismiss
npx playwright-cli resize 1920 1080
npx playwright-cli close
```

### Targeting elements

Default to **refs** from the snapshot (`e5`). CSS selectors and Playwright locators also work:

```bash
npx playwright-cli click e15
npx playwright-cli click "#main > button.submit"
npx playwright-cli click "getByRole('button', { name: 'Submit' })"
npx playwright-cli click "getByTestId('submit-button')"
```

### Navigation & keyboard

```bash
npx playwright-cli go-back
npx playwright-cli go-forward
npx playwright-cli reload
npx playwright-cli press ArrowDown
npx playwright-cli keydown Shift
npx playwright-cli keyup Shift
```

### Inspection / evaluation

```bash
npx playwright-cli eval "document.title"
npx playwright-cli eval "el => el.textContent" e5
npx playwright-cli eval "el => getComputedStyle(el).fill" "svg path"   # computed styles for Figma fidelity checks
npx playwright-cli console                 # all console logs
npx playwright-cli console warning         # filter by level (error/warning/...)
npx playwright-cli requests                # network requests
npx playwright-cli request 5               # inspect one request/response body
```

The CLI `eval` argument is a JS expression or an `el => ...` arrow function scoped to a
ref/selector — no IIFE wrapper is needed (unlike the MCP `playwright_evaluate`).

### Screenshots & PDF

```bash
npx playwright-cli screenshot                               # whole page
npx playwright-cli screenshot e5                            # one element
npx playwright-cli screenshot --filename=after-login.png    # save with a name
npx playwright-cli screenshot --hires
npx playwright-cli pdf --filename=page.pdf
```

Save QA evidence under `test-documentation/<CONTEXT_KEY>/screenshots/`. For Linear comments,
local paths are not enough — upload to Linear Cloud first (see the `linear-report` skill /
`linear-qa-report` workflow).

### Viewport / device (responsive checks)

```bash
npx playwright-cli resize 1280 800
npx playwright-cli open --mobile              # generic mobile emulation (smaller, cheaper snapshots)
npx playwright-cli open --device="iPhone 15"
```

### Tabs & storage

```bash
npx playwright-cli tab-list
npx playwright-cli tab-new <url>
npx playwright-cli tab-select 0
npx playwright-cli tab-close 2

npx playwright-cli state-save auth.json       # persist cookies + storage
npx playwright-cli state-load auth.json        # reuse a logged-in session
npx playwright-cli cookie-list
npx playwright-cli localstorage-get theme
```

### Named sessions

Use `-s=<name>` to run isolated parallel sessions (e.g. across worktrees) without collisions:

```bash
npx playwright-cli -s=admin open http://localhost:3000
npx playwright-cli -s=admin snapshot
npx playwright-cli -s=admin close
npx playwright-cli list          # list active sessions
npx playwright-cli close-all
```

### Raw / JSON output

```bash
npx playwright-cli --raw eval "JSON.stringify(performance.timing)" | jq .
npx playwright-cli --raw snapshot > before.yml
npx playwright-cli list --json
```

## Portal Page usage

This repo targets a Metric Insights **Portal Page / Custom App**. Same environment as the
`ui-check-simple` / `testing-flow` flows — only the automation transport changes.

### 1. Dev server

```bash
npm run dev
```

Proxy config in `pp-dev.config.ts`. Default port **3000** (then 3001, 3002, … if busy) —
resolve the real port from config, server logs, or the browser.

### 2. Auth (form login)

Read `.env` for credentials. Three abstract roles — actual usernames come from env vars:

| Role | Username var | Password var |
|------|--------------|--------------|
| **Regular** | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| **Power** | `QA_USER_POWER` | `QA_PASS_POWER` |
| **Admin** | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

Use **Admin** by default unless a specific role is requested. Never paste secrets into chat.

```bash
npx playwright-cli open http://localhost:3000        # redirects to /auth (or /login)
npx playwright-cli snapshot                           # get refs for the login form
npx playwright-cli fill <user-ref> "$QA_USER_ADMIN"
npx playwright-cli fill <pass-ref> "$QA_PASS_ADMIN" --submit
npx playwright-cli snapshot                           # verify authenticated state
```

Reuse the session across checks with `state-save auth.json` / `state-load auth.json` to skip
repeated logins.

### 3. Verification flow

1. Navigate to the target page (`goto`), then `snapshot`.
2. Compare against the acceptance criteria, reference screenshot, or Figma node (fetch node
   data via Figma MCP rules; check layout, spacing, colors, typography with `eval` computed
   styles).
3. `console` — check for `TypeError`, `Error`, `Uncaught`.
4. `requests` / `request <n>` — verify API data behind the UI.
5. Test responsive behavior with `resize` or `--device`.
6. `screenshot --filename=...` for evidence when useful.

### 4. Cleanup

Always `npx playwright-cli close` (or `close-all`) when finished, and never commit
`.playwright/` or `.playwright-cli/`.

## Known limitations

- **New tabs from `window.open(url, "_blank")`** may not register automatically in a sandboxed
  context. Verify with `tab-list`, or intercept via `eval`:
  ```bash
  npx playwright-cli eval "() => { let c=null; const o=window.open; window.open=(u,t)=>{c={u,t};return o.apply(window,arguments)}; document.querySelector('[class*=\"edit\"]').click(); window.open=o; return c; }"
  ```
  A returned `{ u: "...", t: "_blank" }` means the app is correct.
- **Do not commit workspace state** (`.playwright/`, `.playwright-cli/`).
