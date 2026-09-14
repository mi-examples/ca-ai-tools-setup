# Eval — `customer-app-docs`

A maintainer gate for **this** repo, not part of any customer run. It answers one question: after we
change a rule in `templates/skills/customer-app-docs/**`, does the skill still extract the same facts
as well as it did?

Without it, every rule change is a guess — each real run happens on a different app, so "the output
got worse" is indistinguishable from "the app is different".

## The golden

`evals/customer-app-docs/golden/<customer>-<flow>/`, frozen from the **approved** output of a real
run — the first document a person verified end to end becomes the ground truth:

```
golden/<customer>-<flow>/
  INPUTS.md          # repo URL, release tag or sha, code globs, Linear epic + issue keys,
                     # test-doc path or `absent (...)`, platform version, section set
  document.html      # the approved document, exactly as shipped
  facts/<app>.md     # the approved ledgers, one per app
```

Nothing here is edited to make a score look better. When the approved document changes for a real
reason — a behaviour change in the app — re-freeze the golden from the new approved output and note
why in `INPUTS.md`.

## Running it

1. Check out the repo named in `INPUTS.md` at the exact tag or sha.
2. Run the skill from step 2 (Extract) with those inputs, into a scratch directory — not over the
   golden.
3. Compare the new ledgers against the golden ledgers, claim by claim.

Claims match when the `Claim` and `Value` mean the same thing, not when the strings are identical —
so this is a judgement task for a subagent with this file, not a diff.

## Score

| Metric | Definition | Bar |
|---|---|---|
| Confirmed-claim precision | of the new run's `confirmed` rows, the share that match a golden `confirmed` row with the same value | not below the golden run |
| Missed-claim recall | of the golden rows, the share the new run found at all | not below the golden run |
| False-conflict rate | new `conflict` rows that the golden settles as agreement | not above the golden run |

A drop in any of the three blocks the change, or the rule that caused it gets an exception recorded
in the PR with a reason. Precision dropping while recall rises usually means a verdict rule got
looser; the reverse usually means an extraction rule got narrower.

Wrong-value rows are worse than missing rows: a claim the run never made costs a `TODO confirm:`,
while a claim it made wrongly reaches a customer. Weigh them that way when the score is borderline.

## When to run

Before merging any change under `templates/skills/customer-app-docs/**`. Record the three numbers in
the PR description alongside the golden's own numbers.

This is deliberately a checklist run by a subagent rather than a script: the comparison is semantic,
and a brittle string-diff harness would be ignored within a month. Worth wiring as a hook on that
path once the first golden exists, so it cannot be forgotten.

## Status

**No golden yet** — it needs the first human-approved document, whichever engagement produces it.
Until one is approved and frozen here, changes to the skill ship unmeasured, which is worth saying
out loud in the PR rather than pretending otherwise.

Any delivered flow will do. Prefer a first golden with all three sources present and at least one
real conflict in its ledger — a flow where everything agreed teaches the eval nothing about the
rules that matter.

Separate from this gate, and available from the first run: the **rule check** in step 7 of the skill
— citations present, claims typed, verdicts consistent with the comparison, section spine intact, no
unclosed `TODO`. It needs no ground truth and catches a different class of problem.
