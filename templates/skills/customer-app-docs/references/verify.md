# Verify — where facts live, the ledger, the audit

Used by the extraction subagents (step 2) and the audit subagent (step 5) in `../SKILL.md`.
Differences the extractions surface are settled with the user in step 3, before any writing.

Read **all three** sources for every app — Linear description and comments, the code, and
`test-documentation/` — then compare them claim by claim. None of them is authoritative alone; each
has its own failure mode (plans that never shipped, code that is unreachable or fed by mock data,
test docs that predate a fix). The block schema in `../SKILL.md` is the shape of this.

---

## The fact ledger

One file per app: `docs/customer/<customer-slug>/facts/<app-slug>.md`. It is the extraction
subagent's only output and the audit subagent's only starting point.

One column per source, so agreement, silence and conflict are visible at a glance:

```markdown
# Facts — job-site-portal

Repo: <repo> @ <commit sha>   Documented against: Metric Insights 7.2.2   Extracted: 2026-09-09

| # | Claim | Value | Linear | Code | Test docs | Verdict |
|---|---|---|---|---|---|---|
| 1 | Variables the app reads | 7 of 7 declared, none unused | PP-3636 desc | `index.html:13-21` + `src/constants.ts:1-9` | — | confirmed |
| 2 | Tile rows filtered by job | rows kept where `job_id` matches the active job | PP-3585 AC | `src/utils/sections.ts:24` | TC-31 | confirmed |
| 3 | Empty events dataset | card is hidden, no empty-state message | PP-3582 AC asks for a message | `UpcomingEvents.tsx:41` returns null | notes flag the gap | conflict → raised |
| 4 | Header initials | static `JD`, not the signed-in user | — | `src/data/mockData.ts:8` | TC-01 expects the user's initials | conflict → raised |
| 5 | Group-based visibility | row shown when the user's groups intersect the row's | PP-3585 comment | `section-availability.ts:18` | TC-31 | confirmed |
| 6 | Notification cadence | ~10 min | PP-3829 comment | not in this repo | — | reported |
```

Rules:

- **One row per statement the document could make.** A sentence with no row does not ship — delete
  the sentence or extract the fact.
- **Fill all three source columns for every row.** `—` means "checked, says nothing"; never leave a
  column blank because you did not look. A row with two `—`s is a single-source claim by definition.
- **Each cell must be precise enough to re-check**: `path:line`, an issue key plus where in it
  (`desc`, `comment`), `TC-nn`, `BUG-nn`, or an `Admin → …` screen.
- **`Verdict` comes from the comparison, not from which source you trust**:

  | Verdict | When |
  |---|---|
  | `confirmed` | Every source that speaks to the claim agrees. One or two silent columns are fine. |
  | `reported` | Only one source supports it and the others are silent. Must not become a confident sentence. |
  | `conflict` | Two or more sources disagree. Raise it with the user; never decide it yourself. |
  | `unknown` | No source settles it. Becomes `TODO confirm:` or gets left out. |

- **A conflict is a row, not a deletion.** Record what each source says, note which evidence is
  newer, and let the user decide what shipped.
- Never upgrade a verdict to make a row look better.
- Record the **commit sha**. A ledger without one cannot be re-verified later.
- No credentials, tokens, instance URLs, real usernames or PII — in the ledger either.

## Where facts live in a Custom App repo

These repos share a layout (`pp-dev.config.ts`, `index.html`, `src/`). Look here, in this order:

| Fact | Where |
|---|---|
| Variables as an admin sees them | `index.html` — `window.PP_VARIABLES = { KEY: "[Variable Name]" }`. The **`[Bracketed Label]`** is the admin-facing name for the `VARIABLES` table; the JS key is not. |
| Variable types | The `PPVariables` interface in `src/constants.ts` (or `src/app-config.ts`). `string` → `Text`, `number` → `Number`, object array → `List`, a dataset id → `Dataset`. Members are often all optional, so optionality proves nothing — find the branch that runs when the value is absent before writing "empty hides …". |
| Which variables are actually read | `grep -rn "PP_VARIABLES\|getPPVariables\|usePPVariables" src`. Declared but never read → not documented, noted as unused. Read but not declared → a bug to report, not a behaviour to document. |
| Endpoints and payloads | `src/api/*`. An axios instance with `baseURL: "/api"` means `api.get("dataset_data?dataset=…")` is documented as `GET api/dataset_data`. Quote payload keys from the call, not from the type. |
| Dataset entities and their filters | The ids and filter keys passed to the dataset calls and hooks (`src/hooks/useDatasetRows.ts`, `src/utils/dataset-*.ts`). Row filtering by a scope key such as `job_id` is a per-section fact, not a global one — check each section. |
| What a region shows, and when it shows nothing | The component that renders it. A component returning `null` on an empty dataset is a **documentable** behaviour ("the card is hidden when there are no events"), not an omission. |
| Visibility and scoping | `src/context/*Context.tsx`, `src/hooks/use*Access.ts`, `use*Availability.ts`, `src/utils/roles.ts`, plus the usermap and per-group variables. Confirm the wildcard value, the no-rows case and the variable-unset case separately — all three go in `WHO SEES WHAT`. |
| Field validation and gating | The form components — the `disabled` expression on the submit control and the per-field validators. Trimming and blank-only handling live there too. |
| On-screen wording | The component that renders it, but prefer wording quoted in an **executed** test case: that proves the string is reachable. |
| Routing and link forms | `src/routes/*`, `src/hooks/use*FromUrl.ts`, `src/utils/*-path.ts` — every accepted form (trailing path segment, prefixed path, query parameter) and what clears a stored value. |
| Scripts, bursts, schedules | Rarely in the repo. Confirm from the instance and the issue that added them; mark those rows `reported` unless a test case exercised the chain. |
| Platform version | `.dev-environment.md`, or the target instance. Never guess it. |

