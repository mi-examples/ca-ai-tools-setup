---
name: ai-development
description: Portal Page AI development—Linear CLI + gates, implement from Linear (Waiting AI Development), greenfield Vite+pp-dev setup, Figma MCP, MI backend form/schema notes, PR review, Definition of Done. Use for dev tasks, Figma-to-code, new pp-dev projects, PRs, DoD, or Linear issue implementation.
---

# AI development (Portal Page / Custom App)

Single combined skill for **development** work. **Testing** lives in **`.cursor/skills/ai-testing/SKILL.md`**.

---

## Linear CLI workflow (Portal Page / Custom App)

### Mandatory: issue state before work

1. **`linear-cli i get <ISSUE_KEY> -o json`** — inspect **`state.name`**.
2. **AI testing** path: proceed **only** if state is **`Waiting AI Test`** — full playbook **`.cursor/skills/ai-testing/SKILL.md`** (see **`.cursor/rules/linear-task-gates.mdc`**).
3. **AI development** path (implement from Figma + stories + AC): proceed **only** if state is **`Waiting AI Development`** (or the name your team configured — see **`.cursor/rules/linear-task-gates.mdc`**). After the gate, the **operator** picks **full** (greenfield) vs **fixes** with the agent — **[AI development from Linear](#ai-development-from-linear)** below.
4. Wrong state → **stop**, report, ask for Linear update or explicit override.

### Local app

- URL: **`http://localhost:<port>`** — default **3000**, then **3001**, **3002**, … if busy.
- Confirm **`pp-dev.config.ts`** (or `pp-dev.config`) and **`npm run dev`** / **`pp-dev`** terminal output for the real port.

### Auth

If API calls fail:

```bash
linear-cli auth oauth
```

Portal **browser login** and instance URLs for local work: **`.env`** (`DEFAULT_USERNAME_ADMIN`, `DEFAULT_PASSWORD_ADMIN`, `BASE_URL`, …) — **`.cursor/rules/portal-env-credentials.mdc`**.

### Issue identity

- **`linear-cli i get <ISSUE_KEY>`** — full issue (description, state, team). Example: `PP-3388`.
- **Note:** the CLI uses **`issues get`**, not `view` (`linear-cli i get` is the short form).

List mine:

```bash
linear-cli i list --assignee me --limit 20
```

### Team workflow states

State names differ by team. List them:

```bash
linear-cli statuses list --team "<Team name from issue>"
```

Use the exact **`-s` state name** from that list with `linear-cli i update`.

### Start work

```bash
linear-cli i start <ISSUE_KEY>
```

Maps the issue to that team’s “started” state (e.g. **In Progress** or **To Deploy**—depends on Linear team config).

### Update and comment

```bash
linear-cli i update <ISSUE_KEY> -s "To Test"
linear-cli i comment <ISSUE_KEY> --body "Short markdown summary of what changed / how to verify."
```

Use **`--body`** (or **`-b`**) for comment text.

### Conventions

- Parse **`<ISSUE_KEY>`** only from the **current** user message (URL segment after `/issue/`, or pasted key). Do not substitute example keys from docs.
- Keep Linear updates concise; include **`<ISSUE_KEY>`** in summaries.
- **Local login:** **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** in **`.env`** (see **`portal-env-credentials.mdc`**). Team vault / named QA users in **`test-documentation/`** are optional references only — never commit passwords.

---

## AI development from Linear

### Preconditions (hard gate)

1. **`linear-cli i get <ISSUE_KEY> -o json`** — confirm **`state.name`** is exactly **`Waiting AI Development`** (see **`.cursor/rules/linear-task-gates.mdc`**). If your team renamed this state, update the rule file after checking `linear-cli statuses list --team "<Team>"`.
2. If not: **stop** and report current state.

### After the gate — choose development mode (operator + agent)

**Linear CLI** is the source of truth for the task: always **`linear-cli i get <ISSUE_KEY>`** (and **`linear-cli i start <ISSUE_KEY>`** when your team uses “start work” — see **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** above).

The **operator** (human) decides with the agent which mode applies **before** heavy implementation. The agent should **ask once** if the issue is ambiguous (e.g. “new page” could mean greenfield or a route in an existing app).

| Mode | When to use | What to do |
|------|-------------|------------|
| **Full** | New Portal Page / new repo / greenfield scaffold | Bootstrap per **[New Portal Page project](#new-portal-page-project-react--vite--pp-dev)** below, then implement from the issue. |
| **Fixes** | Bug fix, regression, or small change in an **already** scaffolded repo | No new Vite shell; change **`src/`** (and config only if required). |

### Mode — Full (new React + Vite + pp-dev)

1. Use **`linear-cli i get <ISSUE_KEY>`** for title, description, Figma links, US, AC (same issue throughout).
2. Scaffold: **[New Portal Page project](#new-portal-page-project-react--vite--pp-dev)** — `npm create vite@latest` (**`react-ts`**), **`@metricinsights/pp-dev`**, **`pp-dev.config.ts`**, **`package.json`** scripts **`dev` / `build`** via **pp-dev**, **`tsconfig.node.json`** includes **`vite.config.ts`** and **`pp-dev.config.ts`**.
3. **Committed baseline** should look like a fresh Vite app + pp-dev only — **this repo’s layout is a reference**, not a dump of unrelated features:
   - **`src/`**, **`tsconfig.json`**, **`tsconfig.app.json`**, **`tsconfig.node.json`**, **`vite.config.ts`**, **`pp-dev.config.ts`**, **`index.html`**, **`package.json`** (+ lockfile).
   - Keep only **starter-level** files under **`src/`** (e.g. `main.tsx`, root `App`, `vite-env.d.ts`); add routes and features as the **Linear issue** demands.
4. Then follow **Required order** below (Figma → US → AC).

### Mode — Fixes (bugs / incremental work)

1. Same **`linear-cli i get <ISSUE_KEY>`** for context.
2. **Do not** re-run greenfield scaffolding unless the issue explicitly says to replatform or recreate the app.
3. Trace the bug from **Acceptance Criteria** / description; patch **`src/`** (and **`vite` / `pp-dev` config** only if the fix requires it).
4. **Figma:** follow **step 1** under **Required order** only if the issue references design or UI parity; otherwise prioritize AC and reproduction steps.

### Required order (from the issue)

Work **in this order**; extract links and text from the **fetched** Linear issue only.

#### 1. Figma design

- Open the **Figma link** from the issue (description, attachments, or comments) **when the issue or mode calls for UI work from design**.
- Follow **[Figma implementation (MCP)](#figma-implementation-mcp)** below (node JSON, variables, tokens, Code Connect).

#### 2. User Stories

- Read **User Stories** in the issue body (or linked doc).
- Map each story to routes/components in **`src/`** before coding.

#### 3. Acceptance Criteria

- Read **Acceptance Criteria** in the issue.
- Implement until each criterion is satisfied in the running app.

### Credentials and instance config

- Use **`.env`** at the repo root: **`BASE_URL`** (MI instance), **`APPLICATION_ID`** / **`APPLICATION_KEY`** when needed for API work, and **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** for local login while implementing and manually verifying UI.
- See **`.cursor/rules/portal-env-credentials.mdc`**. Do not commit secrets; copy from **`.env.example`** and fill **`.env`** locally only.

### Implementation scope

- **Focus:** deliver the **React / Vite** Portal Page behavior in **`src/`** (patterns in **`.cursorrules`** / **`.cursor/rules/`**).
- **Not the primary goal here:** standing up full automated test suites, DoD-level QA matrices, or cross-browser matrices **unless** the issue explicitly demands them. For test-heavy work, use **`.cursor/skills/ai-testing/SKILL.md`** and the **Waiting AI Test** gate instead.

### Handoff

- **Before final Linear comment / PR:** run **`npm run dev`**, copy the printed **Local** URL (port may not be 3000). With **`.env`** login vars set, run **`PP_LOCAL_APP_URL=<that-url>/ npm run dev:console-check`**. Fix any **console `error`** lines or **uncaught page errors** reported by the script. If Chromium is missing: **`npx playwright install chromium`**.
- PR / review: **[Portal Page — code review](#portal-page--code-review)** below.
- Done quality bar (when closing work): **[Portal Page — Definition of Done](#portal-page--definition-of-done)** below.

---

## New Portal Page project (React + Vite + pp-dev)

### Node.js

- Minimum **Node.js ≥ 18.17.0** (project policy).
- Many MI templates and **`@metricinsights/pp-dev`** builds expect **Node 22+** in practice — align `engines` in `package.json` and CI with what `pp-dev` release notes require.

### Baseline layout (what “full” development should commit)

Treat a **greenfield** Portal Page like a stock **Vite `react-ts`** app plus **pp-dev** — not a copy of another app’s feature code. A valid minimal tree (this repo is a structural reference only):

- **`src/`** — entry (`main.tsx`), root component (`App.tsx` / `App.css` or equivalent), `vite-env.d.ts`, small assets as needed.
- **`tsconfig.json`**, **`tsconfig.app.json`**, **`tsconfig.node.json`** — as generated by Vite; extend **`tsconfig.node.json`** `include` with **`vite.config.ts`** and **`pp-dev.config.ts`** (see below).
- **`vite.config.ts`**, **`pp-dev.config.ts`**, **`index.html`**, **`package.json`** (with **`dev` / `build`** calling **pp-dev**).

Exclude app-specific routes, domains, and large feature folders from “template” thinking — add those only as the Linear issue requires.

### 1. Create Vite React + TypeScript app

```bash
npm create vite@latest portal-page -- --template react-ts
```

- Replace **`portal-page`** with the folder name, or use **`.`** to scaffold in the current directory (follow Vite prompts).

```bash
cd portal-page   # or stay in `.` if you used `.`
npm install
```

### 2. Add PP Development Helper

```bash
npm install @metricinsights/pp-dev@latest
```

### 3. `pp-dev.config.ts` (connect MI instance)

Create **`pp-dev.config.ts`** at the repo root:

```typescript
import { PPDevConfig } from '@metricinsights/pp-dev';

const ppDevConfig: PPDevConfig = {
  backendBaseURL: 'https://metricinsights.com',
  portalPageId: 1,
  miHudLess: true,
};

export default ppDevConfig;
```

- Set **`backendBaseURL`** and **`portalPageId`** to the real MI instance and page.
- **`miHudLess: true`** is required so the MI chrome does not override local styles/logic during development.

### 4. TypeScript config for Node

In **`tsconfig.node.json`**, extend **`include`** so the config is part of the project:

```json
"include": ["vite.config.ts", "pp-dev.config.ts"]
```

### 5. `package.json` scripts

Run the dev server and build **through pp-dev**, not raw Vite alone:

```json
"scripts": {
  "dev": "pp-dev",
  "build": "pp-dev build",
  "preview": "vite preview"
}
```

(Adjust if your template already defines `dev`/`build` — replace with **`pp-dev`** / **`pp-dev build`**.)

### 6. Verify

```bash
npm run dev
```

Open the URL printed in the terminal (often `http://localhost:3000/...`).

### See also

- **`setup-cursor-assistant.md`** — full Cursor assistant bootstrap.
- **`pp-dev.config.ts`** in this repo — real-instance example.

---

## Figma implementation (MCP)

1. **Prioritize data over visuals** — Do not rely only on screenshots. Fetch node JSON and read spacing, gap, colors, font size.
2. **Deep inspection** — For the selected node, recurse into children. Use `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`.
3. **Variables and styles** — Resolve Figma `styles` and `variables` to project tokens (CSS variables, SCSS variables, theme). Avoid raw hex when a named token exists.
4. **Code Connect first** — If Code Connect is present, treat linked snippets and component docs as source of truth.
5. **Auto-layout → CSS** — Map auto-layout to Flexbox/Grid (`space-between`, hug/fill, gaps).
6. **Reuse in-repo UI** — Prefer existing components in **`src/components/`** before adding new primitives.
7. **Token-safe review** — Reject diffs that replace semantic tokens with arbitrary constants unless explicitly allowed.

---

## Form Builder (MI backend)

> **Portal Page / custom app repos (this type of project):** day-to-day work is **frontend in `src/`** with **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** above. Do **not** add PHP or `backend/` paths here unless the repository actually contains a Laravel app.

### Task context (global to the “start with task” message — not in files)

The active Linear issue is **never** read from this section alone. It is **only** defined when the user sends:

`cursor start working with task <Task link>`

| Symbol | What it is |
|--------|------------|
| **`<Task link>`** | Full issue URL (or issue key) **from that user message** — different each time. |
| **`<ISSUE_KEY>`** | Parsed from `<Task link>` (path segment after `/issue/`) or from a bare key in the same message. |

### When to use this section

Use only in a **full Metric Insights** codebase that has `backend/app/Data/...` and FormBuilder, not in a standalone Portal SPA.

### Workflow (backend repo)

1. Read `.cursor/rules/form-generation.mdc`
2. Check existing forms: `ls backend/app/Data/{Module}/`
3. Create `Form.php` returning `$fb->toArray()` per MI conventions

### If the user said “start working with task” (frontend-only repo)

If the user invokes **`cursor` / `claude start working with task <Task link>`** and this repo is **frontend-only**, follow **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** + **`.cursor/skills/ai-testing/SKILL.md`**: resolve **`<ISSUE_KEY>`** from the message, load that issue, `npm run dev`, work under `src/`, update Linear for **that** key. Ignore Form Builder for implementation unless the issue explicitly points to a backend repo.

---

## Schema discovery (MI backend)

> **Portal Page / custom app repos:** tasks are **frontend** in **`src/`**. Use **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** and **`.cursor/skills/ai-testing/SKILL.md`**. There is **no** `backend/` database or migrations in this workflow unless the user is in a different repository.

### Task context (from the user message)

The current issue is whatever **`<Task link>`** / **`<ISSUE_KEY>`** the user passed with `cursor start working with task …` — not a fixed ticket in this file. Parse **`<ISSUE_KEY>`** from the link (see **Linear CLI workflow**). Schema commands below apply only when the **loaded issue** is about backend work.

### When to use this section

Use only in a **full MI** app that has `backend/db/schema.sql` or `backend/database/migrations/`.

### Workflow (backend repo)

Before creating a migration:

1. Run: `grep -A 20 "CREATE TABLE.*{table_name}" backend/db/schema.sql` (or live DB as per that repo’s `AGENTS.md`)
2. Run: `ls backend/database/migrations/ | grep -i "{table_name}"`
3. If the table already exists, use an **ALTER** migration, not a new **CREATE** for the same table.

### If the user said “start working with task” (Portal-only clone)

For **`cursor` / `claude start working with task <Task link>`** in a **Portal-only** clone, follow **Linear CLI workflow** + **ai-testing**: use **`<ISSUE_KEY>`** from the message, load the issue, `npm run dev`, verify/change UI under `src/`, update Linear. Do **not** run schema or migration steps unless the **fetched** issue requires a **backend** repo.

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
2. Prefer **evidence** (PR link, CI green, screenshots in Linear **comments** per **`.cursor/skills/ai-testing/SKILL.md`**) over ticking boxes blindly.
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
- **Linear testing flow:** **`.cursor/skills/ai-testing/SKILL.md`**
