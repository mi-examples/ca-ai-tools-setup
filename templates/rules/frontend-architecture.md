---
description: Frontend architecture — component hierarchy, design system first, reuse, JS/TS formatting (tooling-first), file naming, TypeScript, minimal scope
paths:
  - src/**
---

# Frontend architecture

You are working in an **existing** React + TypeScript application (Portal Page / Custom App with pp-dev). Do
not write code as if starting a new project: the best change looks like it was written by the same developer as
the code around it. **Reuse first, compose second, abstract when justified, add a new pattern only when nothing
fits.**

Component and file naming details for SCSS modules, BEM, `app-context` / `constants.ts` and `index.html`
globals are in the **`code-style`** rule.

## Before writing code

1. Read the files you are going to change and the code around them.
2. Search the repository and **`@metricinsights/pp-components`** for a component, hook, utility, type,
   constant, style pattern or API abstraction that already does the job. Do not assume it is missing.
3. Decide:
   - it exists → reuse it;
   - it almost fits → extend it through props or configuration;
   - it will clearly be reused → create a reusable piece in the right layer;
   - otherwise → keep it local to the feature or page.
4. When a similar solution exists, follow its pattern. Consistency beats a "cleaner" new approach.

What not to do when the pattern already exists: a `div` with ad-hoc flex classes where the project has layout
primitives; a custom `<button className="…">` where `<Button variant="primary">` exists; raw `fetch` / `axios`
where an SWR hook such as `useSWRUser()` already wraps the API.

## Component hierarchy

```text
Application
  └── Pages
        └── Widgets
              └── Features
                    └── Entities
                          └── Shared
                                └── Design System
                                      └── @metricinsights/pp-components
```

Map new work to the closest existing layer. When the repository layout differs (for example
`src/components/<feature>/`), follow that layout and keep responsibilities clear; do not start a parallel tree.

| Layer | Holds | Examples |
| --- | --- | --- |
| Design system | Lowest-level UI from `@metricinsights/pp-components` and project wrappers. Never recreate a primitive that exists. | Button, Input, Select, Modal, Tooltip, Table, Card, Icon |
| Shared | Pieces used by several features — only if genuinely multi-feature. | PageHeader, SearchBar, FilterBar, EmptyState, Pagination |
| Entities | Domain concepts, with their UI and logic kept close. | User, Folder, Element, Report, Announcement |
| Features | One user action or business function. Feature-specific UI stays here, not in Shared. | CreateUser, EditFolder, SearchElements, RequestAccess |
| Widgets | Larger sections composed from features and components — compose, do not reimplement. | Sidebar, ElementBrowser, SearchPanel |
| Pages | Compose widgets, features and shared. Keep pages thin. | see below |

```tsx
export function AccessRequestsPage() {
  return (
    <>
      <PageHeader />
      <AccessRequestFilters />
      <AccessRequestTable />
    </>
  );
}
```

One clear responsibility per component. Split a component that grew too large or mixes concerns, but do not
extract every small JSX fragment — only when it helps reuse, readability or separation. No large monolithic
components and no hundreds of lines of JSX in a page.

## Business logic and data

- Keep data and business logic in hooks (`hooks/`), presentation in components (`components/`), shared shapes
  in `types/`. Avoid one file that holds API calls, state, transforms, rules, handlers and a large JSX tree;
  extract when it helps readability, reuse or testability, not for trivial logic.
- Use the existing SWR / API abstractions and state-management patterns. Before a new call, search hooks, API
  methods, types and helpers. Never add a second way to reach the same API.
- No unrelated business logic or API calls in presentational components, and no complex logic inside JSX.

## Styling

Follow the **`code-style`** rule (SCSS modules, BEM, tokens). Do not invent colors, font sizes or weights,
spacing, radii, shadows, breakpoints, z-index or animation timings when the design system, `_variables` or
mixins provide them. No inline or arbitrary CSS unless required, and no new CSS framework or styling
methodology without explicit approval.

## Formatting

Order of precedence:

1. Repository ESLint, Prettier, TypeScript and formatter configuration.
2. Conventions of the current file and the surrounding code.
3. Google JavaScript Style Guide — Formatting / Whitespace, as a non-binding fallback:
   https://google.github.io/styleguide/jsguide.html#formatting-whitespace

If tooling and this text disagree, tooling wins. Unless a file-specific override applies:

- End every file with a newline; limit lines to **120 characters**; at most **3 statements** per line.
- Use curly braces for all control-flow bodies, including single-statement ones; format their content
  according to the configured `@stylistic/curly-newline` rule.
- No whitespace before an object property colon, exactly one space after it.
- Separate class members with a blank line (optional after a single-line member).
- Consecutive `const`, `let` and `var` declarations may stay together; add a blank line after the last one
  when the next statement is not a declaration.
- Add a blank line after a block statement and after `if`, `for`, `while`, `switch` and `try`; add one before
  `return`, `throw`, `if`, `for`, `while`, `switch` and `try`. Consecutive expression statements need none.

Respect file-specific ESLint and formatter overrides. The 120-character limit does not apply to
`src/components/icon/icons/**/*.tsx`, where inline SVG exports have long path definitions.

Use the repository's formatting and lint commands when they exist, keep the formatting of the file you edit,
and keep formatting-only changes apart from behavioural ones when practical. This section covers formatting
only: all other lint rules — naming, type safety, React Hooks, console usage, class organization — stay
mandatory.

## File naming

Lowercase kebab-case for source and style files: `semantic-models-view.tsx`, `use-semantic-models-map.ts`,
`tableau-data-source-status.helper.ts`, `modal.module.scss`.

- Lowercase letters and hyphens only — no PascalCase, camelCase, spaces or underscores; acronyms stay
  lowercase (`bi-tool-icon.tsx`).
- `.ts` for TypeScript modules, `.tsx` for modules with JSX, `.scss` for styles, `.module.scss` for CSS
  Modules.
- Component files are kebab-case, exported components PascalCase. Hook files start with `use-`, exported hooks
  are camelCase.
- Role suffixes go right before the extension: `.helper.ts`, `.module.scss`, `.d.ts`.
- A file with one primary export is named after that export. Interfaces are PascalCase without an `I` prefix.
- Exceptions: `index.ts`, declaration files, Sass partials, tool-defined configuration files, and generated or
  externally supplied names. Repository conventions and tooling-required names take precedence.
- Do not rename existing files unless the task requires it.

## Naming

Descriptive, purpose-first names (`AccessRequestTable`, `SearchElements`, `AnnouncementPanel`). Avoid `Data`,
`Box`, `Container2`, `Component`, `Wrapper`, `NewComponent`.

## TypeScript

Use TypeScript strictly. Avoid `any` unless documented and unavoidable, and never silence TypeScript or ESLint
errors without understanding them. Before a new type: search, reuse, extend, and only then create. Do not
duplicate domain models.

## File organization

Keep related code together, for example:

```text
feature/
├── components/
├── hooks/
├── types/
├── utils/
└── index.ts
```

No excessive nesting and no new directory structure for a tiny component. Follow the layout the repository
already has.

## Scope

Make the smallest change that fits the existing architecture. No unrelated refactors, renames, migrations or
drive-by cleanup unless asked; no new dependency without checking the existing ones. Do not change a shared
component to solve a feature-only problem, do not put feature-specific components in the shared layer, and do
not copy a component instead of making it reusable.

## Before you finish

Check: the right layer; reuse was searched for; design system, tokens and styling method; kebab-case file
names; formatting, ESLint and types pass; hooks, utilities, types and API abstractions reused; no unrelated
refactor or dependency. When it is useful, say what was reused, where the new code lives and why new code was
needed; skip the explanation for straightforward changes.
