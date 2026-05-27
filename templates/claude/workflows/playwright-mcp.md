# Playwright MCP Workflow

Use this workflow for browser automation, UI verification, manual QA execution,
and debugging UI failures through the Playwright MCP server.

## Tool Categories

### Navigation and Page

| Tool | Purpose |
| --- | --- |
| `playwright_navigate` | Navigate to a URL |
| `playwright_go_back` | Browser history back |
| `playwright_go_forward` | Browser history forward |
| `playwright_close` | Close browser and release resources |
| `playwright_resize` | Change viewport by width/height or device preset |
| `playwright_custom_user_agent` | Set custom user agent |

### Interaction

| Tool | Purpose |
| --- | --- |
| `playwright_click` | Click an element by selector |
| `playwright_click_and_switch_tab` | Click and switch to a newly opened tab |
| `playwright_fill` | Fill an input field |
| `playwright_select` | Select from a dropdown |
| `playwright_hover` | Hover over an element |
| `playwright_drag` | Drag an element to a target |
| `playwright_press_key` | Press a keyboard key |
| `playwright_upload_file` | Upload a file through an input |

### Iframes

| Tool | Purpose |
| --- | --- |
| `playwright_iframe_click` | Click inside an iframe |
| `playwright_iframe_fill` | Fill an input inside an iframe |

### Inspection and Evaluation

| Tool | Purpose |
| --- | --- |
| `playwright_evaluate` | Execute JavaScript in the browser |
| `playwright_get_visible_html` | Get visible HTML, optionally scoped |
| `playwright_get_visible_text` | Get visible text |
| `playwright_console_logs` | Retrieve console logs |
| `playwright_screenshot` | Capture a page or element screenshot |
| `playwright_save_as_pdf` | Save the page as PDF |

### HTTP API

| Tool | Purpose |
| --- | --- |
| `playwright_get` | HTTP GET |
| `playwright_post` | HTTP POST |
| `playwright_put` | HTTP PUT |
| `playwright_patch` | HTTP PATCH |
| `playwright_delete` | HTTP DELETE |
| `playwright_expect_response` | Start waiting for a response |
| `playwright_assert_response` | Validate a waited response |

## `playwright_evaluate` Pattern

Always wrap scripts in an IIFE. Bare expressions may not return values.

```javascript
(function() {
  var el = document.querySelector('svg path');
  var s = getComputedStyle(el);
  return { fill: s.fill, fillOpacity: s.fillOpacity };
})()
```

For async API checks, use an async IIFE:

```javascript
(async () => {
  const r = await fetch('/api/folder?json=1');
  return await r.json();
})()
```

## Screenshots

Use `playwright_screenshot` with `savePng: true` and a local downloads
directory under:

`test-documentation/<CONTEXT_KEY>/screenshots/`

For Linear comments, local paths are not enough. Upload screenshots to Linear
Cloud first using `./.claude/workflows/linear-report.md`.

## Known Limitation: New Tabs

`playwright_click_and_switch_tab` may report a false negative for
`window.open(url, "_blank")` in a sandboxed context. If it times out, verify
with `playwright_evaluate`:

```javascript
(function() {
  var called = null;
  var orig = window.open;
  window.open = function(url, target) {
    called = { url: url, target: target };
    return orig.apply(window, arguments);
  };
  document.querySelector('[class*="edit"]').click();
  window.open = orig;
  return called;
})()
```

If this returns a URL and `_blank`, the app behavior is likely correct and the
failure is in the MCP tool.

## Failure Investigation

When a browser check fails:

1. Capture a screenshot.
2. Confirm the current URL.
3. Read console logs and filter for `TypeError`, `Error`, and `Uncaught`.
4. Inspect visible HTML or text around the failing element.
5. Use `playwright_evaluate` or direct HTTP tools to verify API data.
6. Trace likely UI, routing, data, or state source in the codebase.
