---
name: figma-implementation
description: Implements UI from Figma via MCP—node JSON, variables, Code Connect, flexbox mapping, tokens, SVG assets. Use when the user mentions Figma, Figma MCP, design-to-code, visual matching, or selected Figma nodes.
---

# Figma implementation (MCP)

1. **Prioritize data over visuals** — Do not rely only on screenshots. Fetch node JSON and read spacing, gap, colors, font size.
2. **Deep inspection** — For the selected node, recurse into children. Use `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`.
3. **Variables and styles** — Resolve Figma `styles` and `variables` to project tokens (CSS variables, SCSS variables, theme). Avoid raw hex when a named token exists.
4. **Code Connect first** — If Code Connect is present, treat linked snippets and component docs as source of truth.
5. **Auto-layout → CSS** — Map auto-layout to Flexbox/Grid (`space-between`, hug/fill, gaps).
6. **Reuse in-repo UI** — Prefer existing components in **`src/components/`** and the design system before adding new primitives.
7. **Token-safe review** — Before finishing, re-check node structure and constraints, and reject diffs that replace semantic tokens with arbitrary constants unless explicitly allowed.
8. **SVG-first assets** — When bringing icons, logos or other non-photo graphics from Figma into this repo, use **SVG whenever possible**: export or reconstruct vector artwork as `.svg` (inline React components or imported static assets — follow the existing patterns in `src/`). Do **not** default to raster asset URLs or stacks of raster slices for crisp UI icons; reserve raster for genuinely bitmap-only art (photos, textured bitmaps) and document the exception. For compound vector icons, prefer a **single merged SVG** over many tiny PNG layers.
9. **Download SVGs with the MCP when it can** — When the Figma MCP server offers **`download_figma_images`**, use it (`fileKey`, `localPath`, `nodes[]` with `nodeId` + `fileName` ending in `.svg`) to write exports next to the consuming code, for example under `src/components/icon/icons/`. It needs a valid **`FIGMA_API_KEY`** and access to the file. After download, prefer **inline React SVG components**, or keep a co-located `.svg` when the asset must stay static (e.g. pattern + embedded bitmap).

Styling follows the **`code-style`** rule: SCSS modules, BEM and the shared tokens.
