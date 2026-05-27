---
name: testing-flow
description: End-to-end QA testing flow—generate test cases, execute via Playwright MCP, investigate bugs, produce local results. Linear is optional; falls back to user-provided context or codebase analysis. Use when running tests, testing a feature, or doing a full QA flow.
---

# Testing Flow (Full QA)

End-to-end QA testing: **context → test cases → Playwright MCP execution → bug investigation → local results**.

Depends on: **`test-documentation`** (TC and bug report format), **`playwright-mcp`** (MCP tools reference), optionally **`figma-implementation`** (design reference).

## 0. Known limitations & lessons learned

- **Dev server & auth** — sandbox permissions may block `npm run dev`; use `pp-dev.config.ts` proxy. Auth credentials come from `.env` role vars.
- **Always verify TC count.** Count TCs in `test-cases.md` and pass the exact list (TC-01..TC-N) to the browser agent — it may silently skip TCs otherwise.
- **TC generation must stay within scope.** Do not elevate implementation details into hard pass/fail criteria. Expected results should match the **acceptance criteria** from the provided context.
- **Multi-user testing needs explicit session switching.** Group TCs by role to minimize logout/re-login overhead.
- **Always read issue comments before generating TCs.** Comments may contain revised acceptance criteria, product decisions, dev implementation details, review feedback, or verification URLs that override the original issue description. If comments contradict the description, **the latest dev/review comment takes precedence**.

---

## 1. Context source

Linear is **optional**. Use whichever is available:

| Source | How |
|--------|-----|
| Linear issue | Read **`linear-workflow`** skill → `linear-cli i get <ISSUE_KEY>` for acceptance criteria |
| Linear comments | **Always fetch** via GraphQL `issue.comments` — may contain revised criteria, product decisions, dev notes, or verification URLs that override the description |
| User-provided | Description, acceptance criteria, or screenshots from the conversation |
| Figma design | Optional. Figma link or node ID — fetch via **`figma-implementation`** skill to extract expected layout, spacing, colors, typography for visual verification |
| Codebase | Analyze `src/components/`, `src/pages/`, SCSS modules, `src/types/`, `src/api/` |

If no explicit context is given, analyze the codebase to identify testable behavior. When a Figma link is provided, include visual accuracy checks in the generated test cases. When Linear comments are present, reconcile them with the issue description — **latest dev/review comments take precedence** over the original description.

## 2. Setup

### Folder structure

```
test-documentation/
└── <CONTEXT_KEY>/
    ├── test-cases.md      # TC-01..TC-N per test-documentation skill
    ├── bugs.md            # BUG-01..BUG-N per test-documentation bug rules
    └── screenshots/       # PNGs from Playwright MCP
```

`<CONTEXT_KEY>` is the Linear issue key (e.g. `PP-3388`) or a descriptive slug when no issue exists.

### Environment & auth

Read `.env` (gitignored) for target environment. **Never hardcode credentials.**

Three QA roles are available. Actual usernames and passwords come from `.env` — never hardcode them in skills or test cases.

| Role | Username var | Password var |
|------|-------------|-------------|
| **Regular** | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| **Power** | `QA_USER_POWER` | `QA_PASS_POWER` |
| **Admin** | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

### Dev server

```bash
npm run dev
```

Proxy config in `pp-dev.config.ts`. Default port 3000 (then 3001, 3002, … if busy).

## 3. Generate test cases

Generate per **`test-documentation`** skill. Additionally analyze source code for behavior not covered by acceptance criteria.

## 4. Execute via Playwright MCP

For tools reference, patterns, and limitations see **`playwright-mcp`** skill.

### Authentication (form login)

```
1. playwright_navigate -> BASE_URL or PAGE_URL from .env
2. Page redirects to /auth -> playwright_fill with QA_USER_<ROLE>, QA_PASS_<ROLE>
3. playwright_click "Sign In"
4. playwright_screenshot -> verify authenticated state
```

### Test execution loop

For each TC: **navigate** → **perform steps** → **verify** via `playwright_screenshot` + `playwright_evaluate` → **record** pass/fail/blocked.

## 5. Bug investigation

When a test fails:

1. `playwright_screenshot` the current state
2. Check URL — confirm expected route
3. `playwright_console_logs` for JS errors
4. Trace to source — grep the error in `src/`
5. `playwright_evaluate` with `fetch()` to verify API data
6. Isolate: data / rendering / routing / state management

## 6. Bug report format

Write to `test-documentation/<CONTEXT_KEY>/bugs.md` per the bug report rule referenced in **`test-documentation`**:

```markdown
### BUG-01 -- [Severity] Short description
**Severity:** Critical / Major / Minor / Low
**Related TC:** TC-01, TC-04
**Environment:** <URL>
**User role:** Admin

**Steps to reproduce:**
1. ...

**Expected:** ...
**Actual:** ...

**Console errors:** `...`
**Root cause (optional):** file references + explanation
**Screenshot:** `screenshots/<filename>.png`
```

| Severity | Criteria |
|----------|----------|
| **Critical** | App crashes, data loss, feature blocked, security |
| **Major** | Partially broken, no workaround |
| **Minor** | Cosmetic, workaround exists |
| **Low** | Enhancement, edge case |
