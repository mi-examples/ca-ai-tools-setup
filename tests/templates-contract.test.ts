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

test('rules README documents deprecated ai-testing and ui-check stubs', () => {
  const rulesReadme = readTemplate('cursor/rules/README.md');

  assert.match(rulesReadme, /code-style/);
  assert.match(rulesReadme, /testing-with-linear/);
  assert.match(rulesReadme, /Deprecated/);
  assert.match(rulesReadme, /ai-testing/);
  assert.match(rulesReadme, /ui-check/);
});
