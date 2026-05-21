---
name: ai-testing
description: Portal Page AI testing—Linear CLI + gates, run checks from Linear (Waiting AI Test), UI verification, screenshots in comments, manual test-documentation format. Use for QA from Linear, UI check, test cases, or scripted ui-check flows.
---

# AI testing (Portal Page / Custom App)

Single combined skill for **testing** work. **Development** lives in **`.cursor/skills/ai-development/SKILL.md`**.

---

## Linear CLI workflow (Portal Page / Custom App)

### Mandatory: issue state before work

1. **`linear-cli i get <ISSUE_KEY> -o json`** — inspect **`state.name`**.
2. **AI testing** path: proceed **only** if state is **`Waiting AI Test`** — full playbook **[AI testing from Linear](#ai-testing-from-linear)** below (see **`.cursor/rules/linear-task-gates.mdc`**).
3. **AI development** path (implement from Figma + stories + AC): proceed **only** if state is **`Waiting AI Development`** — **`.cursor/skills/ai-development/SKILL.md`**.
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

## AI testing from Linear

### Preconditions (hard gate)

1. **`linear-cli i get <ISSUE_KEY>`** — confirm **`state.name`** is exactly **`Waiting AI Test`** (see **`.cursor/rules/linear-task-gates.mdc`**).
2. If not: **stop**; do not run the testing playbook until Linear is updated.

### After the gate passes

1. Load **description**, **User Stories**, and **Acceptance Criteria** from the same issue; use them as the test checklist.
2. **Credentials:** use **`.env`** — **`DEFAULT_USERNAME_ADMIN`** and **`DEFAULT_PASSWORD_ADMIN`** for login (and **`BASE_URL`** for the MI instance link). See **`.cursor/rules/portal-env-credentials.mdc`**. Never hardcode passwords in source or commit a filled **`.env`**.
3. **Local app:** `npm run dev` (or next port); optional **`PP_LOCAL_APP_URL`** in **`.env`** for the exact browser entry URL; otherwise use the URL from the terminal / **`pp-dev.config.ts`**.
4. Execute checks (manual, Playwright MCP if available, or **`npm run ui-check:auth-linear`** when scripted login + evidence is required — the script reads **`.env`** via `dotenv`).
5. Post results in Linear per **[UI check and verification](#ui-check-and-verification)** below (screenshots **in the comment** as Markdown images where applicable).
6. Update issue state / comment per **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** above and team practice.

---

## UI check and verification

Use when **verifying or fixing UI** for a Portal Page / custom app.

This content is written into the repo by **`ca-ai-tools-setup`** when **Cursor** is included in the installer run. Re-run the installer with **`--force`** to refresh after upgrading the bootstrap package.

### Task context

The issue is **only** the one from the **current** message:

`cursor start working with task <Task link>`

- **`<Task link>`** — full Linear URL or bare **`<ISSUE_KEY>`** (e.g. `PP-3388`).
- **`<ISSUE_KEY>`** — segment after `/issue/` in the URL, or the pasted key. Do not use example keys from docs.

**Linear CLI** (fetch, start, status, comment): **[Linear CLI workflow](#linear-cli-workflow-portal-page--custom-app)** above.

### Stack

- **`npm run dev`** from repo root; proxy from **`pp-dev.config.ts`**.
- Acceptance checklist: **User Stories** / **Description** from **`linear-cli i get <ISSUE_KEY>`**.

### After the app is running

1. Re-read acceptance criteria for **`<ISSUE_KEY>`**.
2. Navigate to the route(s) the issue describes.
3. Confirm each criterion; fix in **`src/`** and re-test.
4. Use Playwright MCP if configured; otherwise manual check.
5. When done, update Linear (state + comment) per **Linear CLI workflow** above unless the user opts out.

### Linear: screenshots belong in the **comment**, not issue attachments

For UI-check outcomes, put screenshots **inside the issue comment** as embedded images (Markdown), so they read as part of the verification note—not as separate **Assets / attachments** on the issue.

- **Do:** `linear-cli i comment <ISSUE_KEY> --body '...'` (or GraphQL `commentCreate`) with a Markdown body that includes images. After **`fileUpload`** + PUT, embed **`![alt text](assetUrl)`** so the image **renders inline in the comment thread** (local file paths are not valid in API comments).
- **Do not:** Add UI proof primarily via **`attachmentCreate`** / issue attachment list when the intent is “screenshots in the comment section.” Reserve attachments for links (PRs, Figma, external docs) unless the team explicitly wants files in the attachment panel.

If you use **`fileUpload`** to get an **`assetUrl`**, embed that URL in the **comment** Markdown instead of (or before) creating a standalone issue attachment for the same screenshot.

---

## Test documentation (manual cases)

### When generating test cases

#### Content

- No duplicate checks.
- Role-specific steps only when behavior differs by role.
- Keep the document concise.

#### Structure

- Group cases by logical blocks.
- Number sequentially: **TC-01**, **TC-02**, …
- Start with **`## Overview`**, then **`## Notes`** immediately after.

#### Each test case

- Title
- **Priority:** `High` / `Medium` / `Low`
- **Steps** (numbered)
- **Expected Result**

#### Formatting

- Markdown only.
- Case heading: `### TC-01 – Title` (no bold around the ID).
- Numbered lists for steps.
- Compact, readable for a first-time reader.

### Page suite template

Replace **`{{page}}`** with the route or page name under test.

```markdown
# Page Test Cases – {{page}}

## Overview
Short explanation of what the page does and what areas are being tested.

## Notes
Important assumptions, dependencies, or special conditions.

---

## 1. Page Access & Navigation

### TC-01 – Verify page loads successfully
**Priority:** High

**Steps**
1. Login as QA_PP_Regular
2. Navigate to {{page}}

**Expected Result**
Page loads successfully without errors and displays expected UI elements.

---

## 2. Core Functionality

### TC-02 – Verify main action works correctly
**Priority:** High

**Steps**
1. Login as QA_PP_Power
2. Perform the main action on the page

**Expected Result**
Action completes successfully and the expected result is displayed.

---

## 3. Validation & Error Handling

(Continue generating cases as needed)
```

### QA users (typical)

- **`QA_PP_Regular`**, **`QA_PP_Power`**, **`QA_PP_Admin`** — see existing files under **`test-documentation/`** for conventions.
