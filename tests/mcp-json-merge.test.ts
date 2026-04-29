import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMcpConfigPath,
  isMergeablePath,
  mergeMcpJson,
  mergeClaudeSettingsJson,
  mergeAgentsMd,
  mergeFile,
} from '../src/mcp-json-merge.js';

test('isMcpConfigPath recognizes MCP config paths', () => {
  assert.equal(isMcpConfigPath('.cursor/mcp.json'), true);
  assert.equal(isMcpConfigPath('.mcp.json'), true);
  assert.equal(isMcpConfigPath('setup-claude-assistant.md'), false);
});

test('mergeMcpJson unions mcpServers and preserves other top-level keys', () => {
  const existing = JSON.stringify(
    {
      mcpServers: {
        other: { command: 'echo', args: ['hi'] },
      },
      extra: 1,
    },
    null,
    2,
  );
  const incoming = JSON.stringify(
    {
      mcpServers: {
        playwright: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp'] },
      },
    },
    null,
    2,
  );

  const out = mergeMcpJson(existing, incoming);
  const parsed = JSON.parse(out) as {
    mcpServers: Record<string, unknown>;
    extra: number;
  };

  assert.equal(parsed.extra, 1);
  assert.ok(parsed.mcpServers.other);
  assert.ok(parsed.mcpServers.playwright);
});

test('mergeMcpJson incoming server wins on name collision', () => {
  const existing = JSON.stringify({ mcpServers: { playwright: { command: 'old' } } }, null, 2);
  const incoming = JSON.stringify({ mcpServers: { playwright: { command: 'new' } } }, null, 2);
  const parsed = JSON.parse(mergeMcpJson(existing, incoming)) as { mcpServers: { playwright: { command: string } } };

  assert.equal(parsed.mcpServers.playwright.command, 'new');
});

test('mergeMcpJson throws on invalid existing JSON', () => {
  assert.throws(() => mergeMcpJson('{', '{}'), /not valid JSON/);
});

// isMergeablePath

test('isMergeablePath recognizes all mergeable paths', () => {
  assert.equal(isMergeablePath('.cursor/mcp.json'), true);
  assert.equal(isMergeablePath('.mcp.json'), true);
  assert.equal(isMergeablePath('.claude/settings.json'), true);
  assert.equal(isMergeablePath('AGENTS.md'), true);
  assert.equal(isMergeablePath('CLAUDE.md'), false);
  assert.equal(isMergeablePath('.cursorrules'), false);
});

// mergeClaudeSettingsJson

test('mergeClaudeSettingsJson unions enabledMcpjsonServers', () => {
  const existing = JSON.stringify({ enabledMcpjsonServers: ['playwright'] }, null, 2);
  const incoming = JSON.stringify({ enabledMcpjsonServers: ['figma'] }, null, 2);
  const parsed = JSON.parse(mergeClaudeSettingsJson(existing, incoming)) as {
    enabledMcpjsonServers: string[];
  };

  assert.deepEqual(parsed.enabledMcpjsonServers.sort(), ['figma', 'playwright']);
});

test('mergeClaudeSettingsJson deduplicates enabledMcpjsonServers', () => {
  const existing = JSON.stringify({ enabledMcpjsonServers: ['playwright'] }, null, 2);
  const incoming = JSON.stringify({ enabledMcpjsonServers: ['playwright', 'figma'] }, null, 2);
  const parsed = JSON.parse(mergeClaudeSettingsJson(existing, incoming)) as {
    enabledMcpjsonServers: string[];
  };

  assert.deepEqual(parsed.enabledMcpjsonServers.sort(), ['figma', 'playwright']);
});

test('mergeClaudeSettingsJson unions permissions.allow', () => {
  const existing = JSON.stringify({ permissions: { allow: ['mcp__playwright__*'] } }, null, 2);
  const incoming = JSON.stringify({ permissions: { allow: ['mcp__figma__*'] } }, null, 2);
  const parsed = JSON.parse(mergeClaudeSettingsJson(existing, incoming)) as {
    permissions: { allow: string[] };
  };

  assert.deepEqual(parsed.permissions.allow.sort(), ['mcp__figma__*', 'mcp__playwright__*']);
});

test('mergeClaudeSettingsJson preserves existing $schema', () => {
  const existing = JSON.stringify({ $schema: 'https://existing.schema', enabledMcpjsonServers: ['playwright'] }, null, 2);
  const incoming = JSON.stringify({ $schema: 'https://incoming.schema', enabledMcpjsonServers: ['figma'] }, null, 2);
  const parsed = JSON.parse(mergeClaudeSettingsJson(existing, incoming)) as { $schema: string };

  assert.equal(parsed.$schema, 'https://existing.schema');
});

