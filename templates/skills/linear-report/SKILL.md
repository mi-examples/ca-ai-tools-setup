---
name: linear-report
description: Formats and publishes QA test results to a Linear issue—screenshot upload, structured comment with results table. Requires ISSUE_KEY. If no test results exist, run testing-flow first. Use when publishing results to Linear, posting a QA report, or generating a Linear report.
---

# Linear Report (Publish QA Results)

Formats and publishes test results to a Linear issue. **Requires `ISSUE_KEY`.**

Depends on: **`linear-workflow`** (CLI commands), **`test-documentation`** (bug IDs and report format).

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

## 3. Upload screenshots to Linear Cloud

Screenshots must be uploaded before posting the comment. Local file paths do not render in Linear.

```bash
# 1. Get file size
FILESIZE=$(wc -c < "file.png" | tr -d ' ')

# 2. Get upload URL
linear-cli api mutate -o json --compact \
  -v filename="screenshot.png" -v contentType="image/png" -v size="$FILESIZE" \
  'mutation($filename:String!,$contentType:String!,$size:Int!){fileUpload(filename:$filename,contentType:$contentType,size:$size){success uploadFile{uploadUrl assetUrl headers{key value}}}}'

# 3. PUT file to uploadUrl with returned headers
curl -s -X PUT "$uploadUrl" -H "$header1" -H "$header2" -H "Content-Type: image/png" --data-binary "@file.png"
```

The returned `assetUrl` is used inline in the comment.

**Do not** use `attachmentCreate` / issue attachment list for screenshots. Screenshots belong in the **comment body** as inline links/images.

## 4. Comment format

```bash
cat /tmp/linear-comment.md | linear-cli i comment <ISSUE_KEY> --body -
```

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

