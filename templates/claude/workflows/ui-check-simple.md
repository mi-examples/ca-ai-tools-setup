# UI Check Simple

Quick UI verification without Linear. Use this for requests like `check UI`,
`verify UI`, `does this look right`, or visual checks against a URL, route,
component, Figma link, or screenshot.

## Dependencies

Read as needed:

- `./.claude/workflows/playwright-mcp.md`
- `./.claude/agents/figma-mcp.md` when Figma is provided

## Input

| Parameter | Required | Description |
| --- | --- | --- |
| Target page or component | Yes | URL, route, or component name |
| Figma link | No | Figma URL or node ID |
| Reference screenshot | No | Image file to compare against |
| Description | No | What to verify if no visual reference exists |

## Dev Server

Start the app when needed:

```bash
npm run dev
```

Default port is `3000`; use `3001`, `3002`, and so on if busy. Confirm from
`pp-dev.config.ts` or terminal output.

## Auth

Read `.env` for credentials. Use Admin by default unless a specific role is
requested.

| Role | Username variable | Password variable |
| --- | --- | --- |
| Regular | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| Power | `QA_USER_POWER` | `QA_PASS_POWER` |
| Admin | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

### Form Login

1. Navigate to `BASE_URL` or target page URL.
2. If redirected to `/auth`, fill credentials for the selected role.
3. Click `Sign In`.
4. Capture a screenshot to verify authenticated state.

## Verification Flow

1. Navigate to the target page with Playwright MCP.
2. Capture a screenshot.
3. If Figma is provided, inspect node data and compare layout, spacing, colors,
   and typography.
4. If a reference screenshot is provided, compare visually and note concrete
   differences.
5. If only a description is provided, verify described behavior or appearance.
6. Check console logs for JavaScript errors.
7. Optionally test responsive behavior with viewport resize.

## Output

Report findings inline in the conversation:

- Pass/fail summary.
- Screenshot paths.
- Specific discrepancies: expected vs actual.
- Console errors if present.
- Suggested fix area if obvious from code inspection.
