---
name: ui-check-simple
description: Quick UI verification without Linear—run dev server, open the page with the Playwright CLI, compare against optional Figma link or screenshot reference. Use for UI check, verify UI, check UI, or does this look right.
---

# UI Check (Simple)

Quick UI verification **without Linear**. Optionally accepts a **Figma link** or **reference screenshot** for comparison.

Depends on: **`playwright-cli`** (browser automation, `npx playwright-cli ...`). Optionally Figma
MCP rules for node data.

## 1. Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Target page / component | Yes | URL, route, or component name to verify |
| Figma link | No | Figma URL or node ID — read via Figma MCP rules for node data |
| Reference screenshot | No | Image file to compare against |
| Description | No | What to verify if no reference provided |

## 2. Dev server

```bash
npm run dev
```

Proxy config in `pp-dev.config.ts`. Default port 3000 (then 3001, 3002, … if busy).

## 3. Auth

Read `.env` for credentials. Three roles are available — actual usernames come from env vars:

| Role | Username var | Password var |
|------|-------------|-------------|
| **Regular** | `QA_USER_REGULAR` | `QA_PASS_REGULAR` |
| **Power** | `QA_USER_POWER` | `QA_PASS_POWER` |
| **Admin** | `QA_USER_ADMIN` | `QA_PASS_ADMIN` |

Use **Admin** role by default unless a specific role is requested.

### Form login

```bash
npx playwright-cli open <BASE_URL or PAGE_URL from .env>   # redirects to /auth
npx playwright-cli snapshot                                 # refs for the login form
npx playwright-cli fill <user-ref> "$QA_USER_ADMIN"
npx playwright-cli fill <pass-ref> "$QA_PASS_ADMIN" --submit
npx playwright-cli snapshot                                 # verify authenticated state
```

## 4. Verification flow

1. Navigate to the target page (`goto`)
2. `snapshot` the current state; add `screenshot --filename=...` when the check is visual
3. If **Figma link** provided — fetch node data via Figma MCP rules, compare layout, spacing, colors, typography against the screenshot
4. If **reference screenshot** provided — compare visually
5. If **description only** — verify the described behavior / appearance
6. Check `console` for JS errors
7. Optionally test responsive behavior with `resize`

## 5. Output

Report findings **inline in the conversation** (no Linear posting):

- Pass/fail summary
- Screenshots (saved locally with `screenshot --filename=...`)
- Discrepancies with specifics (expected vs actual, CSS values, layout differences)
- Console errors if any
