---
name: linear-report
description: Formats and publishes QA test results to a Linear issue—screenshot upload, structured comment with results table. Requires ISSUE_KEY. If no test results exist, run testing-flow first. Use when publishing results to Linear, posting a QA report, or generating a Linear report.
---

# Linear Report (Publish QA Results)

Formats and publishes test results to a Linear issue. **Requires `ISSUE_KEY`.**

Depends on: **`linear-workflow`** (the Linear MCP tools, and what to do when they are unavailable), **`test-documentation`** (bug IDs and report format).

## 1. Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ISSUE_KEY` | **Yes** | Linear issue key (e.g. `PP-3388`) or full URL |
| Test results | Yes | From `test-documentation/<ISSUE_KEY>/` — if missing, run **`testing-flow`** skill first |

## 2. Pre-check

Verify results exist:

```
test-documentation/<ISSUE_KEY>/
  ├── test-cases.md
  ├── bugs.md            # BUG-01..BUG-N per test-documentation; may not exist if no bugs found
  └── screenshots/       # PNGs from test execution
```

If `test-cases.md` does not exist or has no results — **stop and run `testing-flow` skill first**, then return here.

If `bugs.md` exists, verify any failed or blocked test rows reference the relevant `BUG-XX` IDs from that file.

## 3. Upload screenshots

Screenshots must be uploaded before the comment is posted: local file paths do not render in Linear.

For **each** screenshot, one at a time:

1. Get the exact file size in bytes (`wc -c < file.png`, or `(Get-Item file.png).Length` in PowerShell).
2. Call the Linear MCP tool **`prepare_file_upload`** with `filename`, `contentType` (`image/png`) and `size`.
3. `PUT` the raw file to the returned `uploadRequest.url`, sending **every** header from `uploadRequest.headers` exactly as given:

   ```bash
   curl -X PUT --data-binary @file.png \
     -H "<header-name>: <header-value>" \
     "<uploadRequest.url>"
   ```

4. Keep the returned markdown (or `assetUrl`) for the comment.

The signed URL expires within a minute, and a missing or changed header returns HTTP 403. So prepare and upload one file before preparing the next, and do not base64-encode or transform the file.

**Do not** use issue attachments (`prepare_attachment_upload`, `create_attachment`) for screenshots. Screenshots belong in the **comment body** as inline links/images.

## 4. Comment format

Post the report with **`save_comment`** (`issueId: <ISSUE_KEY>`, `body`: the markdown below, with real newlines). Ask before posting unless the user asked for the results to be published.

### Comment body template

```markdown
PP: [<environment URL>](<environment URL>)
User role: Admin

| Cases | Status | Actual Result |
| -- | -- | -- |
| TC-01 – <title> | ✅ | [passed](<assetUrl>) |
| TC-02 – <title> | ❌ | [failed](<assetUrl>) — <reason> |
| TC-03 – <title> | 🚫 | blocked by BUG-01 |
| TC-04 – <title> | ➖ | not tested — <reason> |

**Result: X/N passed — <summary>**
```

### Status icons

| Icon | Meaning |
|------|---------|
| ✅ | Passed |
| ❌ | Failed |
| 🚫 | Blocked |
| ➖ | Not tested |

### Multi-role results

If tests were executed under multiple roles, include a separate row or note per role. Use abstract role names (`Admin`, `Regular`, `Power`), never hardcoded usernames.

