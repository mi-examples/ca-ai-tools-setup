import test from 'node:test';
import assert from 'node:assert/strict';
import { isMcpConfigPath, mergeMcpJson } from '../src/mcp-json-merge.js';

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
