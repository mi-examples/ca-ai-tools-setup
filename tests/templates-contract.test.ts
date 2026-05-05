import test from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate, readUiCheckSkillTemplate } from '../src/templates.js';

test('setup assistant templates keep MCP replacement marker', () => {
  const cursorSetup = readTemplate('setup-cursor-assistant.md');
  const claudeSetup = readTemplate('setup-claude-assistant.md');

  assert.match(cursorSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
  assert.match(claudeSetup, /\*\*PLAYWRIGHT_MCP_BLOCK\*\*/);
});

test('ui-check template for cursor replaces all placeholders with cursor paths', () => {
  const rendered = readUiCheckSkillTemplate('cursor');

  assert.match(rendered, /when \*\*Cursor\*\* is included in the installer run\./);
  assert.match(rendered, /`\.cursor\/skills\/linear-workflow\/SKILL\.md`/);
  assert.doesNotMatch(rendered, /__[A-Z0-9_]+__/);
});

test('ui-check template for claude replaces all placeholders with claude paths', () => {
  const rendered = readUiCheckSkillTemplate('claude');

  assert.match(rendered, /when \*\*Claude Code\*\* is included in the installer run\./);
  assert.match(rendered, /`\.claude\/skills\/linear-workflow\/SKILL\.md`/);
  assert.doesNotMatch(rendered, /__[A-Z0-9_]+__/);
});

test('cursor legacy rules stub keeps links to rules directory and AGENTS index', () => {
  const cursorRules = readTemplate('cursor/cursorrules');

  assert.match(cursorRules, /Primary project rules/);
  assert.match(cursorRules, /`\.cursor\/rules\/`/);
  assert.match(cursorRules, /`AGENTS\.md`/);
});
