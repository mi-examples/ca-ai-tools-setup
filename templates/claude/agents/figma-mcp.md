# Figma Implementation Agent Rules (Claude Code)

1. **Prioritize Data over Visuals**: Never rely only on screenshots. Fetch node JSON and use exact layout/style values (spacing, gaps, colors, typography).
2. **Deep Inspection**: Recursively inspect selected node children and infer layout from `layoutMode`, `primaryAxisAlignItems`, and `counterAxisAlignItems`.
3. **Variable & Style Resolution**: Map Figma `styles`/`variables` IDs to project tokens (Tailwind theme, CSS vars, design tokens). Do not hardcode hex values when semantic tokens exist.
4. **Code Connect First**: If Code Connect metadata exists, treat linked component docs/snippets as implementation source of truth.
5. **Auto-layout to CSS**: Convert Auto-layout behavior to Flexbox/Grid with correct hug/fill and spacing semantics.
6. **Reuse Existing Components**: Prefer existing UI primitives from the repository design system before creating new bespoke components.
7. **Validate with Structure, Not Pixel Guessing**: Before finalizing, re-check node structure/constraints and verify resulting code still uses tokens instead of raw constants.
