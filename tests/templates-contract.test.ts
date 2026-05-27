import test from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate, readUiCheckSkillTemplate } from '../src/templates.js';

test('setup assistant templates keep MCP replacement marker', () => {
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(cursorSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
  assert.match(claudeSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
});

test('ui-check template for cursor uses cursor skill and workflow paths', () => {
  const rendered = readUiCheckSkillTemplate('cursor');

  assert.match(rendered, /when \*\*Cursor\*\* is included in the installer run\./);
  assert.match(rendered, /`\.cursor\/skills\/linear-workflow\/SKILL\.md`/);
  assert.match(rendered, /UI check and verification/);
});

test('ui-check template for claude uses claude workflow paths', () => {
  const rendered = readUiCheckSkillTemplate('claude');

  assert.match(rendered, /when \*\*Claude Code\*\* is included in the installer run\./);
  assert.match(rendered, /`\.claude\/workflows\/linear-workflow\.md`/);
  assert.match(rendered, /UI check and verification/);
});

test('cursor legacy rules stub keeps links to rules directory and AGENTS index', () => {
  const cursorRules = readTemplate('cursor/cursorrules');

  assert.match(cursorRules, /Primary project rules/);
  assert.match(cursorRules, /`\.cursor\/rules\/`/);
  assert.match(cursorRules, /`AGENTS\.md`/);
  assert.match(cursorRules, /testing-flow\/SKILL\.md/);
});

test('AGENTS template lists core Claude agents', () => {
  const agents = readTemplate('AGENTS.md');

  assert.match(agents, /`qa-tester\.md`/);
  assert.match(agents, /`ui-verifier\.md`/);
  assert.match(agents, /`linear-reporter\.md`/);
});
