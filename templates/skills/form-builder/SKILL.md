---
name: Form Builder (MI backend)
description: Create PHP FormBuilder forms in full Metric Insights — not used for Portal Page-only frontend tasks
triggers:
  - form
  - FormBuilder
  - Form.php
  - app/Data
---

# Form Builder (Laravel / MI backend)

> **Portal Page / custom app repos (this type of project):** day-to-day work is **frontend in `src/`** with **`.cursor/skills/linear-workflow/SKILL.md`**. Do **not** add PHP or `backend/` paths here unless the repository actually contains a Laravel app.

## Task context (global to the “start with task” message — not in files)

The active Linear issue is **never** read from this skill. It is **only** defined when the user sends:

`cursor start working with task <Task link>`

| Symbol | What it is |
|--------|------------|
| **`<Task link>`** | Full issue URL (or issue key) **from that user message** — different each time. |
| **`<ISSUE_KEY>`** | Parsed from `<Task link>` (path segment after `/issue/`) or from a bare key in the same message. |

All steps (load issue, In Development, To Test, comment) use that **`<ISSUE_KEY>`** for the **current** task only. Do not hardcode any issue in answers or in repo text.

## When to use this skill

Use this skill only in a **full Metric Insights** codebase that has `backend/app/Data/...` and FormBuilder, not in a standalone Portal SPA.

## Workflow (backend repo)

1. Read `.cursor/rules/form-generation.mdc`  
2. Check existing forms: `ls backend/app/Data/{Module}/`  
3. Create `Form.php` returning `$fb->toArray()` per MI conventions

## If the user said “start working with task”

If the user invokes **`cursor` / `claude start working with task <Task link>`** and this repo is **frontend-only**, follow **linear-workflow** + **ui-check** skills: resolve **`<ISSUE_KEY>`** from the message, load that issue, `npm run dev`, work under `src/`, update Linear for **that** key. Ignore this Form Builder skill for implementation unless the issue explicitly points to a backend repo.
