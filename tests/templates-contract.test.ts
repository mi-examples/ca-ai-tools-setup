import test from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from '../src/templates.js';

test('setup assistant templates keep MCP replacement marker', () => {
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(cursorSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
  assert.match(claudeSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
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

  assert.match(agents, /`qa-tester\.md`/);
  assert.match(agents, /`ui-verifier\.md`/);
  assert.match(agents, /`linear-reporter\.md`/);
});

test('rules README documents deprecated ai-testing and ui-check stubs', () => {
  const rulesReadme = readTemplate('cursor/rules/README.md');

  assert.match(rulesReadme, /testing-with-linear/);
  assert.match(rulesReadme, /Deprecated/);
  assert.match(rulesReadme, /ai-testing/);
  assert.match(rulesReadme, /ui-check/);
});
