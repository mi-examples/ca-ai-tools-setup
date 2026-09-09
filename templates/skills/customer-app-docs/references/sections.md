# Sections — what goes where

The document's structure. Read with `../SKILL.md`; the presentation is already handled by the
`<style>` block in `../assets/example.html`, which you never edit.

---

## Cover page

One page, in this order: customer · flow name (eyebrow) → fixed doc kind → flow title → lede →
apps and epic → platform version → stages.

- **Lede**: two or three sentences, under 55 words — what the flow lets whom do, and what happens
  automatically. No feature list.
- **Apps line**: the deployed slugs in flow order, `·`-separated, then the epic key.
- **Platform**: the version the behaviour was confirmed against. Not decoration — it is what tells a
  reader in a year whether the document still applies. Bump it whenever the document is re-verified.
- **Stages**: four or five, each a one-word verb (`Arrive`, `Request`, `Notify`, `Decide`) and one or
  two sentences. Stages are the user's journey, not the app list: two apps can share a stage and one
  app can own two. More than five means the flow needs splitting into two documents.

## App section header and lede

Header line: `APP 0n` · kind (`CUSTOM APP` or `PORTAL PAGE`) · slug, exactly as in the URL ·
ticket refs. Nothing else — the epic and the platform version live on the cover.

Title is the app's human name. Lede is one to three sentences, under 45 words: what the page is,
whether it needs a login, what an action there becomes, and which app reads it next.

## Choosing an app's sections

There is no fixed spine per app *kind* — a login router, a public form, an approval queue and a
dashboard portal have little in common. Instead: take the sections below that the app actually has,
in this order, and use the heading spelled as given.

| # | Section | Include when | Contains |
|---|---|---|---|
| 1 | `HOW IT WORKS` | The app's value is a sequence of decisions — routers, redirects, multi-step journeys | Numbered steps following the visitor, one per decision the app makes. The order **is** the content. |
| 2 | `WHAT THE PAGE SHOWS` | The app is a dashboard, portal or landing page | One numbered step or bullet per region in render order — what it displays, which dataset feeds it, what it does when that dataset is empty or absent. |
| 3 | `FIELDS` | The app takes input | Table, then behaviour bullets. See below. |
| 4 | `THE QUEUE` | The app lists records for someone to act on | State pills, then: how many tabs and their counts, default sort, the column list in render order, which tabs are actionable, what the search matches and how, pagination and the variable that sets it. |
| 5 | `SCOPED LINKS` | A URL segment or query parameter scopes the app | Every link form that works, in `<code>`; how long the value is held and what clears it; how it is carried onward per branch; what it does to the **next** app. |
| 6 | `WHO SEES WHAT` | Visibility differs by user, group or mapping | The mechanism, then its three edge cases in order: the wildcard value, a user with no mapping rows, and the variable being unset. "Unset means everyone sees everything" is the sentence that separates a pilot from a leak — never omit it. |
| 7 | `EDIT BEFORE DECIDING` | The app can correct a record before acting on it | Which fields, where their options come from — naming another app's variable as such when that is the source — and whether the correction is written immediately or with the decision. |
| 8 | `APPROVE` / `DENY` | The app provisions or rejects something | See below. |
| 9 | `NOTIFICATIONS` | An email or alert exists anywhere in the flow | See below. |
| 10 | `VARIABLES` | Always | Table. Second to last. |
| 11 | `DATASET ENTITIES` | The app reads or writes any | Table. Last. |

Drop a section only when the app genuinely has nothing under it, and say so at handover. Never
reorder, never rename a heading, never merge two into one. Within a section: table first, then
bullets or steps, then callouts.

## FIELDS

Table, columns `FIELD` / `BEHAVIOUR`, rows in render order, one row per field — never merge related
fields. Each behaviour cell states, as applicable: required or optional; format validation; where
options come from; when the field is hidden, prefilled or locked; and what clears it.

Then behaviour bullets, in this order:

1. The submit gate — what must be valid, trimming, whether blank-only counts as filled.
2. CAPTCHA — provider and variant, when the token is verified relative to the write, and what happens
   when keys are missing.
