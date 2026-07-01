---
name: code-style
description: Portal Page component naming, SCSS modules, BEM, app context, constants.ts, and index.html PP_VARIABLES. Use for all development and greenfield pp-dev work.
---

# Portal Page code style (Claude Code)

Cursor equivalent: **`.cursor/rules/code-style.mdc`**. Apply on every **development** task in this repo unless the user explicitly overrides.

## Components and files

- **Component filenames** start with a **lowercase** letter — **camelCase**, not PascalCase.
  - ✅ `headerMain.tsx` · ❌ `HeaderMain.tsx`
- **One feature per folder** under `src/components/<feature>/`.
- **Default export** for the main component; symbol name **PascalCase** inside the file.
- **Search before creating** — extend existing components/hooks/helpers when possible.

## Styles (SCSS modules + BEM)

- **Only `.scss`** for component/layout styles.
- **CSS Modules only** — co-locate `<name>.module.scss` (e.g. `headerMain.module.scss`).
- Import as `styles`; use **`styles.className`** in TSX — never bare global class strings for new UI.

```tsx
import styles from "./headerMain.module.scss";

<div className={styles.headerMain}>
  <span className={styles.headerMain__title} />
</div>
```

- **BEM** in SCSS: `block`, `block__element`, `block--modifier`.
- **Modifiers:** `clsx(styles.block, { [styles["block--active"]]: active })`.
- Prefer **`src/assets/styles/_variables.scss`** and **`_mixins.scss`** over hardcoded colors/spacing.

## App shell (`src/`)

| File | Role |
|------|------|
| **`app-context.ts`** | Context type, `createContext`, `useAppContext` |
| **`app-provider.tsx`** | Provider; wraps `<App />` in `main.tsx` |
| **`constants.ts`** | **`PP_VARIABLES`** (from `window`) + **`PP_CONSTANTS`** (in-repo) |

### `constants.ts`

- Declare **`PPVariables`** interface and **`Window.PP_VARIABLES`**.
- Export **`PP_VARIABLES`** with the safe `window` guard (see **`src/constants.ts`** in this repo).
- Export **`PPConstants`** / **`PP_CONSTANTS`** for static keys (storage keys, default names, etc.).
- When adding a `window.PP_VARIABLES` key, update **`PPVariables`**, **`index.html`**, and any consumers together.

## `index.html`

**Favicon** in `<head>`:

```html
<link rel="shortcut icon" type="image/x-icon" sizes="any" href="/img/favicon/favicon.ico">
```

**Globals** — script before **`</html>`**:

```html
<script>
  window.PP_VARIABLES = {
    WELCOME_MESSAGE: "[Welcome message]",
    // …keys from PPVariables
  };
</script>
```

Use MI placeholder tokens; never commit real instance values.

## General

- TypeScript; path alias **`@/`** → `src/`.
- On legacy files, match existing naming in that folder; on **new** work, follow this doc strictly.
