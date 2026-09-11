---
name: customer-app-docs
description: Writes customer-facing Custom App / Portal Page documentation — one HTML document per delivered flow, cover page plus one section per app, every statement traced to app source, test-documentation or Linear, then printed to PDF. Use when creating or updating customer documentation, a handover doc, an app documentation sheet, "how the app works" pages, or docs/customer/** files.
---

# Customer app documentation

One document per delivered **flow**, written for the **customer's** admins and site contacts — not
for developers. Every customer gets the same structure so the documents read as one family; only the
content differs.

A document is: a **cover page** describing the flow end to end, then **one section per app**
(`APP 01`, `APP 02`, …) in the order a user meets them, then a shared footer. A single-app
engagement still gets the cover page — it is what makes the document readable on its own.

The skill is four files:

```text
   customer-app-docs/   ·   mirrored to .cursor/skills/ and .claude/skills/
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ SKILL.md   ·   ALWAYS READ                                                      │
   │ the source schema · claim types and ownership · run order, 7 steps              │
   │ writing rules · reuse-across-customers rules · handover checklist               │
   └────────────┬───────────────────────────┬───────────────────────────┬────────────┘
                │                           │                           │
           steps 2 & 5                   step 4                    step 4 · cp
                ▼                           ▼                           ▼
   ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
   │ references/verify.md    │ │ references/sections.md  │ │ assets/example.html     │
   ├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
   │ read by the extraction  │ │ read while writing      │ │ copied with cp, then    │
   │ and audit subagents     │ │ each app section        │ │ its body is replaced    │
   ├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
   │ claim types and owners  │ │ which sections an app   │ │ template + the worked   │
   │ silence counts against  │ │ gets, and their order   │ │ example in one file     │
   │ the claim               │ │ table and callout       │ │ inline <style> is the   │
   │ citations + as-of dates │ │ contracts               │ │ presentation contract   │
   │ conflict triage         │ │ the block vocabulary    │ │ — never edited          │
   │ audit re-derives the    │ │ how reported claims     │ │ version stamp on the    │
   │ high-risk rows          │ │ read in the prose       │ │ cover, no citations     │
   └────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
                ▼                           ▼                           ▼
       facts/<app-slug>.md       the document's sections     <flow-slug>.html → .pdf
                └───────────────────────────┴───────────────────────────┘
                                            ▼
                  docs/customer/<customer-slug>/   ·   the deliverables
                  step 7 re-runs diff the ledger and patch what moved;
                the first approved document is frozen as the eval golden
```

## Sources — gather all three, type the claim, then compare

Read Linear, the code and the test docs for **every** app. They are not interchangeable: each claim
is **typed** first, and the source that owns that type carries the tie. **Silence from the owning
source counts against the claim** — the document tells a customer what they can do today, not what
was planned.

```text
   ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
   │ LINEAR                    │ │ CODE                      │ │ TEST DOCS                 │
   │ desc + ALL comments       │ │ globs from ledger header  │ │ cases, OPEN bugs, notes   │
   ├───────────────────────────┤ ├───────────────────────────┤ ├───────────────────────────┤
   │ OWNS: intent, why, refs   │ │ OWNS: behavior            │ │ OWNS: wording, states     │
   │ informs: behavior         │ │ informs: wording          │ │ informs: intent           │
   ├───────────────────────────┤ ├───────────────────────────┤ ├───────────────────────────┤
   │ risk: plans not shipped   │ │ risk: dead code, mocks    │ │ risk: stale, bug closed   │
   │ rule: newest wins         │ │ rule: silence counts      │ │ rule: may be absent       │
   └─────────────┬─────────────┘ └─────────────┬─────────────┘ └─────────────┬─────────────┘
                 └─────────────────────────────┴─────────────────────────────┘
                                               ▼
                                TYPE THE CLAIM, THEN COMPARE
                            one claim at a time, every row cited
        ┌────────────────┬────────────────┬─────┴──────────┬────────────────┐
   all three        owner agrees,      OWNER silent       only one        sources
     agree           rest silent       on its type       source has it    disagree
  → confirmed       → confirmed        → reported        → reported      → conflict
                                                                         ↳ triage
                                               ▼
                  ledger rows  →  RECONCILE triaged conflicts (step 3)
                                               ▼
                 document  →  audit (re-derives) →  approve  →  PDF  →  step 7
```

**Ownership.** Code owns *behavior* — what the app does. Linear owns *intent* — why, and what was
decided. Test docs own *wording and states* — labels, empty states, error copy. A source may inform
a type it does not own; it just cannot settle it alone.

**Silence.** A behavioral claim the code does not support is `reported`, never `confirmed`, however
firmly Linear and the test docs agree: both are forward-looking and can agree on work descoped
before release.

**Recency.** Newest wins inside a source — the last Linear comment supersedes earlier ones, code is
read at the release tag being documented, bugs closed since the test docs were written are excluded.
Notes and decisions in test docs are **not** excluded: they are often the only record of a decision
made verbally or by design. Every row records the date each source is as of.

Two more sources sit outside the comparison: **the instance** (variable names, types and defaults as
an admin sees them under **Admin → Apps → app → Variables** — they exist nowhere in git, so they are
`reported` unless a screen was checked) and **a prior customer's document** (structure and phrasing
only, never facts).

A claim no source supports is left out, or written `TODO confirm: <question>` and flagged at
handover. Never describe plausible behaviour.

## When to use this skill

A person decides when a flow is ready to document — usually once development and testing have
closed. **Run it when asked. Never gate it, never check whether the work looks finished, never run
it on your own initiative.**

- A delivered flow needs its handover document.
- An existing document needs updating after a behaviour change (new variable, new section, changed
  notification cadence).
- A document exists for one customer and the same apps are being rolled out to another.

Not for test documentation (`test-documentation`), Linear reporting (`linear-report`), or internal
architecture notes.

## Output

The HTML **is** the source — there is no separate Markdown draft to keep in sync. The PDF printed
from it is the deliverable the customer receives; there is no wiki copy and no named accuracy owner,
so a document is re-verified when someone asks for it, not on a schedule.

```
docs/customer/<customer-slug>/
  <flow-slug>.html        # source and deliverable; self-contained, styles inline
  <flow-slug>.pdf         # printed artefact
  facts/<app-slug>.md     # one fact ledger per app — the audit trail, committed
```

## Run order

### 1. Scope

Confirm with the user before extracting: customer name and slug; flow name and slug; the apps, their
deployed slugs and the order a user meets them; the release tag or sha the behaviour is documented
at; the code globs for this app shape; the epic key, per-app ticket refs and the `CONTEXT_KEY`s under
`test-documentation/`; the platform version; the engagement name for the footer; the customer's own
words for the scope field and the roles; and whether an existing document is the starting point.

All of it goes into the **ledger header** — that is where per-customer scope lives, not in a config
file. `references/verify.md` carries the two triggers for graduating the header into
`config/<customer>.yml`; until one fires, six header lines per app are cheaper than a format to
maintain.

Ask for what is missing rather than inferring it, and never treat a missing input as a reason to
stop. Missing test docs are recorded as `absent (not expected)` for a legacy repo or
`absent (expected)` when the work should have had them — the second is worth raising at handover.

### 2. Extract — one subagent per app, in parallel

Launch them in a single message so they run concurrently. Each writes
`docs/customer/<customer-slug>/facts/<app-slug>.md` and returns a short summary. Prompt each with:

> Read-only. Read `.claude/skills/customer-app-docs/references/verify.md` and follow it to extract
> every documentable fact about the app `<slug>` (`<kind>`) into a fact ledger at `<ledger path>`,
> header first. Read all three sources before judging any claim: Linear `<refs>` description **and
> every comment**, the code at `<tag>` under `<globs>`, and `test-documentation/<CONTEXT_KEY>/`.
> **Type each claim** — behavior, intent, or wording — fill one column per source with a citation
> and an as-of date, then set the verdict from the comparison: the owning source silent means
> `reported`, never `confirmed`. Mark each row `User-visible` yes or no. Write only that file. Return
> the row count, the verdict counts, every `conflict` row with its evidence and dates, every
> user-visible single-source claim, and anything that looks like a defect rather than a behaviour.

A subagent earns its place here: it reads a whole app's source and returns one table. Do not skip the
ledgers and write from your own reading in this session — the ledger is what the audit step and the
next engineer verify against.

### 3. Reconcile — triage, then settle the ones that matter

Only differences that change a **user-visible** claim reach a person; the rest resolve to the owning
source and are logged for review. Step 3 is the human bottleneck, and a flood is how it gets skipped.

Escalate in **one batch**, with a recommended default already filled in for each:

1. **User-visible conflicts** — the claim, what each source says with its date, and the default
   (normally the owning source's value; a test-doc note saying the shipped behaviour was intentional
   is strong grounds for defaulting to the code). Ask which shipped.
2. **User-visible single-source claims** — documentable as-is, left out, or held as `TODO confirm:`?
3. **`unknown` questions** — what no source settled.
4. **Suspected defects** — the code does something no ticket asked for and no test covers. These are
   Linear issues, not document sentences; ask before writing around them.

Everything not user-visible resolves to the owning source, with `agent` in the row's `Resolution`
cell so a wrong call stays findable. Decisions from this batch go back into the rows as
`human` plus the date — the ledger is committed, so `git blame` supplies the person.

A ledger showing an unresolved `conflict` after the document exists is a finding at audit time.

Answers that arrive verbally are `reported`, not `confirmed`. Do not start writing while any conflict
is unresolved.

### 4. Write

```bash
cp .claude/skills/customer-app-docs/assets/example.html docs/customer/<customer-slug>/<flow-slug>.html
```

Then replace everything inside `<body>` and set `--accent` in the `:root` block. **Never edit the
`<style>` block itself** — it is the presentation contract, identical across customers, and you do
not need to read it to use it.

Build the cover page, then one section per app per `references/sections.md`, then the footer. Every
sentence traces to a ledger row.

**Version stamp, not citations.** The cover carries `Documented against Metric Insights <version> ·
<flow> <doc version> · <date>`, matching the ledger header. That is what tells a reader whether the
document still applies. Citations stay in the ledger — a customer has no use for `file:line`.

### 5. Audit — one subagent, blind to the drafting

> Read-only. Read `.claude/skills/customer-app-docs/SKILL.md`, `references/sections.md` and the
> "Audit pass" section of `references/verify.md`. Audit `<document path>` against the ledgers in
> `<facts dir>` in **two passes**: every statement must trace to a ledger row, and every high-risk
> row — `conflict`, `reported`, single-source, or owning source silent — must be **re-derived from
> the sources themselves**, not taken from the ledger. The previous customer, if this was adapted
> from one, was `<name>`. Report findings most severe first — quoted statement, why it fails,
> smallest fix — then one line of verdict.

Fix findings in the HTML. Do not print the PDF while a factual finding is open.

Checking the prose against the ledger alone only catches transcription drift; re-derivation is what
catches extraction error, the more dangerous class.

### 6. Approve and print

Show the user the document and any remaining `TODO`s, and get explicit approval of the text. Then:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/customer/<customer-slug>/<flow-slug>.pdf" \
  "file://$PWD/docs/customer/<customer-slug>/<flow-slug>.html"
```

On Windows use `"C:\Program Files\Google\Chrome\Application\chrome.exe"` with the same flags and a
`file:///C:/…` URL; Edge (`msedge`) accepts them too. `--no-pdf-header-footer` matters: without it
Chrome stamps the local file path and a date on every page.

Then check the print: the cover fits one page, each app section starts on a new page, no table,
callout or step is split across a break, no heading sits alone at the foot of a page, and no path
stamp appears. Hand back the file paths — never send, publish or attach a customer document
yourself.

**The first approved document becomes the golden.** Once the user approves it, freeze the document,
its ledgers and its inputs as ground truth for the skill itself — in `ca-ai-tools-setup` under
`evals/customer-app-docs/golden/<customer>-<flow>/`, which carries the scoring contract
(confirmed-claim precision, missed-claim recall, false-conflict rate). That is a maintainer gate on
changes to these templates, not part of a customer run; rules this judgment-heavy drift silently
without it.

### 7. Regenerate on change

Re-runs are the normal case, and a full rewrite every time is how they stop happening. The ledger is
the diffable artefact:

1. Re-run step 2 for the affected apps only, into a new ledger.
2. Diff it against the committed one — new rows, changed values, changed verdicts, new conflicts.
3. Triage and settle the changed rows per step 3.
4. Rewrite **only the sections whose rows moved**, then re-audit those sections plus every high-risk
   row in the whole document — a behaviour change often invalidates a sentence elsewhere.
5. Bump the doc version and the as-of date on the cover, and reprint.

Full regeneration is the fallback, not the default. A rule check right after generation — citations
present, claims typed, verdicts consistent, spine intact, no unclosed `TODO` — is worth wiring as a
hook so it is never skipped.

## Writing rules

- **Present tense, third person, no instructions to the reader.** "Request Access stays disabled
  until every visible field is valid", not "make sure you fill in every field".
- **One idea per bullet.** A bullet needing a semicolon and two clauses is two bullets or a step.
- **Name things exactly as the product does**, in `<code>`: `status = Pending`, `notified`,
  `PUT api/dataset_data`, `Roles Configuration`, `SECTIONS_BUTTONS`.
- **Say the consequence, not just the setting.** "Empty hides the link" beats "optional".
- **Every trap gets a `warn` callout** naming its mechanism — race window, filter choice that looks
  equivalent but isn't, volume assumption, an id that must match a real object.
- **Prefer the customer's own noun** in prose — their word for a scope or a role; the identifier
  stays in `<code>`.
- No marketing voice, no "simply", no "just", no roadmap.
- **No screenshots.** They rot faster than the text, every customer's branding differs, framing and
  zoning are hard to keep consistent, and each re-run in step 7 would imply a re-shoot. Describe the
  control by its label in `<b>` instead.
- No credentials, tokens, instance URLs, usernames or PII, not even in examples. Use placeholder ids
  that are obviously placeholders.

## Reuse across customers

Start from the nearest existing document, then replace **every** customer-specific noun. The common
failure is carrying the previous customer's vocabulary across:

- the scope field is whatever the customer calls it — project number, site, region, contract;
- group conventions, role strings and role-to-suffix overrides are per customer;
- ticket refs, platform version, epic and footer are per engagement;
- cadences are per customer — confirm the schedule, never assume ten minutes.

Search the draft for the previous customer's name and scope vocabulary before handing over. A hit
means it is not ready.

## Before handing over

- [ ] Every statement traces to a ledger row, typed and cited with an as-of date; no `TODO` left
      unflagged.
- [ ] All three sources were read for every app — `—` means "checked, says nothing", never "not
      looked at".
- [ ] No behavioral claim reads as confident where the code is silent on it.
- [ ] Every user-visible `conflict` was settled by a person; the rest resolved to the owning source
      and say `agent` in the row.
- [ ] Cover page states what the flow does, its stages in order, the app slugs, epic and the version
      stamp — and reads on its own to someone who has never seen the apps.
- [ ] No `path:line` citation leaked out of the ledger into the document.
- [ ] Section order per `references/sections.md`; `VARIABLES` second to last, `DATASET ENTITIES` last.
- [ ] Variable tables match what each app actually reads — none stale, none missing.
- [ ] Every open `BUG-nn` a customer could hit appears as a callout or a stated limit — after
      checking it is still open.
- [ ] No previous customer's name or vocabulary; no credentials, tokens, real usernames or PII.
- [ ] The `<style>` block is untouched; only `--accent` differs from the template.

## Never

- Never invent behaviour to fill a section, and never soften an unknown into a confident sentence.
- Never document a variable by guessing from its name.
- Never write a claim from one source without checking what the other two say about it.
- Never resolve a conflict between sources on your own — the user decides which shipped.
- Never gate, delay or self-start a run: a person decides when a flow is ready to document.
- Never copy a paragraph from another customer's document without re-verifying it against these apps.
- Never fix content in the printed PDF — fix the HTML and reprint.
- Never send or publish the document; hand back the paths and let the user decide.
