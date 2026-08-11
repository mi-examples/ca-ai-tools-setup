---
name: commit-convention
description: Git commit message format — Angular commit message convention (type(scope): subject, body, footer). Use whenever generating, editing, or reviewing a commit message.
---

# Commit Message Convention (Claude Code)

Cursor equivalent: **`.cursor/rules/commit-convention.mdc`**. Apply whenever you generate, edit, or review a Git commit message in this repo — not only for `feat`/`fix` work.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

- The header (`<type>(<scope>): <subject>`) is required; `(<scope>)` is optional. Body and footer are optional and separated from the header — and from each other — by one blank line.
- Keep the header to **72 characters or fewer**; GitHub/CLI UIs truncate longer ones.

## Type

| Type | Use for |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting/whitespace only — no code meaning change |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A change that improves performance |
| `test` | Adding or correcting tests |
| `build` | Changes to the build system or external dependencies |
| `ci` | Changes to CI configuration or scripts |
| `chore` | Maintenance that doesn't fit any type above (tooling, dependency bumps, etc.) |
| `revert` | Reverts a previous commit — body: `This reverts commit <sha>.` |

## Scope

Optional, lowercase, names the affected area — a component, feature, skill/workflow file, or the Linear issue key when the commit is issue-driven (e.g. `fix(sidebar): …`, `feat(pp-1234): …`). Omit it when the change is repo-wide or a scope would just be noise.

## Subject

- Imperative, present tense — "add", not "added" or "adds".
- No capital letter at the start, no period at the end.
- Say what the commit does, not what you did.

## Body

- Optional. Explain **why**, not just what — motivation, and contrast with previous behavior.
- Wrap at roughly **100 characters**. Imperative, present tense, same as the subject.

## Footer

- **Breaking changes:** start a line with `BREAKING CHANGE: ` followed by the change, the justification, and migration notes.
- **Issue references:** `Closes #123`, `Refs #123`, or a Linear issue key (`Refs PP-1234`).

## Examples

```
feat(sidebar): add collapse toggle for narrow viewports
```

```
fix(auth): retry token refresh once before falling back to login

The proxy occasionally returns a transient 401 on the first request after
token rotation. Retrying once avoids bouncing the user to /login for what
is usually a one-off race.

Refs PP-1234
```

## Notes

- Merge commits created by GitHub (`Merge pull request #N from …`) are exempt — they follow GitHub's own format, not this convention.
- Keep unrelated changes in separate commits, each with its own header — don't combine `feat` and `fix` under one header just because they landed together.
