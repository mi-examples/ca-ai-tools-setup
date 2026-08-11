---
name: frontend-architecture
description: Frontend architecture — component hierarchy, design system first, reuse before create, JS/TS formatting (tooling-first), TypeScript, minimal scope. Use for all development and greenfield pp-dev work.
---

# Frontend Architecture & AI Coding Standards (Claude Code)

Cursor equivalent: **`.cursor/rules/frontend-architecture.mdc`**. Apply on every **development** task unless the user overrides.

Portal Page naming, SCSS modules, BEM, `app-context` / `constants.ts`, `index.html`: **`.claude/agents/code-style.md`** / **`.cursor/rules/code-style.mdc`**.

## Purpose

You are working on an **existing** React + TypeScript Portal Page / Custom App.

Produce **consistent, maintainable, reusable, component-driven** code. Do not treat tasks as isolated. Search and follow existing structure before writing code. Evolve a **consistent component system**.

---

## 1. Component hierarchy

```text
Application → Pages → Widgets → Features → Entities → Shared → Design System → @metricinsights/pp-components
```

Map work to this hierarchy. If folders differ (`src/components/<feature>/`), use the closest layer; do not invent a parallel tree without need.

| Layer | Role | Examples |
|-------|------|----------|
| **Design system** | UI primitives | Button, Input, Modal, Drawer, Tooltip, Table, Icon via `@metricinsights/pp-components` |
| **Shared** | Multi-feature reuse only | PageHeader, SearchBar, EmptyState, Pagination |
| **Entities** | Domain concepts | User, Folder, Element, Announcement |
| **Features** | User actions / business | FavoriteElement, SearchElements, EditFolder |
| **Widgets** | Composed sections | Sidebar, ElementBrowser, AnnouncementPanel |
| **Pages** | Thin composition | Compose widgets/features/shared — not hundreds of lines of JSX |

Prefer thin pages that compose sections rather than monolithic page implementations.

---

## 2. Component-driven development

Before creating: search repo → design system → similar code → reuse/extend props → create only if needed. One responsibility. Split when large/mixed; do not extract every tiny JSX fragment.

---

## 3. Search before writing

**Inspect the repository before new code.** Do not assume missing components, hooks, utils, types, constants, helpers, styles, or API abstractions.

Follow existing patterns when found. Prefer consistency over a “better” new approach (layout primitives, `Button`, SWR hooks like `useSWRUser()` — not ad-hoc `div`/`button`/`fetch`).

---

## 4–5. Design system & styling

Default to pp-components / design-system primitives. No custom primitives when equivalents exist.

Styling: **code-style** (SCSS modules + BEM + tokens). No invented colors/spacing/typography/radii/shadows/breakpoints/z-index/timings when tokens exist. No new CSS framework or methodology without approval.

---

## 6. JavaScript / TypeScript whitespace and formatting

### Source of truth

Apply formatting rules in the following order of precedence:

1. Repository ESLint, Prettier, TypeScript, and formatter configuration.
2. Existing conventions in the current file and surrounding code.
3. Google JavaScript Style Guide — Formatting / Whitespace, as a non-binding fallback:
   https://google.github.io/styleguide/jsguide.html#formatting-whitespace

The Google guide must not override repository tooling or established local conventions. It is not the project's complete coding-style specification.

### Repository formatting rules

Unless a file-specific override applies:

- End every file with a newline.
- Limit lines to **120 characters**.
- Limit each line to at most **3 statements**.
- Use curly braces for all control-flow bodies, including single-statement bodies.
- Format content inside curly braces according to the configured `@stylistic/curly-newline` rule.
- Do not place whitespace before an object property colon.
- Place exactly one space after an object property colon.
- Separate class members with a blank line.
- A blank line is optional after a single-line class member.

### Blank lines between statements

Apply these rules:

- Consecutive `const`, `let`, and `var` declarations may remain together without blank lines.
- Add a blank line after the final declaration in a declaration group when the next statement is not another declaration.
- Add a blank line after a block statement.
- Add a blank line after `if`, `for`, `while`, `switch`, and `try` statements.
- Add a blank line before:
  - `return`;
  - `throw`;
  - `if`;
  - `for`;
  - `while`;
  - `switch`;
  - `try`.
- Consecutive expression statements do not require blank lines.

### Exceptions

Respect all file-specific ESLint and formatter overrides.

