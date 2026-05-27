---
name: figma-implementation
description: Implements UI from Figma via MCP—node JSON, variables, Code Connect, flexbox mapping, tokens. Use when the user mentions Figma, Figma MCP, design-to-code, or selected Figma nodes.
---

# Figma implementation (MCP)

1. **Prioritize data over visuals** — Do not rely only on screenshots. Fetch node JSON and read spacing, gap, colors, font size.
2. **Deep inspection** — For the selected node, recurse into children. Use `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`.
3. **Variables and styles** — Resolve Figma `styles` and `variables` to project tokens (CSS variables, SCSS variables, theme). Avoid raw hex when a named token exists.
4. **Code Connect first** — If Code Connect is present, treat linked snippets and component docs as source of truth.
5. **Auto-layout → CSS** — Map auto-layout to Flexbox/Grid (`space-between`, hug/fill, gaps).
6. **Reuse in-repo UI** — Prefer existing components in **`src/components/`** before adding new primitives.
7. **Token-safe review** — Reject diffs that replace semantic tokens with arbitrary constants unless explicitly allowed.
