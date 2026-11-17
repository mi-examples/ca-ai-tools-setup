---
name: testing-flow
description: End-to-end QA testing flow—generate test cases, execute them in a browser with the Playwright CLI, investigate bugs, produce local results. Linear is optional; falls back to user-provided context or codebase analysis. Use when running tests, testing a feature, or doing a full QA flow.
---

# Testing Flow (Full QA)

End-to-end QA testing: **context → test cases → browser execution → bug investigation → local results**.

Depends on: **`test-documentation`** (TC and bug report format), **`playwright-cli`** (browser
automation).
<!-- only:figma -->
Optional: **`figma-implementation`** (design reference).
<!-- /only -->

## 0. Known limitations & lessons learned

- **Dev server & auth** — sandbox permissions may block `npm run dev`; use `pp-dev.config.ts` proxy. Sign in as the **`portal-env-credentials`** skill describes.
- **Always verify TC count.** Count TCs in `test-cases.md` and pass the exact list (TC-01..TC-N) to the browser agent — it may silently skip TCs otherwise.
- **TC generation must stay within scope.** Do not elevate implementation details into hard pass/fail criteria. Expected results should match the **acceptance criteria** from the provided context.
- **Multi-user testing needs explicit session switching.** Group TCs by role to minimize logout/re-login overhead.
- **Always read issue comments before generating TCs.** Comments may contain revised acceptance criteria, product decisions, dev implementation details, review feedback, or verification URLs that override the original issue description. If comments contradict the description, **the latest dev/review comment takes precedence**.

---

## 1. Context source

Linear is **optional**. Use whichever is available:

| Source | How |
|--------|-----|
| Linear issue | Read **`linear-workflow`** skill → `get_issue` for acceptance criteria |
| Linear comments | **Always fetch** with `list_comments` — may contain revised criteria, product decisions, dev notes, or verification URLs that override the description |
| User-provided | Description, acceptance criteria, or screenshots from the conversation |
<!-- only:figma -->
| Figma design | Optional. Figma link or node ID — fetch via **`figma-implementation`** skill to extract expected layout, spacing, colors, typography for visual verification |
<!-- /only -->
| Codebase | Analyze `src/components/`, `src/pages/`, SCSS modules, `src/types/`, `src/api/` |

If no explicit context is given, analyze the codebase to identify testable behavior. When a Figma link is provided, include visual accuracy checks in the generated test cases. When Linear comments are present, reconcile them with the issue description — **latest dev/review comments take precedence** over the original description.

## 2. Setup

### Folder structure

```
test-documentation/
└── <CONTEXT_KEY>/
    ├── test-cases.md      # TC-01..TC-N per test-documentation skill
    ├── bugs.md            # BUG-01..BUG-N per test-documentation bug rules
    └── screenshots/       # PNGs from test execution
```

`<CONTEXT_KEY>` is the Linear issue key (e.g. `PP-3388`) or a descriptive slug when no issue exists.

### Environment & auth

Credentials, URLs and the sign-in steps are in the **`portal-env-credentials`** skill — a token when one is
set, a password otherwise. **Never hardcode credentials** in skills or test cases; name the roles
**Regular**, **Power** and **Admin**.

### Dev server

```bash
npm run dev
```

Proxy config in `pp-dev.config.ts`. Default port 3000 (then 3001, 3002, … if busy).

## 3. Generate test cases

Generate per **`test-documentation`** skill. Additionally analyze source code for behavior not covered by acceptance criteria.

## 4. Execute in the browser

Drive the browser with the **`playwright-cli`** skill (`npx playwright-cli ...`). It has the full
command reference, the targeting rules and the known limitations.

### Authentication

Follow the **`portal-env-credentials`** skill. With a token, open the page itself: `http://localhost:<port>`
as yourself, `http://<role>.localhost:<port>` as a role. With a password, sign in at `/login`:

```bash
set -a && . ./.env && set +a                                # load .env into this shell; prints nothing
npx playwright-cli open http://localhost:<port>/login
npx playwright-cli snapshot                                 # refs for the login form
npx playwright-cli fill <user-ref> "$QA_USER_<ROLE>"
npx playwright-cli fill <pass-ref> "$QA_PASS_<ROLE>" --submit
npx playwright-cli snapshot                                 # verify authenticated state
```

### Test execution loop

For each TC: **navigate** (`goto`) → **perform steps** (`click`, `fill`, `select`, …) → **verify** with
`snapshot` / `find`, and `eval` or `screenshot` where the check needs them → **record** pass/fail/blocked.

## 5. Bug investigation

When a test fails:

1. `snapshot` the current state; `screenshot --filename=...` when visual evidence helps
2. Check URL — confirm expected route
3. `console` for JS errors
4. Trace to source — grep the error in `src/`
5. `requests` / `request <n>` to verify API data
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

## 7. Final local result

At the end, summarize in the conversation:

- Environment URL and the roles tested.
- Totals: passed / failed / blocked / not tested.
- Bug IDs with short titles.
- Paths of the screenshots used as evidence.