For example, the **120-character line limit does not apply** to:

```text
src/components/icon/icons/**/*.tsx
```

This exception exists because inline SVG exports may contain long path definitions.

### Rules for generated or modified code

AI agents and developers must:

- use repository formatting and lint commands when available;
- produce formatter- and lint-compatible code;
- preserve the formatting conventions of the current file;
- avoid unrelated whitespace or formatting changes;
- avoid manually reformatting code against configured tooling;
- preserve file-specific overrides and generated-code exceptions;
- keep formatting-only changes separate from behavioral changes when practical.

If tooling and documentation disagree, tooling takes precedence.

This section covers formatting only. All other repository lint rules—including naming, type safety, React Hooks, console usage, and class organization—remain mandatory and must pass the configured lint checks.

---

## 7. File naming

Use lowercase kebab-case for application source and style filenames:

- `semantic-models-view.tsx`
- `use-semantic-models-map.ts`
- `tableau-data-source-status.helper.ts`
- `modal.module.scss`

Additional requirements:

- Use lowercase letters and hyphens between words.
- Do not use PascalCase, camelCase, spaces, or underscores in regular source filenames.
- Keep acronyms lowercase, such as `bi-tool-icon.tsx`.
- Use `.ts` for TypeScript modules and `.tsx` for modules containing JSX.
- Use `.scss` for styles and `.module.scss` for CSS Modules.
- React component filenames use kebab-case; exported components use PascalCase.
- Hook filenames start with `use-`; exported hooks use camelCase.
- Put role suffixes immediately before the extension, such as `.helper.ts`, `.module.scss`, or `.d.ts`.
- When a file has one primary export, make its filename correspond to that export.
- TypeScript interfaces use PascalCase without an `I` prefix.

Valid exceptions include `index.ts`, declaration files, Sass partials, tool-defined configuration files, and generated or externally supplied filenames that must be preserved.

Repository conventions and tooling-required filenames take precedence over this rule.

---

## 8. TypeScript

Strict typing. Avoid `any` unless documented and unavoidable. Search/reuse/extend types before creating. Do not duplicate domain models.

---

## 9. DO NOT

Never duplicate components/utils/types/APIs; recreate design-system primitives; invent token values; use arbitrary/inline CSS without need; add CSS frameworks; copy-paste instead of reuse; build monoliths; bury API/business logic in presentational components or JSX; bypass hooks/API/state patterns; add deps without checking; silence TS/ESLint with `any`/suppress; mutate shared for feature-only needs; park feature UI in global shared; refactor unrelated code.

---

## 10. Business vs presentation

Prefer `hooks/` (data/business), `components/` (UI), `types/`. Extract when it helps readability/reuse/testability — not for trivial one-liners.

---

## 11. Hooks & API

Reuse existing SWR/API hooks and helpers. One way to access each API.

---

## 12. Naming (symbols)

Purpose-first PascalCase/camelCase symbols (`AccessRequestTable`, `useSWRUser`). Avoid `Data`, `Box`, `Container2`, `Component`, `Wrapper`, `NewComponent`.

Filenames: follow **§7 File naming**. Do not rename existing files unless the task requires it.

---

## 13. File organization

Keep related code co-located (`components/`, `hooks/`, `types/`, `utils/`). No excessive nesting or new trees per tiny component.

---

## 14. Reuse before abstraction

```text
Solved by existing? → Reuse
Configurable/extendable? → Extend
Likely reused? → New reusable component
Else → Keep local to feature/page
```

---

## 15. Minimal scope

Smallest change. No unrelated refactors, renames, migrations, or deps. No drive-by cleanup unless asked.

---

## 16–17. Completion & priority

Verify hierarchy, reuse, design system, tokens, styling method, kebab-case file naming, formatting precedence (tooling → local conventions → Google fallback) + ESLint + types, hooks/API, focused scope.

Priority: architecture → design system → patterns → utils/hooks/types → styling (code-style) → file naming (kebab-case) → JS/TS formatting (tooling → local → Google fallback) → new code.

---

## 18. Expected behavior

Understand → Search → Plan (layer) → Reuse → Implement (smallest) → Validate → Explain briefly when useful (reuse / placement / why new).

---

## Core principle

**Do not write code as if starting a new project.** Match surrounding code.

**Reuse first. Compose second. Abstract when justified. Create new patterns only when necessary.**
