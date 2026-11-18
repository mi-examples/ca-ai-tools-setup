---
name: ai-development
description: Portal Page AI development—implement a Linear issue from the Waiting AI Development gate (full or fixes mode, Figma → user stories → acceptance criteria), handoff, PR review and Definition of Done; greenfield Vite + pp-dev setup in references/new-project.md. Use for dev tasks, new pp-dev projects, PRs, DoD, or Linear issue implementation.
---

# AI development (Portal Page / Custom App)

The skill for **development** work. **QA/testing** (`Waiting AI Test`) lives in the **`testing-with-linear`** and **`testing-flow`** skills — see the **`linear-task-gates`** rule for routing.

---

## Before you start

1. Fetch the issue and read its comments with the **`linear-workflow`** skill. It also covers team states,
   starting work, updating the state and commenting.
2. Check the state: proceed **only** from **`Waiting AI Development`** — see the **`linear-task-gates`** rule.
   Wrong state → **stop**, report it, and ask for a Linear update or an explicit override. An issue in
   **`Waiting AI Test`** belongs to the testing skills, not to this one.
3. Local app: **`http://localhost:<port>`** — default **3000**, then **3001**, **3002**, … if busy. Confirm with
   **`pp-dev.config.ts`** (or `pp-dev.config`) and the **`npm run dev`** / **`pp-dev`** terminal output.
4. Portal login and instance URLs come from **`.env`** — see the **`portal-env-credentials`** skill. Never
   commit passwords.

---

## AI development from Linear

### Preconditions (hard gate)

1. Fetch the issue (**`get_issue`**) and confirm its state is exactly **`Waiting AI Development`** (see the **`linear-task-gates`** rule).
2. If not: **stop** and report current state.

### After the gate — choose development mode (operator + agent)

**Linear** is the source of truth for the task: always fetch the issue first (**`get_issue`**), and start it (**`save_issue`**) when your team uses “start work” — see the **`linear-workflow`** skill.

The **operator** (human) decides with the agent which mode applies **before** heavy implementation. The agent should **ask once** if the issue is ambiguous (e.g. “new page” could mean greenfield or a route in an existing app).

| Mode | When to use | What to do |
|------|-------------|------------|
| **Full** | New Portal Page / new repo / greenfield scaffold | Bootstrap per **[references/new-project.md](references/new-project.md)**, then implement from the issue. |
| **Fixes** | Bug fix, regression, or small change in an **already** scaffolded repo | No new Vite shell; change **`src/`** (and config only if required). |

### Mode — Full (new React + Vite + pp-dev)

1. Use the fetched issue for title, description, Figma links, US, AC (same issue throughout).
2. Scaffold: **[references/new-project.md](references/new-project.md)** — `npm create vite@latest` (**`react-ts`**), **`@metricinsights/pp-dev`**, **`pp-dev.config.ts`**, **`package.json`** scripts **`dev` / `build`** via **pp-dev**, **`tsconfig.node.json`** includes **`vite.config.ts`** and **`pp-dev.config.ts`**.
3. **Committed baseline** should look like a fresh Vite app + pp-dev only — **this repo’s layout is a reference**, not a dump of unrelated features:
   - **`src/`**, **`tsconfig.json`**, **`tsconfig.app.json`**, **`tsconfig.node.json`**, **`vite.config.ts`**, **`pp-dev.config.ts`**, **`index.html`**, **`package.json`** (+ lockfile).
   - Keep only **starter-level** files under **`src/`** (e.g. `main.tsx`, root `App`, `vite-env.d.ts`); add routes and features as the **Linear issue** demands.
4. Then follow **Required order** below (Figma → US → AC).

### Mode — Fixes (bugs / incremental work)

1. Same fetched issue for context.
2. **Do not** re-run greenfield scaffolding unless the issue explicitly says to replatform or recreate the app.
3. Trace the bug from **Acceptance Criteria** / description; patch **`src/`** (and **`vite` / `pp-dev` config** only if the fix requires it).
4. **Figma:** follow **step 1** under **Required order** only if the issue references design or UI parity; otherwise prioritize AC and reproduction steps.

### Required order (from the issue)

Work **in this order**; extract links and text from the **fetched** Linear issue only.

#### 1. Figma design

- Open the **Figma link** from the issue (description, attachments, or comments) **when the issue or mode calls for UI work from design**.
- Follow the **`figma-implementation`** skill (node JSON, variables, tokens, Code Connect).

#### 2. User Stories

- Read **User Stories** in the issue body (or linked doc).
- Map each story to routes/components in **`src/`** before coding.