3. The row written on success — status value, date format and unit, the full column list in `<code>`,
   and what the visitor is told.
4. The sign-in link — its wording and the variable that shows or hides it.

Verify each in source: the gate in the submit control's `disabled` expression, the CAPTCHA in the
verify call that precedes the write, the column list in the payload the app actually sends.

## APPROVE / DENY

`APPROVE` opens with the order of operations in one sentence, then bullets: the key that matches the
target object and its template in `<code>` with a concrete example; how each part is derived,
including per-value overrides and the naming convention targets must already follow; that the page
never creates one, when true; what the created account is — user type, username source, name split,
group membership, who generates and sends the password; the failure dialog's triggers, wording,
choices and the state it leaves the record in; and whether status writes are read back and verified.

`DENY` states whether a confirmation appears and its exact wording, what is written, what is *not*
created, whether anyone is emailed, and whether it is reversible — if not, say the confirmation
exists for that reason. Close with the feedback layer if there is one: toast tones per outcome, what
a success toast names, duration, and how repeats collapse.

`APPROVE` carries two callouts: a `grey` one for the access approvers must have and the identity
provisioning runs as — the group and privileges needed to write a decision, the mapping rows needed
to see anything, and, when provisioning routes through a service account, which endpoints require an
administrator and that the script accepts only the values the flow needs so a power user cannot widen
their own access. And a `warn` one for any id that must equal a real MI object id.

## NOTIFICATIONS

Open with one paragraph naming which emails exist, which the app itself does **not** send, and *why*
the design is what it is — for example that Metric Insights has no instant-notification trigger, so
approvers are notified by a poll. That "why" is the section's reason to exist; without it the design
reads as an accident.

Then numbered steps, one per moving part, each a bold title and a short body: the flag column and its
values; the burst — name, element and filter, subscribers, its own template, and why its schedule
stays disabled; the script — name, parameters, schedule, then a nested bullet per action in run order
with its endpoint and payload; and what the requester receives, from which app, and what a denial
sends. Close with a one-sentence net effect.

Two callouts: `grey` prerequisites (system variables and services, schedule privileges, mail
configuration and at least one subscriber, the rights the run-as user needs) and `warn` known
constraint (the trap with its mechanism, and the volume the current choice is acceptable at).

If the chain lives outside the repo, say where it lives rather than dropping the section.

## VARIABLES

Table, columns `VARIABLE` / `TYPE` / `PURPOSE`. One row per variable the app **actually reads** — the
`[Bracketed Label]` from `index.html`, not the JS key.

- `TYPE` is the MI type: `Text`, `List`, `Number`, `Dataset`, `Collection`.
- `PURPOSE` says what it controls, what an empty value means, and for list variables a one-line shape
  example in `<code>`.
- Note a variable another app in the flow also reads.
- A variable the app cannot run without says so: "Required — without it the page shows a
  configuration error."

## DATASET ENTITIES

Table, columns `ENTITY` / `USE`. One row per entity: which field or region it feeds, the column it
returns, the keys it is filtered by, and any id that must equal a real MI object id — group ids
especially, because those fail silently at provisioning time.

Optional closing `note` callout: how an entity can be repointed at a governed source without a code
change, and what must stay stable for that (projected column names).

## Callouts and pills

| Tone | Contains |
|---|---|
| `grey` (`callout`) | Prerequisites — what must be true for a mechanism to work at all. |
| `warn` | A trap with its mechanism named. |
| `note` | An optional extra or supported variation needing no code change. |
| `alert` | A constraint that breaks the flow if ignored. Two per document is already too many. |

A `warn` must name the failure mode the reader would otherwise hit. "Be careful with filters" is not
a callout.

Pills are state chips only, tones `amber` pending, `green` approved or healthy, `red` denied or
failed, `grey` neutral or historical. A pill's tone matches the state it names.

## Block vocabulary

Prose, bullets (one level of nesting), tables, numbered steps, pills, callouts. Nothing else.
`<code>` for every product identifier, `<b>` for UI controls and labels the reader hunts for on
screen, `<i>` sparingly for script output strings. Anything you cannot express with these is a
content problem, not a styling problem.
