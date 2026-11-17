---
description: Linear issue state gates before AI testing or AI development work
apply: always
---

# Linear task gates (mandatory)

Before **any** work driven by a Linear issue, run:

```bash
linear-cli i get <ISSUE_KEY> -o json
```

Read **`state.name`** from the response.

## AI testing workflow

- **Proceed only if** `state.name` is exactly **`Waiting AI Test`**.
- If the state differs: **stop**, report the current state, and ask the user to move the issue in Linear (or to
  give an explicit override). **Do not** start automated / AI-first **testing** work from the wrong column.

## AI development workflow (implement only; not testing-first)

- **Proceed only if** `state.name` is exactly **`Waiting AI Development`**.
- If the Linear team uses a different name for this state, list the team's states
  (`linear-cli statuses list --team "<Team from issue>"`) and ask the developer which one stands for it.
- If the state differs: **stop** and report — same pattern as testing.
- When allowed to proceed: follow the **`ai-development`** skill. The **operator** chooses with the agent
  **full** (new React + Vite + pp-dev project) vs **fixes** (bug work in an existing repo); both start from the
  same issue and the same Figma → stories → acceptance criteria order where applicable.

## After commits or a merge

On a branch whose name contains a Linear issue key, after commits land or after the branch merges to `main`, use
the **`linear-merge-notification`** skill: it tells the user where the page or template lives and offers the
links comment for the issue.

## Related skills

- **`start-working-with-task`** — entry point for any Linear issue; routes by state.
- **`linear-workflow`** — Linear commands (fetch, comments, states, comment).
- **`testing-with-linear`** — AI testing after the gate (full QA: `testing-flow` → `linear-report`).
- **`ui-check-simple`** — quick UI check without the full QA flow.
