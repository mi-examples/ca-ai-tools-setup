import test from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from '../src/templates.js';

test('setup assistant templates keep MCP replacement marker', () => {
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(cursorSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
  assert.match(claudeSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
});

test('setup health rule detects missing and stale tracked configuration', () => {
  const healthRule = readTemplate('cursor/rules/assistant-setup-health.mdc');
  const claudeInstructions = readTemplate('claude/CLAUDE.md');
  const agents = readTemplate('AGENTS.md');

  assert.match(healthRule, /alwaysApply: true/);
  assert.match(healthRule, /\.assistant-setup\/SETUP_STATUS\.md/);
  assert.match(healthRule, /Exit code \*\*`2`\*\*/);
  assert.match(healthRule, /Never run `update` or `--force` without explicit developer approval/);
  assert.match(claudeInstructions, /\.assistant-setup\/SETUP_STATUS\.md/);
  assert.match(agents, /\.assistant-setup\/SETUP_STATUS\.md/);
});

// The file is regenerated per machine and records one developer's instance URL, shell and paths, so
// committing it leaks that environment into everyone else's checkout. The generated .gitignore and
// the prose must agree: shipping a .gitignore entry next to a "commit this file" instruction is
// exactly what led the org rollout's conflict triage to approve replacing a repository's own,
// correct convention (mi-pp/novant-scorecard, 2026-09-21).
test('developer environment guidance says the file is personal, never committed', () => {
  const devEnvironment = readTemplate('assistant-setup/dev-environment.md');
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(readTemplate('gitignore'), /^\.dev-environment\.md$/mu);
  assert.match(devEnvironment, /personal and gitignored/iu);
  assert.doesNotMatch(devEnvironment, /Commit this file/iu);

  for (const setup of [cursorSetup, claudeSetup]) {
    assert.match(setup, /Never commit \*\*`\.dev-environment\.md`\*\*/u);
    assert.doesNotMatch(setup, /^- Commit \*\*`\.dev-environment\.md`\*\*/mu);
    assert.match(setup, /Do not add it to the setup PR/u);
    assert.match(setup, /\.mi-credentials\.local\.env/u);
  }
});

test('playwright-cli skill and workflow ship the CLI browser-automation alternative', () => {
  const skill = readTemplate('skills/playwright-cli/SKILL.md');
  const workflow = readTemplate('claude/workflows/playwright-cli.md');

  for (const doc of [skill, workflow]) {
    assert.match(doc, /npx playwright-cli/);
    assert.match(doc, /@playwright\/cli/);
    // Universal, not per-developer: shipped as a pinned devDependency, workspace state gitignored.
    assert.match(doc, /--save-dev @playwright\/cli/);
    assert.match(doc, /\.playwright-cli\//);
  }
});

test('playwright-mcp docs point at the CLI alternative without removing MCP', () => {
  const mcpSkill = readTemplate('skills/playwright-mcp/SKILL.md');
  const mcpWorkflow = readTemplate('claude/workflows/playwright-mcp.md');

  assert.match(mcpSkill, /playwright-cli/);
  assert.match(mcpWorkflow, /playwright-cli/);
  // MCP reference itself is preserved.
  assert.match(mcpSkill, /playwright_navigate/);
});

test('CLAUDE template documents both browser-automation transports', () => {
  const claudeMd = readTemplate('claude/CLAUDE.md');

  assert.match(claudeMd, /workflows\/playwright-cli\.md/);
  assert.match(claudeMd, /workflows\/playwright-mcp\.md/);
  assert.match(claudeMd, /pinned devDependency/);
});

test('cursor legacy rules stub keeps canonical QA skills and deprecates ai-testing/ui-check', () => {
  const cursorRules = readTemplate('cursor/cursorrules');

  assert.match(cursorRules, /Primary project rules/);
  assert.match(cursorRules, /`\.cursor\/rules\/`/);
  assert.match(cursorRules, /`AGENTS\.md`/);
  assert.match(cursorRules, /testing-with-linear\/SKILL\.md/);
  assert.match(cursorRules, /Deprecated redirects.*ai-testing.*ui-check/s);
});

test('AGENTS template lists core Claude agents', () => {
  const agents = readTemplate('AGENTS.md');

  assert.match(agents, /`code-style\.md`/);
  assert.match(agents, /`qa-tester\.md`/);
  assert.match(agents, /`ui-verifier\.md`/);
  assert.match(agents, /`linear-reporter\.md`/);
  assert.match(agents, /content is preserved, including with \*\*`--force`\*\*/);
});

test('customer docs skill keeps the source-precedence and verification contract', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');

  // A person decides when to run it; the skill never gates or self-starts.
  assert.match(skill, /Run it when asked/);
  assert.doesNotMatch(skill, /Entry gate/);
  assert.match(skill, /Never gate, delay or self-start a run/);

  // Three sources, typed by claim, with the owner carrying the tie.
  assert.match(skill, /Sources — gather all three, type the claim, then compare/);
  assert.match(skill, /LINEAR/);
  assert.match(skill, /TEST DOCS/);
  assert.match(skill, /OWNS: behavior/);
  assert.match(skill, /TYPE THE CLAIM, THEN COMPARE/);
  assert.match(skill, /OWNER silent/);
  assert.match(skill, /`reported`, never `confirmed`/);

  // Test-doc notes survive the recency rule; only closed bugs drop out.
  assert.match(skill, /Notes and decisions in test docs are \*\*not\*\* excluded/);

  // Differences are triaged, then settled with the user, before any writing.
  assert.match(skill, /### 3\. Reconcile — triage, then settle the ones that matter/);
  assert.match(skill, /user-visible/i);
  assert.match(skill, /Never resolve a conflict between sources on your own/);

  // Re-runs patch what moved; the approved first document becomes the golden.
  assert.match(skill, /### 7\. Regenerate on change/);
  assert.match(skill, /only the sections whose rows moved/);
  assert.match(skill, /first approved document becomes the golden/);
  assert.match(skill, /evals\/customer-app-docs\/golden\//);

  // Provenance for the customer is a version stamp, not citations.
  assert.match(skill, /Version stamp, not citations/);
  assert.match(skill, /test-documentation\/<CONTEXT_KEY>\//);
  assert.match(skill, /docs\/customer\/<customer-slug>\//);
  assert.match(skill, /TODO confirm/);

  // Extraction and audit are delegated; printing waits for approval.
  assert.match(skill, /one subagent per app, in parallel/i);
  assert.match(skill, /Audit — one subagent/);
  assert.match(skill, /--print-to-pdf/);
  assert.match(skill, /--no-pdf-header-footer/);

  // Section order is fixed even though the spine is per app, not per app kind.
  assert.match(sections, /VARIABLES/);
  assert.match(sections, /DATASET ENTITIES/);
  assert.match(sections, /callout/);

  // The ledger is what makes a statement auditable.
  assert.match(verify, /facts\/<app-slug>\.md/);
  assert.match(verify, /confirmed/);
  assert.match(verify, /PP_VARIABLES/);
  assert.match(verify, /bugs\.md/);
  assert.match(verify, /Audit pass/);

  // Claims are typed and owned before anything is compared.
  assert.match(verify, /## Type the claim first/);
  assert.match(verify, /\*\*behavior\*\* — what the app does \| \*\*code\*\*/);
  assert.match(verify, /a behavioral claim the code is silent on is `reported`, never\n`confirmed`/);

  // The ledger carries the run's scope, a column per source, and who settled each row.
  assert.match(
    verify,
    /\| # \| Claim \| Type \| Value \| Linear \| Code \| Test docs \| Verdict \| User-visible \| Resolution \|/,
  );
  assert.match(verify, /Code globs/);
  assert.match(verify, /Doc version/);
  assert.match(verify, /Fill all three source columns for every row/);
  assert.match(verify, /Cite and date every cell/);
  assert.match(verify, /`agent` \(auto during extraction\) or `human`/);

  // Scope stays in the header until a named trigger graduates it to a file.
  assert.match(verify, /### Graduating the header into a config file/);
  assert.match(verify, /three or more apps for one customer/);

  // Absent test docs are distinguished, and the audit re-derives the risky rows.
  assert.match(verify, /absent \(not expected — legacy repo\)/);
  assert.match(verify, /absent \(expected/);
  assert.match(verify, /## Conflict triage/);
  assert.match(verify, /\*\*Pass 2 — re-derivation\.\*\*/);
  assert.match(verify, /git log -1 --format=%ad -- test-documentation/);
  assert.match(verify, /Closed since the file was written/);
});

test('customer docs template is self-contained and carries the page rules', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /assets\/example\.html/);

  // Styles are inline, so a rendered document needs no sibling asset to look right.
  assert.match(template, /<style>/);
  assert.doesNotMatch(template, /<link[^>]+stylesheet/);
  assert.match(template, /size: Letter/);
  assert.match(template, /break-inside: avoid/);
  assert.match(template, /--accent/);

  // The class vocabulary the skill tells the writer to use must exist in the template.
  for (const className of ['cover', 'stage', 'app__meta', 'section', 'steps', 'pill', 'callout', 'doc-footer']) {
    assert.ok(template.includes(className), `template is missing .${className}`);
  }
});

test('rules README documents deprecated ai-testing and ui-check stubs', () => {
  const rulesReadme = readTemplate('cursor/rules/README.md');

  assert.match(rulesReadme, /code-style/);
  assert.match(rulesReadme, /testing-with-linear/);
  assert.match(rulesReadme, /Deprecated/);
  assert.match(rulesReadme, /ai-testing/);
  assert.match(rulesReadme, /ui-check/);
});
