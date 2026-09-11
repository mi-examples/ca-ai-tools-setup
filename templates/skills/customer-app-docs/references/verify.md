# Verify — where facts live, the ledger, the audit

Used by the extraction subagents (step 2) and the audit subagent (step 5) in `../SKILL.md`.
Differences the extractions surface are triaged and settled in step 3, before any writing, and the
ledger this produces is what step 7 diffs on a re-run.

Read **all three** sources for every app — Linear description and comments, the code, and
`test-documentation/` — then compare them claim by claim. Each has its own failure mode (plans that
never shipped, code that is unreachable or fed by mock data, test docs that predate a fix), so no
source settles everything. The block schema in `../SKILL.md` is the shape of this.

---

## Type the claim first

Before comparing anything, decide what **kind** of claim it is. One type owns it, and the owner's
silence counts against the claim — the document tells a customer what they can do today, not what
was planned.

| Type | Owner | The owner settles | Others may inform |
|---|---|---|---|
| **behavior** — what the app does | **code** | validation, gating, what renders, what is written, endpoints | Linear and test docs describe it, but cannot confirm it alone |
| **intent** — why it does it | **Linear** | decisions, reasons, what was chosen and dropped | test-doc notes often carry a decision made verbally or by design; code cannot explain itself |
| **wording and states** — labels, empty states, error copy | **test docs** | the strings and states actually seen under test | the code shows the string exists; it cannot show it is reachable |

The consequence that matters: **a behavioral claim the code is silent on is `reported`, never
`confirmed`**, however firmly Linear and the test docs agree. Both are forward-looking artifacts and
can agree on work that was descoped before release.

---

## The fact ledger

One file per app: `docs/customer/<customer-slug>/facts/<app-slug>.md`. It is the extraction
subagent's only output and the audit subagent's only starting point.

One column per source, so agreement, silence and conflict are visible at a glance:

The header carries the run's whole scope, so the ledger is self-describing and the next run can diff
against it:

```markdown
# Facts — job-site-portal

Repo            <repo> @ <release tag or sha>          Code read     2026-09-11
Code globs      index.html, src/api/**, src/hooks/**, src/components/**, src/utils/**
Linear          team Portal Pages · epic PP-3636       Comments read 2026-09-11
Test docs       test-documentation/PP-3636/            Last changed  2026-08-14
Sections        WHAT THE PAGE SHOWS · WHO SEES WHAT · VARIABLES · DATASET ENTITIES
Documented against Metric Insights 7.2.2               Doc version   v1

| # | Claim | Type | Value | Linear | Code | Test docs | Verdict | User-visible | Resolution |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Variables the app reads | behavior | 7 of 7 declared, none unused | PP-3636 desc · 07-02 | `index.html:13-21` · tag | — | confirmed | no | |
| 2 | Tile rows filtered by job | behavior | rows kept where `job_id` matches the active job | PP-3585 AC · 07-11 | `src/utils/sections.ts:24` · tag | TC-31 · 08-14 | confirmed | yes | |
| 3 | Empty events dataset | behavior | card is hidden, no empty-state message | PP-3582 AC asks for a message · 07-09 | `UpcomingEvents.tsx:41` returns null · tag | notes flag the gap · 08-14 | conflict | yes | code is what ships — `human`, 09-11 |
| 4 | Header initials | behavior | static `JD`, not the signed-in user | — | `src/data/mockData.ts:8` · tag | TC-01 expects the user's initials · 08-14 | conflict | yes | out of the doc, raised as a bug — `human`, 09-11 |
| 5 | Empty-state copy | wording | "No upcoming events" | — | string absent | TC-18 · 08-14 | reported | yes | left out — `agent` |
| 6 | Notification cadence | behavior | ~10 min | PP-3829 comment · 07-20 | not in this repo | — | reported | yes | stated as approximate — `human`, 09-11 |
```

Rules:

- **One row per statement the document could make.** A sentence with no row does not ship — delete
  the sentence or extract the fact.
- **Fill all three source columns for every row.** `—` means "checked, says nothing"; never leave a
  column blank because you did not look.
- **Cite and date every cell**: `path:line` (plus the tag the code was read at), an issue key and
  where in it (`desc`, `comment`), `TC-nn`, `BUG-nn`, or an `Admin → …` screen — each with the date
  that evidence is as of. A row without a citation is a draft, not a fact.
- **`Verdict` comes from the comparison and the claim's owner:**

  | Verdict | When |
  |---|---|
  | `confirmed` | The owning source speaks and every other speaking source agrees. Non-owner silence is fine. |
  | `reported` | The **owner is silent**, or only one source has it at all. Never becomes a confident sentence. |
  | `conflict` | Two or more sources disagree. Triaged in step 3 — see below. |
  | `unknown` | No source settles it. Becomes `TODO confirm:` or is left out. |