**The mock-data trap.** `src/data/mockData.ts` and `src/data/fallbackData.ts` exist so the app runs
without a configured instance. A value that reaches the screen from there is *not* a documentable
behaviour of the delivered app — it is either a fallback worth stating as a fallback, or a gap worth
raising with the user. Check which before writing the sentence.

## test-documentation — the widest source

`test-documentation/<CONTEXT_KEY>/` covers more behaviour than either other source: exact on-screen
wording, the roles behaviour differs by, the states a flow reaches, and the deviations between what
the tickets asked for and what shipped. Mine all of it — then compare each claim with the code and
Linear, because it is a snapshot from one test pass and rarely revisited.

- `test-cases.md` — take the wording and the observed states, then find the component that renders
  the string or the branch that produces the state. Code agrees → `confirmed`. Code says otherwise →
  `conflict`, with both values recorded. Code silent → `reported`.
- Overview and implementation-notes sections — the richest place in the repo for shipped-vs-asked
  gaps. Each note is a candidate `warn` callout, checked against the code and the issue that owns it:
  a deviation that has since been fixed must not ship as a limitation.
- `bugs.md` — check each `BUG-nn` in Linear before writing it up. Still open and reproducible in the
  code → callout or stated limit. Closed since the file was written → drop it, and treat neighbouring
  statements in the file as suspect.

Recency check, cheap and worth doing once per app:

```bash
git log -1 --format=%ad -- test-documentation/<CONTEXT_KEY>/    # when the test docs last changed
linear-cli cm list <KEY> --output json                          # newest comment date and content
```

Comments and commits newer than the test docs are where the drift lives — read those first, and
treat any test-doc claim they touch as stale until re-checked.

Test docs use abstract roles (`Regular`, `Power`, `Admin`). Customer documents use the customer's own
role vocabulary; map deliberately, and never copy `QA_USER_*` names or credentials across.

## Linear as a source

Intent, decisions, ticket refs — and what changed late in the build.

```bash
linear-cli i get PP-3825 --output json       # epic: title, description, children
linear-cli cm list PP-3826 --output json     # comments override the description
```

Take the epic key for the cover, per-app ticket refs for app headers, the reason a design choice was
made (the sentence that opens `NOTIFICATIONS`), and the engagement name for the footer. The Linear
MCP tools are equivalent when configured.

Read the **description and every comment**, not just the description: comments override it and the
newest comment overrides an older one. Linear's own failure mode is describing a plan that never
shipped, so an AC with no code behind it is a `conflict` or a `reported` row, not a fact.

Where a comment and the code disagree, record both and raise it — the user says which shipped.

## Audit pass

Work only from the document and the ledgers:

1. Split the document into statements — every sentence, table cell and step body.
2. Match each to a ledger row. No row → finding.
3. Re-open the cited sources for every `confirmed` row backing a statement and check they still read
   that way, and still agree. A ledger row is a claim, not proof.
4. Flag `reported` and `unknown` rows written as confident prose, and any unflagged `TODO`.
5. Flag any `conflict` row whose resolution is not recorded, and any row where a source column was
   left blank instead of `—` — that is an unchecked source, not an absent fact.
6. Check structure against `sections.md`: section order, heading spelling, `VARIABLES` second to
   last, `DATASET ENTITIES` last, table column contracts, cell counts, block types inside the
   vocabulary, and `warn` callouts that name a mechanism rather than a caution.
7. Check the variable tables against what the app actually reads — a stale variable and a missing one
   are both findings.
8. Check every `BUG-nn` a customer could hit that is **still open** appears as a callout or a stated
   limit, and that no fixed bug is presented as a live limitation.
9. Grep for contamination and leaks: the previous customer's name and scope vocabulary, credentials,
   tokens, instance URLs, real usernames, `QA_USER_*`, PII.
10. Confirm the `<style>` block is unchanged from `assets/example.html` and only `--accent` differs.

Findings, most severe first, each with the quoted statement, why it fails and the smallest fix.
Severity: unverifiable claim > wrong claim > unresolved conflict between sources > leaked
credential or PII > another customer's vocabulary > missing known constraint > structural violation >
wording. Do not pad the list; if a
section is clean, say so in one line.
