---
name: ui-check
description: Verifies or fixes Portal Page UI against a Linear issue—npm run dev, pp-dev proxy, acceptance criteria from linear-cli i get, optional Playwright MCP. UI proof screenshots go inline in Linear issue comments (Markdown), not as issue attachments. Use for UI check, browser verification, acceptance criteria, or cursor start working with task.
---

# UI check and verification

Use when **verifying or fixing UI** for a Portal Page / custom app.

This file is written into the repo by **`ca-ai-tools-setup`** when **Cursor** is included in the installer run. Re-run the installer with **`--force`** to refresh after upgrading the bootstrap package.

## Task context

The issue is **only** the one from the **current** message:

`cursor start working with task <Task link>`

- **`<Task link>`** — full Linear URL or bare **`<ISSUE_KEY>`** (e.g. `PP-3388`).
- **`<ISSUE_KEY>`** — segment after `/issue/` in the URL, or the pasted key. Do not use example keys from docs.

**Linear CLI** (fetch, start, status, comment): **`.cursor/skills/linear-workflow/SKILL.md`**.

## Stack

- **`npm run dev`** from repo root; proxy from **`pp-dev.config.ts`**.
- Acceptance checklist: **User Stories** / **Description** from **`linear-cli i get <ISSUE_KEY>`**.

## After the app is running

1. Re-read acceptance criteria for **`<ISSUE_KEY>`** via `linear-cli i get`.
2. Generate test cases per **`test-documentation`** skill and save to `test-documentation/<ISSUE_KEY>/test-cases.md`.
3. Execute test cases via Playwright MCP (see **`playwright-mcp`** skill for tools); record results in the comment format from **`linear-report`** skill (table).
4. If a bug is found — document it in `test-documentation/<ISSUE_KEY>/bugs.md` per the bug report rule referenced in **`test-documentation`**.
5. When done, upload screenshots and post results to Linear per **`linear-report`** skill unless the user opts out.

## Linear: screenshots belong in the **comment**, not issue attachments

Upload screenshots to Linear Cloud via `fileUpload` GraphQL mutation, then embed the returned `assetUrl` as a link in the comment. Local file paths do not render.

```bash
# 1. Get upload URL
linear-cli api mutate -o json --compact \
  -v filename="screenshot.png" -v contentType="image/png" -v size="$FILESIZE" \
  'mutation($filename:String!,$contentType:String!,$size:Int!){fileUpload(filename:$filename,contentType:$contentType,size:$size){success uploadFile{uploadUrl assetUrl headers{key value}}}}'

# 2. PUT file to uploadUrl with returned headers
curl -s -X PUT "$uploadUrl" -H "$header1" -H "$header2" -H "Content-Type: image/png" --data-binary "@file.png"

# 3. Embed in comment as link or inline image
# Link:   [passed](assetUrl)
# Image:  ![description](assetUrl)
```

**Do not:** Add UI proof primarily via **`attachmentCreate`** / issue attachment list when the intent is “screenshots in the comment section.” Reserve attachments for links (PRs, Figma, external docs) unless the team explicitly wants files in the attachment panel.