- **Recency inside a source:** the newest Linear comment supersedes earlier ones, code is read at the
  release tag being documented, and bugs closed since the test docs were written are excluded. Notes
  and decisions in test docs are **not** excluded — they are often the only record of a decision.
- **`User-visible`** says whether the claim changes what a customer can do or see. It decides which
  conflicts reach a person, so its value is part of the row, and `Resolution` records who set it —
  `agent` (auto during extraction) or `human` (set or overridden at reconcile) with the date. The
  ledger is committed, so `git blame` supplies the person.
- Never upgrade a verdict to make a row look better.
- No credentials, tokens, instance URLs, real usernames or PII — in the ledger either.

### Graduating the header into a config file

The header holds per-customer scope on purpose: no new format to maintain, and it lands in the
re-run diff. Move it to `config/<customer>.yml` when **either** trigger fires:

- the same globs and section set are repeated across three or more apps for one customer, or
- a second customer needs a different app shape, so the globs stop being a per-run detail and become
  a per-customer fact.

Until then, duplicating six header lines per app is cheaper than a config format.

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

**Absent test docs — say which kind.** Test documentation is generated for new work, so absence
means different things and the header must distinguish them:

- `Test docs   absent (not expected — legacy repo)` — normal. Run on two sources and record `—` in
  the test-docs column of every row, which makes the confidence drop visible rather than invisible.
- `Test docs   absent (expected — <CONTEXT_KEY> has none)` — a signal, not a shrug. The QA step was
  skipped for work that should have had it; say so at handover rather than routing around it.

A behavioral claim is unaffected either way: the code owns it. What suffers is `wording` — with no
executed case, on-screen strings are `reported` at best.

## Conflict triage

Not every conflict is worth a person's turn. Step 3 is the human bottleneck and it gets skipped if it
floods, so:

- **`User-visible = yes` → escalate.** Goes to the user in one batch with a **recommended default
  already filled in** — normally the owning source's value, with the dates that make it the newer
  evidence. A test-doc note saying the shipped behaviour was intentional is strong grounds for
  defaulting to the code.
- **`User-visible = no` → resolve to the owning source** and log it in the row. Not blocked on, but
  visible in review: the `Resolution` cell reads `agent`, so a wrong call is findable later.
- Either way the row keeps both values. A conflict is never deleted, and a resolution never
  overwrites what a source actually said.

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

Two passes, because they catch different failures. Checking the prose against the ledger only ever
catches the cheaper one.

**Pass 1 — transcription.** Work from the document and the ledgers:

1. Split the document into statements — every sentence, table cell and step body.
2. Match each to a ledger row. No row → finding.
3. Flag `reported` and `unknown` rows written as confident prose, and any unflagged `TODO`.
4. Flag any `conflict` row whose resolution is not recorded, any `User-visible` cell without
   `agent`/`human`, and any source column left blank instead of `—` — a blank is an unchecked
   source, not an absent fact.

**Pass 2 — re-derivation.** Go back to the **sources**, not the ledger, for every **high-risk** row:
`conflict`, `reported`, single-source, and every row whose owning source is silent. Re-derive the
value independently and compare with what the ledger claims. These are exactly the rows where
extraction error hides, and a ledger row is a claim, not proof.

Then continue on the document:
5. Check structure against `sections.md`: section order, heading spelling, `VARIABLES` second to
   last, `DATASET ENTITIES` last, table column contracts, cell counts, block types inside the
   vocabulary, and `warn` callouts that name a mechanism rather than a caution.
6. Check the variable tables against what the app actually reads — a stale variable and a missing one
   are both findings.
7. Check every `BUG-nn` a customer could hit that is **still open** appears as a callout or a stated
   limit, and that no fixed bug is presented as a live limitation.
8. Grep for contamination and leaks: the previous customer's name and scope vocabulary, credentials,
   tokens, instance URLs, real usernames, `QA_USER_*`, PII.
9. Confirm the version stamp on the cover matches the ledger header, and that no `path:line` citation
   leaked into the document.
10. Confirm the `<style>` block is unchanged from `assets/example.html` and only `--accent` differs.

Findings, most severe first, each with the quoted statement, why it fails and the smallest fix.
Severity: unverifiable claim > wrong claim > unresolved conflict between sources > leaked
credential or PII > another customer's vocabulary > missing known constraint > structural violation >
wording. Do not pad the list; if a
section is clean, say so in one line.
