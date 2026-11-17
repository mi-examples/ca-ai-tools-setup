---
name: ui-check-simple
description: Quick UI verification without Linear—run dev server, open the page with the Playwright CLI, compare against optional Figma link or screenshot reference. Use for UI check, verify UI, check UI, or does this look right.
---

# UI Check (Simple)

Quick UI verification **without Linear**. Optionally accepts a **Figma link** or **reference screenshot** for comparison.

Depends on: **`playwright-cli`** (browser automation, `npx playwright-cli ...`).
<!-- only:figma -->
Optional: **`figma-implementation`** (node data for a Figma link).
<!-- /only -->

## 1. Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Target page / component | Yes | URL, route, or component name to verify |
<!-- only:figma -->
| Figma link | No | Figma URL or node ID — read with the **`figma-implementation`** skill |
<!-- /only -->
| Reference screenshot | No | Image file to compare against |
| Description | No | What to verify if no reference provided |

## 2. Dev server

```bash
npm run dev
```

Proxy config in `pp-dev.config.ts`. Default port 3000 (then 3001, 3002, … if busy).

## 3. Auth

Follow the **`portal-env-credentials`** skill — a token when one is set, a password otherwise. Use the
**Admin** role by default unless a specific role is requested.

With a token, open the page itself (`http://localhost:<port>`, or `http://<role>.localhost:<port>` as a
role). With a password, sign in at `/login`:

```bash
set -a && . ./.env && set +a                                # load .env into this shell; prints nothing
npx playwright-cli open http://localhost:<port>/login
npx playwright-cli snapshot                                 # refs for the login form
npx playwright-cli fill <user-ref> "$QA_USER_ADMIN"
npx playwright-cli fill <pass-ref> "$QA_PASS_ADMIN" --submit
npx playwright-cli snapshot                                 # verify authenticated state
```

## 4. Verification flow

1. Navigate to the target page (`goto`)
2. `snapshot` the current state; add `screenshot --filename=...` when the check is visual
<!-- only:figma -->
3. If **Figma link** provided — fetch node data with the **`figma-implementation`** skill, compare layout, spacing, colors, typography against the screenshot
<!-- /only -->
<!-- only:no-figma -->
3. If **Figma link** provided — Figma MCP is not set up in this repository, so ask for a reference screenshot or the expected values instead
<!-- /only -->
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
