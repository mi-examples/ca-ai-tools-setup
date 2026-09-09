# Customer Documentation

Produce or update customer-facing documentation for delivered Custom Apps / Portal Pages.

Argument:

```text
$ARGUMENTS
```

Instructions:

1. Treat `$ARGUMENTS` as the scope: a Linear epic key or URL, an app slug, a flow name, or an
   existing path under `docs/customer/`.
2. Read `./.claude/skills/customer-app-docs/SKILL.md` and follow its run order. The person invoking
   this command has decided the flow is ready — do not gate on epic state, test-run state or open
   bugs.
3. Confirm scope with the user before extraction: customer, flow, apps and their order, slugs,
   ticket refs, `CONTEXT_KEY`s, platform version, and the customer's own vocabulary. Ask for what is
   missing; missing test docs lower confidence, they do not stop the run.
4. Delegate one read-only extraction subagent per app, in parallel, and keep the fact ledgers under
   `docs/customer/<customer-slug>/facts/`. Each agent reads all three sources — Linear description
   and comments, the code, `test-documentation/` — and sets each row's verdict from how they compare.
   Conflicts come back to the user; none is resolved silently.
5. Reconcile before writing: bring every conflict, single-source claim and open question to the user
   in one pass, then write their decisions back into the ledger rows.
6. Write the document by copying `assets/example.html` and replacing its body.
7. Delegate the audit pass to a fresh subagent and fix its findings in the HTML.
8. Print the PDF only after the user approves the text.
9. Hand back file paths. Do not send or publish the document anywhere.