test('mergeClaudeSettingsJson sets enableAllProjectMcpServers true when either side enables it', () => {
  const withFlag = JSON.stringify({ enableAllProjectMcpServers: true }, null, 2);
  const withoutFlag = JSON.stringify({}, null, 2);

  const parsedA = JSON.parse(mergeClaudeSettingsJson(withFlag, withoutFlag)) as Record<string, unknown>;
  const parsedB = JSON.parse(mergeClaudeSettingsJson(withoutFlag, withFlag)) as Record<string, unknown>;
  const parsedC = JSON.parse(mergeClaudeSettingsJson(withoutFlag, withoutFlag)) as Record<string, unknown>;

  assert.equal(parsedA.enableAllProjectMcpServers, true);
  assert.equal(parsedB.enableAllProjectMcpServers, true);
  assert.equal(parsedC.enableAllProjectMcpServers, undefined);
});

test('mergeClaudeSettingsJson merges enabledPlugins maps', () => {
  const existing = JSON.stringify({ enabledPlugins: { 'my-plugin@custom': true } }, null, 2);
  const incoming = JSON.stringify({ enabledPlugins: { 'claude-code-setup@claude-plugins-official': true } }, null, 2);
  const parsed = JSON.parse(mergeClaudeSettingsJson(existing, incoming)) as {
    enabledPlugins: Record<string, boolean>;
  };

  assert.equal(parsed.enabledPlugins['my-plugin@custom'], true);
  assert.equal(parsed.enabledPlugins['claude-code-setup@claude-plugins-official'], true);
});

test('mergeClaudeSettingsJson throws on invalid existing JSON', () => {
  assert.throws(() => mergeClaudeSettingsJson('{', '{}'), /not valid JSON/);
});

// mergeAgentsMd

test('mergeAgentsMd appends new agent rows not in existing', () => {
  const existing = [
    '## Registered agents',
    '',
    '| File | Purpose |',
    '|------|---------|',
    '| `existing-agent.md` | Existing agent. |',
    '',
  ].join('\n');

  const incoming = [
    '## Registered agents',
    '',
    '| File | Purpose |',
    '|------|---------|',
    '| `new-agent.md` | New agent. |',
    '',
  ].join('\n');

  const result = mergeAgentsMd(existing, incoming);

  assert.ok(result.includes('`existing-agent.md`'));
  assert.ok(result.includes('`new-agent.md`'));
});

test('mergeAgentsMd does not duplicate existing rows', () => {
  const existing = [
    '| File | Purpose |',
    '|------|---------|',
    '| `figma-mcp.md` | Figma MCP. |',
  ].join('\n');

  const incoming = [
    '| File | Purpose |',
    '|------|---------|',
    '| `figma-mcp.md` | Figma MCP updated description. |',
  ].join('\n');

  const result = mergeAgentsMd(existing, incoming);
  const matches = result.match(/`figma-mcp\.md`/g);

  assert.equal(matches?.length, 1);
});

test('mergeAgentsMd returns existing unchanged when no new rows', () => {
  const content = '| `figma-mcp.md` | Figma. |\n';

  assert.equal(mergeAgentsMd(content, content), content);
});

// mergeFile dispatch

test('mergeFile dispatches to mergeMcpJson for MCP paths', () => {
  const existing = JSON.stringify({ mcpServers: { old: {} } }, null, 2);
  const incoming = JSON.stringify({ mcpServers: { new: {} } }, null, 2);
  const parsed = JSON.parse(mergeFile('.cursor/mcp.json', existing, incoming)) as {
    mcpServers: Record<string, unknown>;
  };

  assert.ok(parsed.mcpServers.old);
  assert.ok(parsed.mcpServers.new);
});

test('mergeFile dispatches to mergeClaudeSettingsJson for .claude/settings.json', () => {
  const existing = JSON.stringify({ enabledMcpjsonServers: ['playwright'] }, null, 2);
  const incoming = JSON.stringify({ enabledMcpjsonServers: ['figma'] }, null, 2);
  const parsed = JSON.parse(mergeFile('.claude/settings.json', existing, incoming)) as {
    enabledMcpjsonServers: string[];
  };

  assert.deepEqual(parsed.enabledMcpjsonServers.sort(), ['figma', 'playwright']);
});

test('mergeFile dispatches to mergeAgentsMd for AGENTS.md', () => {
  const existing = '| `agent-a.md` | A. |\n';
  const incoming = '| `agent-b.md` | B. |\n';
  const result = mergeFile('AGENTS.md', existing, incoming);

  assert.ok(result.includes('`agent-a.md`'));
  assert.ok(result.includes('`agent-b.md`'));
});

test('mergeFile throws for unsupported path', () => {
  assert.throws(() => mergeFile('CLAUDE.md', 'a', 'b'), /Merge is not supported/);
});
