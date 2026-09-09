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
   │ the source schema · run order, 6 steps · writing rules                          │
   │ reuse-across-customers rules · handover checklist                               │
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
   │ all three sources, one  │ │ which sections an app   │ │ template + the worked   │
   │ ledger column each      │ │ gets, and their order   │ │ example in one file     │
   │ verdicts and conflicts  │ │ table and callout       │ │ inline <style> is the   │
   │ where each fact lives   │ │ contracts               │ │ presentation contract   │
   │ the audit pass          │ │ the block vocabulary    │ │ — never edited          │
   └────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
                ▼                           ▼                           ▼
       facts/<app-slug>.md       the document's sections     <flow-slug>.html → .pdf
                └───────────────────────────┴───────────────────────────┘
                                            ▼
                  docs/customer/<customer-slug>/   ·   the deliverables
```

## Sources — gather all three, then compare

No source is authoritative on its own. Read Linear, the code and the test docs for **every** app,
compare them fact by fact, and only then write. Never stop at whichever source answered first: a
fact only one source knows is exactly the fact most likely to be wrong.

```text
   ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
   │ LINEAR                    │ │ CODE                      │ │ TEST DOCS                 │
   │ epic + issues:            │ │ index.html, src/api,      │ │ test-cases.md, bugs.md    │
   │ description + ALL comments│ │ components, hooks, utils  │ │ + implementation notes    │
   ├───────────────────────────┤ ├───────────────────────────┤ ├───────────────────────────┤
   │ intent, decisions, why,   │ │ mechanism as shipped:     │ │ observed behaviour, exact │
   │ ticket refs, what changed │ │ validation, gating,       │ │ on-screen wording, roles, │
   │ late in the build         │ │ payloads, variables read  │ │ asked-vs-shipped gaps     │
   └─────────────┬─────────────┘ └─────────────┬─────────────┘ └─────────────┬─────────────┘
                 └──────────────────────┬──────┴─────────────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │  COMPARE — one claim at a time │
                        └───────────────┬───────────────┘
        ┌──────────────────────┬────────┴────────┬──────────────────────────┐
        ▼                      ▼                 ▼                          ▼
  all agree            two agree, third    only one source        sources disagree
  → confirmed          silent → confirmed  → reported             → conflict
        └──────────────────────┴─────────────────┴──────────────────────────┘
                                        ▼
                  ledger rows  →  RECONCILE with the user (step 3)
                                        ▼
                        document  →  audit  →  approve  →  PDF
```

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
deployed slugs and the order a user meets them; the epic key, per-app ticket refs and the
`CONTEXT_KEY`s under `test-documentation/`; the platform version the behaviour is being documented
against; the engagement name for the footer; the customer's own words for the scope field and the
roles; and whether an existing document is the starting point.

Ask for what is missing rather than inferring it, and never treat a missing input as a reason to
stop. No test documentation for an app means its facts come from code and Linear alone — say so at
handover, and expect more `TODO confirm:` lines.

### 2. Extract — one subagent per app, in parallel

Launch them in a single message so they run concurrently. Each writes
`docs/customer/<customer-slug>/facts/<app-slug>.md` and returns a short summary. Prompt each with:

> Read-only. Read `.claude/skills/customer-app-docs/references/verify.md` and follow it to extract
> every documentable fact about the app `<slug>` (`<kind>`) into a fact ledger at `<ledger path>`.
> Read all three sources before judging any claim: Linear `<refs>` description **and every comment**,
> the app code, and `test-documentation/<CONTEXT_KEY>/`. Fill one ledger column per source, then set
> the verdict from how they compare. Write only that file. Return the row count, the verdict counts,
> every `conflict` row with its evidence, and every claim only one source supports.

A subagent earns its place here: it reads a whole app's source and returns one table. Do not skip the
ledgers and write from your own reading in this session — the ledger is what the audit step and the
next engineer verify against.

### 3. Reconcile — settle every difference before writing a word

Collect what the extractions disagreed about, across all apps, and bring it to the user in **one
pass** rather than a question at a time. Group it:

1. **Conflicts** — sources that disagree. For each: the claim, what each source says, where each
   came from, and which evidence is newer (a comment dated after the code change, a test doc
   committed before the fix). Ask which shipped.
2. **Single-source claims** — supported by one source with the others silent. Ask whether each is
   documentable as-is, left out, or held as `TODO confirm:`.
3. **`unknown` questions** — what no source settled.
4. **Suspected defects** — where the code does something no ticket asked for and no test covers.
   These are Linear issues, not document sentences; ask before writing around them.

Then write the decisions back into the ledger rows — the resolved value, the source it came from, and
that a person decided it. A ledger that still shows an open `conflict` after the document exists is a
finding at audit time.

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

### 5. Audit — one subagent, blind to the drafting

> Read-only. Read `.claude/skills/customer-app-docs/SKILL.md`, `references/sections.md` and the
> "Audit pass" section of `references/verify.md`. Audit `<document path>` against the ledgers in
> `<facts dir>`, claim by claim. The previous customer, if this was adapted from one, was
> `<name>`. Report findings most severe first — quoted statement, why it fails, smallest fix — then
> one line of verdict.

Fix findings in the HTML. Do not print the PDF while a factual finding is open.

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
- No marketing voice, no "simply", no "just", no roadmap. No screenshots — they rot faster than the
  text and every customer's branding differs.
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

- [ ] Every statement traces to a ledger row; no `TODO` left unflagged.
- [ ] All three sources were read for every app — a blank Linear or test-doc column means "checked,
      says nothing", never "not looked at".
- [ ] Every `conflict` row was resolved with the user, and no conflict was decided silently.
- [ ] Statements only one source supports are marked `reported` and read as such, or left out.
- [ ] Cover page states what the flow does, its stages in order, the app slugs, epic and platform
      version — and reads on its own to someone who has never seen the apps.
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
