---
name: figma-implementation
description: Implements UI from a Figma design through the Figma MCP server—node data, layout mapping, design tokens, SVG and PNG assets, and a visual check against the design. Use when the user mentions Figma, gives a Figma link or node, asks for design-to-code, or wants the UI to match a design.
---

# Figma implementation

The design is read through the **Framelink Figma MCP** server (`figma-developer-mcp`), registered as
**`figma`** in the project MCP file. It signs in with the personal access token in **`FIGMA_API_KEY`**
(see the **`portal-env-credentials`** skill) — no OAuth, no browser sign-in. It has two tools:

| Tool | Use it to |
| --- | --- |
| `get_figma_data` | read a frame or component: layout, text, colors, effects, component info |
| `download_figma_images` | save SVG, PNG or GIF exports of nodes into the repository |

Read the design as **data**. A screenshot alone loses the numbers: spacing, sizes, colors, font styles.

## 1. Read the link

| URL | `fileKey` | `nodeId` |
| --- | --- | --- |
| `figma.com/design/<fileKey>/<name>?node-id=12-34` | `<fileKey>` | `12:34` |
| `figma.com/file/<fileKey>/<name>?node-id=12-34` | `<fileKey>` | `12:34` |
| `figma.com/design/<fileKey>/branch/<branchKey>/<name>?node-id=12-34` | `<branchKey>` | `12:34` |

- `node-id` uses hyphens in the URL and colons in the tools: `12-34` → `12:34`.
- No `node-id` in the link: ask for a link to the frame (**Copy link to selection** in Figma). Fetching
  a whole file is slow, floods the context and runs into the rate limit.

## 2. Fetch the design

Call `get_figma_data` with `fileKey` and `nodeId`. Leave `depth` unset. If the answer is too large,
fetch the child frames one at a time by their node ids instead of cutting the depth.

Read from the answer, for the node and its children:

- **layout** — direction, alignment, gap, padding, sizing (fixed, hug, fill), constraints;
- **text** — content, font family, size, weight, line height, letter spacing;
- **fills, strokes, effects, corner radius** — and the name of the style or variable when the design has one;
- **components** — which nodes are instances of the same component, and their variant properties.

## 3. Map it to this codebase

1. **Reuse first.** Look in **`src/components/`** and the design system for a component that already
   does this, and extend it before adding a new primitive.
2. **Tokens, not raw values.** Resolve colors, typography and spacing to the project's SCSS variables or
   CSS custom properties. Use a raw hex or pixel value only when no token exists — and say so in the
   summary, so a token can be added on purpose rather than by accident.
3. **Auto-layout → CSS:**

   | Figma | CSS |
   | --- | --- |
   | horizontal / vertical auto-layout | `display: flex` with `flex-direction: row` / `column` |
   | primary-axis alignment (start, center, end, space between) | `justify-content` |
   | counter-axis alignment | `align-items` |
   | item spacing | `gap` |
   | padding | `padding` |
   | hug contents | no fixed size (`width: auto` / `fit-content`) |
   | fill container | `flex: 1` or `align-self: stretch` |
   | fixed size | explicit `width` / `height` |
   | wrap | `flex-wrap: wrap` |

4. **Styling** follows the **`code-style`** rule: SCSS modules, BEM and the shared tokens.

## 4. Assets

Call `download_figma_images` with `fileKey`, `localPath` (a folder relative to the repository root, for
example `src/assets/icons`) and `nodes` — one entry per export with `nodeId` and `fileName` (the
extension decides the format: `.svg`, `.png`, `.gif`). Pass `imageRef` or `gifRef` when the node data
has one. `pngScale` defaults to 2.

- **SVG first** for icons, logos and other vector artwork. One merged SVG for a compound icon, not a
  stack of small raster slices.
- Raster only for real bitmaps (photos, textures) — say which and why.
- Put assets where the code that uses them expects them, following the patterns already in `src/`:
  an inline React SVG component, or an imported `.svg` file when the asset must stay static.

## 5. Check the result against the design

1. Export the frame itself as a PNG with `download_figma_images` into **`.playwright-cli/figma/`**
   (ignored by git) — this is the reference image.
2. Open the page with the **`playwright-cli`** skill at the frame's width and take a screenshot.
3. Compare the two: layout, spacing, colors, typography, states. Where a value is in doubt, read it
   from the page with `eval` (computed styles) and from the node data — not from the pixels.
4. Fix the differences, or list the ones that remain and why.

## When the server is missing or fails

Do not guess a design from its link or its name. Stop and report what is missing.

| What you see | Cause | What to do |
| --- | --- | --- |
| No `get_figma_data` tool | the `figma` server is not enabled, or it stopped at start because it found no token (`Either FIGMA_API_KEY or FIGMA_OAUTH_TOKEN is required`) | Claude Code: check `/mcp`. Cursor: **Settings → MCP**, toggle the server on and refresh. No token: put it into **`.env`** at the repository root as `FIGMA_API_KEY=...` (or set it as an environment variable), then reload the MCP server. |
| `403` | a wrong or expired token, or no access to the file | Replace the token in **`.env`** and reload the MCP server. The token needs read access to file content, and its owner needs access to the file. |
| `404` | wrong `fileKey` or `nodeId`, or a branch link read with the file key | Re-read the link (step 1). |
| `429` rate limit | too many or too large requests | Wait as long as the message says, then fetch a smaller node. Never retry in a loop. |

Never write the token into a tracked file, a Linear comment or the chat.
