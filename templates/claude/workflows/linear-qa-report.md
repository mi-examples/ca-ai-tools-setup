# Linear Report

Use this workflow to publish QA test results to a Linear issue. It requires an
`ISSUE_KEY`.

## Dependencies

Read as needed:

- `./.claude/workflows/linear-workflow.md`
- `./.claude/workflows/test-documentation.md`

## Input

| Parameter | Required | Description |
| --- | --- | --- |
| `ISSUE_KEY` | Yes | Linear issue key or full Linear URL |
| Test results | Yes | Files under `test-documentation/<ISSUE_KEY>/` |

## Pre-check

Verify this folder exists:

```text
test-documentation/<ISSUE_KEY>/
  test-cases.md
  bugs.md
  screenshots/
```

If `test-cases.md` does not exist or has no execution results, stop and run:

`./.claude/workflows/testing-flow.md`

If `bugs.md` exists, verify failed or blocked test rows reference the relevant
`BUG-XX` IDs.

## Upload Screenshots

Screenshots must be uploaded to Linear Cloud before posting a comment. Local
paths do not render in Linear comments.

Get file size:

```bash
FILESIZE=$(wc -c < "file.png" | tr -d ' ')
```

Get upload URL:

```bash
linear-cli api mutate -o json --compact \
  -v filename="screenshot.png" -v contentType="image/png" -v size="$FILESIZE" \
  'mutation($filename:String!,$contentType:String!,$size:Int!){fileUpload(filename:$filename,contentType:$contentType,size:$size){success uploadFile{uploadUrl assetUrl headers{key value}}}}'
```

Upload the file with returned headers:

```bash
curl -s -X PUT "$uploadUrl" \
  -H "$header1" \
  -H "$header2" \
  -H "Content-Type: image/png" \
  --data-binary "@file.png"
```

Use the returned `assetUrl` in the comment body.

Do not use `attachmentCreate` or issue attachments for QA screenshots unless
the team explicitly asks for attachment-panel files. Screenshots belong in the
comment body as links or inline images.

## Comment Format

Write the comment body to a **UTF-8** markdown file, then post:

```bash
linear-cli i comment <ISSUE_KEY> --body - < /tmp/linear-comment.md
```

**Unicode (status icons):** On Windows, do not pipe through PowerShell, cmd, or `cat … | linear-cli` — encoding breaks and icons become `???`. Use a UTF-8 script or stdin redirection instead.

Recommended body:

```markdown
PP: [<environment URL>](<environment URL>)
User role: Admin

| Cases | Status | Actual Result |
| --- | --- | --- |
| TC-01 - <title> | PASS | [passed](<assetUrl>) |
| TC-02 - <title> | FAIL | [failed](<assetUrl>) - <reason> |
| TC-03 - <title> | BLOCKED | blocked by BUG-01 |
| TC-04 - <title> | NOT TESTED | <reason> |

Result: X/N passed - <summary>
```

For multi-role runs, include separate rows or notes per role. Use abstract role
names only: `Regular`, `Power`, `Admin`.

## Status Values

Use ASCII statuses in generated markdown unless the team asks for icons:

| Status | Meaning |
| --- | --- |
| PASS | Passed |
| FAIL | Failed |
| BLOCKED | Blocked |
| NOT TESTED | Not tested |