#### 3. Acceptance Criteria

- Read **Acceptance Criteria** in the issue.
- Implement until each criterion is satisfied in the running app.

### Credentials and instance config

- Use **`.env`** at the repo root: **`BASE_URL`** (MI instance), **`APPLICATION_ID`** / **`APPLICATION_KEY`** when needed for API work, and **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** for local login while implementing and manually verifying UI.
- See the **`portal-env-credentials`** skill. Do not commit secrets; copy from **`.env.example`** and fill **`.env`** locally only.

### Implementation scope

- **Focus:** deliver the **React / Vite** Portal Page behavior in **`src/`** (patterns in the **`code-style`** and **`frontend-architecture`** rules).
- **Not the primary goal here:** standing up full automated test suites, DoD-level QA matrices, or cross-browser matrices **unless** the issue explicitly demands them. For test-heavy / QA-only work, use the **`testing-with-linear`** skill and the **Waiting AI Test** gate instead.

### Handoff

- **Before the final Linear comment / PR:** run **`npm run dev`** and take the printed **Local** URL (the port may not be 3000). Open the changed pages with the **`playwright-cli`** skill and read `console`. Fix any console **`error`** lines and **uncaught page errors**. If Chromium is missing: **`npx playwright install chromium`**.
- PR / review: **[Portal Page — code review](#portal-page--code-review)** below.
- Done quality bar (when closing work): **[Portal Page — Definition of Done](#portal-page--definition-of-done)** below.

---

## New Portal Page project (React + Vite + pp-dev)

For greenfield (**Full** mode) work, follow **[references/new-project.md](references/new-project.md)**: the
Node.js requirement, the baseline layout, the Vite scaffold, `pp-dev.config.ts` (including the migration of a
pre-1.0 config), the TypeScript config, the scripts and the verification step.

---

## Portal Page — code review

### Repositories (GitHub)

| Purpose | URL |
|--------|-----|
| **DEV** (Portal Page apps; use when already linked) | `https://github.com/mi-pp` |
| **QA** (API / Playwright automation) | `https://github.com/metricinsights/mi-api-playwright-tests` |

### Process

1. **One task → one branch** (separate branches per task).
2. When work is ready, open a **pull request** and assign:
   - **Developers:** all developers (team practice).
   - **QA-related PRs:** assign **Michail Ozdemir** and **Serhii Kravchenko** (per team norm).
3. PR **title/description** must include the **Linear (or task) number** and a **short summary** of changes.
4. After the PR is opened, team notifications go to **`#pp-dev-code-review`** and **`#api-automation`** (Slack).
5. **Merge rules**
   - **Developers:** at least **one** approval.
   - **QA:** at least **two** approvals.
6. If review fails: **fix**, push, **re-open** or continue on the same PR until resolved.

### What reviewers check

1. **Style** — matches project / language conventions.
2. **Readability & maintainability** — structure, naming, clarity.
3. **No unnecessary duplication** — DRY where it helps.
4. **Functionality** — matches requirements / issue / AC.
5. **Security** — XSS, injection, authz, unsafe data handling, secrets in code.

### Agent behavior

- Do not merge on behalf of humans unless explicitly asked and policy allows.
- When asked to “prepare PR”: ensure branch name, description, task link, and reviewer list match the rules above.

---

## Portal Page — Definition of Done

This section is the **entry point**. The **full, section-by-section checklist** (same content as team policy) lives in:

**[`DOD-FULL.md`](./DOD-FULL.md)**

### How agents should use it

1. When an issue asks for **“DoD”** or **release readiness**, open **`DOD-FULL.md`** and walk the relevant sections (not every bullet applies to every change).
2. Prefer **evidence** (PR link, CI green, screenshots in Linear **comments** per the **`linear-report`** skill) over ticking boxes blindly.
3. **Living document:** if team policy changes, update **`DOD-FULL.md`** and keep this section as a short pointer.

### Quick map (see DOD-FULL for detail)

| Area | DOD-FULL section |
|------|------------------|
| Code quality & review | Code Quality Requirements |
| Testing (unit / integration / E2E / a11y / security / perf) | Testing Requirements |
| Docs | Documentation Requirements |
| UI/UX | UI/UX Requirements |
| Performance | Performance Requirements |
| Security | Security Requirements |
| DevOps / CI | DevOps Requirements |
| Product | Product Requirements |
| Release | Release Readiness |
| Approvals | Sign-off Requirements |

### Related

- **PR process:** **[Portal Page — code review](#portal-page--code-review)** above.
- **Linear QA flow (separate skill):** **`testing-with-linear`**
