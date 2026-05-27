---
name: ui-check
description: Verifies or fixes Portal Page UI against a Linear issue—npm run dev, pp-dev proxy, acceptance criteria from linear-cli i get, optional Playwright MCP. UI proof screenshots go inline in Linear issue comments (Markdown), not as issue attachments. Use for UI check, browser verification, acceptance criteria, or cursor start working with task.
---

# UI check and verification

Use when **verifying or fixing UI** for a Portal Page / custom app.

This file is written into the repo by **`ca-ai-tools-setup`** when **Claude Code** is included in the installer run. Re-run the installer with **`--force`** to refresh after upgrading the bootstrap package.

## Task context

The issue is **only** the one from the **current** message:

`cursor start working with task <Task link>`

- **`<Task link>`** — full Linear URL or bare **`<ISSUE_KEY>`** (e.g. `PP-3388`).
- **`<ISSUE_KEY>`** — segment after `/issue/` in the URL, or the pasted key. Do not use example keys from docs.

**Linear CLI** (fetch, start, status, comment): **`.claude/workflows/linear-workflow.md`**.

## Stack

- **`npm run dev`** from repo root; proxy from **`pp-dev.config.ts`**.
- Acceptance checklist: **User Stories** / **Description** from **`linear-cli i get <ISSUE_KEY>`**.

## After the app is running

1. Re-read acceptance criteria for **`<ISSUE_KEY>`**.
2. Navigate to the route(s) the issue describes.
3. Confirm each criterion; fix in **`src/`** and re-test.
4. Use Playwright MCP if configured; otherwise manual check.
5. When done, update Linear (state + comment) per **linear-workflow** workflow unless the user opts out.

## Linear: screenshots belong in the **comment**, not issue attachments

For UI-check outcomes, put screenshots **inside the issue comment** as embedded images (Markdown), so they read as part of the verification note—not as separate **Assets / attachments** on the issue.

- **Do:** `linear-cli i comment <ISSUE_KEY> --body '...'` (or GraphQL `commentCreate`) with a Markdown body that includes images. After **`fileUpload`** + PUT, embed **`![alt text](assetUrl)`** so the image **renders inline in the comment thread** (local file paths are not valid in API comments).
- **Do not:** Add UI proof primarily via **`attachmentCreate`** / issue attachment list when the intent is “screenshots in the comment section.” Reserve attachments for links (PRs, Figma, external docs) unless the team explicitly wants files in the attachment panel.

If you use **`fileUpload`** to get an **`assetUrl`**, embed that URL in the **comment** Markdown instead of (or before) creating a standalone issue attachment for the same screenshot.
