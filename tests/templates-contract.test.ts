import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getGeneratedFiles } from '../src/generator.js';
import { readTemplate } from '../src/templates.js';

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}

// PP-4664: six templates sat in the package for months with nothing reading them, and one of them
// was later scheduled for a rewrite. A template the generator does not name is dead weight at best.
test('every template file is read by the generator', () => {
  const sources = listFiles('src')
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const unused = listFiles('templates')
    .map((file) => path.relative('templates', file).split(path.sep).join('/'))
    .filter((template) => !sources.includes(`'${template}'`));

  assert.deepEqual(unused, []);
});

test('setup assistant templates keep MCP replacement marker', () => {
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(cursorSetup, /\*\*MCP_SERVERS_BLOCK\*\*/);
  assert.match(claudeSetup, /\*\*MCP_SERVERS_BLOCK\*\*/);
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

test('playwright-cli skill and workflow ship the CLI as the browser-automation tool', () => {
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

test('CLAUDE template sends browser automation to the Playwright CLI', () => {
  const claudeMd = readTemplate('claude/CLAUDE.md');

  assert.match(claudeMd, /workflows\/playwright-cli\.md/);
  assert.match(claudeMd, /pinned devDependency/);
});

// PP-4531: one browser tool. A template that still names the MCP server or its `playwright_*`
// tools sends the assistant to something the setup no longer provides.
test('nothing generated mentions Playwright MCP', () => {
  const playwrightMcp = /@playwright\/mcp|playwright_[a-z]|playwright-mcp|Playwright MCP/;

  for (const template of listFiles('templates')) {
    assert.doesNotMatch(fs.readFileSync(template, 'utf8'), playwrightMcp, template);
  }

  // The MCP section of the setup docs is rendered in code, so check the output as well.
  for (const file of getGeneratedFiles(['cursor', 'claude'], true, false)) {
    assert.doesNotMatch(file.content, playwrightMcp, file.path);
  }
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

// PP-4465: generated customer docs leaked Linear keys and GitHub details. The ledger keeps them; the
// document, and the worked example it is copied from, must not.
test('customer docs keep ticket keys and GitHub info out of the document', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /\*\*No internal references\.\*\*/);
  assert.match(skill, /no ticket or issue keys/);
  assert.match(skill, /no GitHub or git information/);
  assert.match(skill, /Never put a ticket key, repo, branch, commit or PR reference in the document/);
  assert.doesNotMatch(sections, /then the epic key/);
  assert.match(sections, /no ticket refs/);
  assert.match(verify, /Grep for internal references/);
  assert.match(verify, /\*\*ledger header and citations only\*\*/);

  const body = template.slice(template.indexOf('<body>'));

  assert.doesNotMatch(body, /\b[A-Z]{2,}-\d+\b/u);
  assert.doesNotMatch(body, /github|\bcommit\b|\bbranch\b|pull request/iu);
  assert.doesNotMatch(body, /class="refs"/);
});

// PP-4538: customer docs mixed "Portal Page" with "Custom App" and could name internal MI
// environments. One term for the customer, and the platform by its version number only.
test('customer docs say Custom App and show the platform as a version only', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /\*\*Custom App, never Portal Page\.\*\*/);
  assert.match(skill, /\*\*Platform: version only\.\*\*/);
  assert.match(skill, /Never call an app a Portal Page in the document/);
  assert.match(skill, /Never name the environment or host the behaviour was read on/);
  assert.doesNotMatch(sections, /`CUSTOM APP` or `PORTAL PAGE`/);
  assert.match(sections, /never the environment or host it was read on/);
  assert.match(verify, /Grep for terminology and environment leaks/);
  // Build strings such as 101.7.3760.staging_7 are not release versions and must not be trimmed into one.
  assert.match(skill, /\*\*public release\*\* number/);
  assert.match(skill, /Never trim or translate a build string into a release yourself/);
  assert.match(sections, /never a build string/);
  // Lettered releases (7.2.0a) are real public releases, not suffixes to reject.
  assert.match(skill, /optionally one trailing release letter: `7\.2\.1`, `7\.2\.0a`/);
  assert.match(verify, /optionally one trailing release letter/);
  assert.match(verify, /is a confirmed public release/);

  const body = template.slice(template.indexOf('<body>'));

  assert.doesNotMatch(body, /portal[ -]?pages?/iu);
  assert.doesNotMatch(body, /staging|\bQA\b|\bdev\b|\bUAT\b|sandbox|https?:\/\//iu);
  assert.match(body, /<span class="label">Platform<\/span>Metric Insights \d+\.\d+\.\d+[a-z]?\s*</u);
});

test('rules README documents deprecated ai-testing and ui-check stubs', () => {
  const rulesReadme = readTemplate('cursor/rules/README.md');

  assert.match(rulesReadme, /code-style/);
  assert.match(rulesReadme, /testing-with-linear/);
  assert.match(rulesReadme, /Deprecated/);
  assert.match(rulesReadme, /ai-testing/);
  assert.match(rulesReadme, /ui-check/);
});
