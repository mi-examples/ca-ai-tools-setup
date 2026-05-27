---
name: playwright-mcp
description: Playwright MCP tools reference for browser automation—tool catalog, evaluate patterns, viewport testing, known limitations, and Cursor subagent type guidance. Use when working with Playwright MCP, browser-use subagent, or automated UI testing.
---

# Playwright MCP Tools

Reference for the `user-playwright` MCP server (ExecuteAutomation). Used by `browser-use` subagent and `playwright-test-*` subagents in Cursor.

## Tools by category

### Navigation & page

| Tool | Purpose |
|------|---------|
| `playwright_navigate` | Navigate to a URL |
| `playwright_go_back` | Browser history back |
| `playwright_go_forward` | Browser history forward |
| `playwright_close` | Close browser, release resources |
| `playwright_resize` | Change viewport — `width`/`height` or 143+ device presets (`"iPhone 13"`, `"iPad Pro 11"`) |
| `playwright_custom_user_agent` | Set custom User-Agent |

### Interaction

| Tool | Purpose |
|------|---------|
| `playwright_click` | Click element (CSS selector) |
| `playwright_click_and_switch_tab` | Click and switch to newly opened tab |
| `playwright_fill` | Fill input field |
| `playwright_select` | Select from `<select>` dropdown |
| `playwright_hover` | Hover over element |
| `playwright_drag` | Drag element to target |
| `playwright_press_key` | Press keyboard key |
| `playwright_upload_file` | Upload file to `<input type="file">` |

### Iframe

| Tool | Purpose |
|------|---------|
| `playwright_iframe_click` | Click element inside iframe |
| `playwright_iframe_fill` | Fill input inside iframe |

### Inspection & evaluation

| Tool | Purpose |
|------|---------|
| `playwright_evaluate` | Execute JavaScript in browser (**IIFE pattern required** — see below) |
| `playwright_get_visible_html` | Get page HTML (use `selector` to scope, `removeScripts: true` default) |
| `playwright_get_visible_text` | Get visible text content |
| `playwright_console_logs` | Retrieve console logs (filter for `TypeError`, `Error`, `Uncaught`) |
| `playwright_screenshot` | Screenshot page or element (`savePng: true`, `downloadsDir` for local saves) |
| `playwright_save_as_pdf` | Save page as PDF |

### HTTP API (direct requests)

| Tool | Purpose |
|------|---------|
| `playwright_get` | HTTP GET |
| `playwright_post` | HTTP POST |
| `playwright_put` | HTTP PUT |
| `playwright_patch` | HTTP PATCH |
| `playwright_delete` | HTTP DELETE |
| `playwright_expect_response` | Start waiting for an HTTP response |
| `playwright_assert_response` | Validate a previously initiated response wait |

### Codegen sessions

| Tool | Purpose |
|------|---------|
| `start_codegen_session` | Record Playwright actions into a test |
| `get_codegen_session` | Get session info |
| `end_codegen_session` | End session, generate test file |
| `clear_codegen_session` | Clear session without generating |

## `playwright_evaluate` — IIFE pattern

Always wrap scripts in an IIFE. Bare expressions may not return values.

```javascript
// Computed style
(function() {
  var el = document.querySelector('svg path');
  var s = getComputedStyle(el);
  return { fill: s.fill, fillOpacity: s.fillOpacity };
})()

// Bounding box / dimensions
(function() {
  var rect = document.querySelector('svg').getBoundingClientRect();
  return { width: rect.width, height: rect.height };
})()

// Async (API check) — must be async IIFE
(async () => {
  const r = await fetch('/api/folder?json=1');
  return await r.json();
})()
```

## Known limitations

### `playwright_click_and_switch_tab` false negatives
Listens for a Playwright `popup` event which may not fire for `window.open(url, "_blank")` in the sandboxed context. If it times out, verify via `playwright_evaluate`:

```javascript
(function() {
  var called = null;
  var orig = window.open;
  window.open = function(url, target) { called = { url: url, target: target }; return orig.apply(window, arguments); };
  document.querySelector('[class*="edit"]').click();
  window.open = orig;
  return called;
})()
```

If this returns `{ url: "...", target: "_blank" }` — the app is correct, the failure is in the MCP tool.

### `playwright_screenshot` local saves
Use `savePng: true` and `downloadsDir: "/path/to/screenshots"` to save locally. For Linear comments, screenshots must be uploaded to Linear Cloud first — see `linear-report` skill.

## Cursor subagent types

| Subagent | When to use |
|----------|-------------|
| `browser-use` | Manual QA execution, ad-hoc browser checks, running test cases from `test-cases.md` |
| `playwright-test-planner` | Creating a test plan by exploring the app UI via browser |
| `playwright-test-generator` | Generating `.spec.ts` Playwright test files from a test plan |
| `playwright-test-healer` | Debugging and fixing failing Playwright tests |

Use `browser-use` for the QA AI workflow (executing manual TCs via MCP tools). Use `playwright-test-*` subagents when working with automated Playwright test suites.
