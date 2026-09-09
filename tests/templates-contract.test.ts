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

test('developer environment guidance is tracked and keeps credentials local', () => {
  const devEnvironment = readTemplate('assistant-setup/dev-environment.md');
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(devEnvironment, /Commit this file as shared repository guidance/);
  assert.doesNotMatch(devEnvironment, /Keep it out of git/);

  for (const setup of [cursorSetup, claudeSetup]) {
    assert.match(setup, /Commit \*\*`.dev-environment.md`\*\*/);
    assert.match(setup, /\.mi-credentials\.local\.env/);
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

  // Three sources, compared — no single one is authoritative.
  assert.match(skill, /Sources — gather all three, then compare/);
  assert.match(skill, /No source is authoritative on its own/);
  assert.match(skill, /LINEAR/);
  assert.match(skill, /TEST DOCS/);
  assert.match(skill, /COMPARE — one claim at a time/);
  assert.match(skill, /sources disagree/);

  // Differences are settled with the user in their own step, before any writing.
  assert.match(skill, /### 3\. Reconcile — settle every difference before writing a word/);
  assert.match(skill, /Do not start writing while any conflict\nis unresolved/);
  assert.match(skill, /Never resolve a conflict between sources on your own/);
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

  // The ledger holds one column per source, and the verdict comes from comparing them.
  assert.match(verify, /\| # \| Claim \| Value \| Linear \| Code \| Test docs \| Verdict \|/);
  assert.match(verify, /Fill all three source columns for every row/);
  assert.match(verify, /`conflict` \| Two or more sources disagree/);
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
