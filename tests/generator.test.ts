import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateSetup } from '../src/generator.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linear-assistant-setup-'));
}

test('generateSetup creates files for selected assistants', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });

  assert.ok(result.created.includes('setup-cursor-assistant.md'));
  assert.ok(fs.existsSync(path.join(dir, 'setup-cursor-assistant.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/linear-cli.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(dir, '.assistant-setup/page-workflow-context.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'setup-claude-assistant.md')));
});

test('generateSetup omits .cursor/mcp.json when Playwright MCP is declined', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(result.created.includes('setup-cursor-assistant.md'));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);
  const md = fs.readFileSync(path.join(dir, 'setup-cursor-assistant.md'), 'utf8');

  assert.ok(md.includes('installer **chose not to**'));
  assert.ok(md.includes('https://help.metricinsights.com/m/API_Access'));
});

test('generateSetup setup-cursor notes bootstrap included MCP when enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
  const md = fs.readFileSync(path.join(dir, 'setup-cursor-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('can differ by Metric Insights instance version'));
});

test('generateSetup writes .mcp.json for Claude when Playwright MCP enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: true });
  assert.equal(meta.version, 2);
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
  const md = fs.readFileSync(path.join(dir, 'setup-claude-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('https://help.metricinsights.com/m/API_Access'));
});

test('generateSetup omits .mcp.json for Claude when Playwright MCP declined', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });
  assert.equal(fs.existsSync(path.join(dir, '.mcp.json')), false);
  const md = fs.readFileSync(path.join(dir, 'setup-claude-assistant.md'), 'utf8');

  assert.ok(md.includes('installer **chose not to**'));
  assert.ok(md.includes('can differ by Metric Insights instance version'));
});

test('generateSetup always overwrites setup assistant files', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  const second = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(second.overwritten.includes('setup-claude-assistant.md'));
  assert.ok(second.skipped.includes('.assistant-setup/linear-cli-setup.json'));
  assert.ok(second.skipped.includes('.assistant-setup/page-workflow-context.md'));

  const forced = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: true,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(forced.overwritten.includes('setup-claude-assistant.md'));
});

test('generateSetup writes both MCP files when Cursor and Claude selected and MCP enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: true, projectRootFile: true });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
});

test('generateSetup dry-run does not write files', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: true,
    dryRun: true,
    playwrightMcpInclude: true,
  });

  assert.ok(result.created.length > 0);
  assert.equal(fs.existsSync(path.join(dir, 'setup-cursor-assistant.md')), false);
  assert.equal(fs.existsSync(path.join(dir, 'setup-claude-assistant.md')), false);
});

test('generateSetup merge combines mcpServers in existing .cursor/mcp.json', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  const prior = {
    mcpServers: {
      custom: { command: 'echo', args: ['mcp'] },
    },
    note: 'keep-me',
  };

  fs.writeFileSync(path.join(dir, '.cursor/mcp.json'), `${JSON.stringify(prior, null, 2)}\n`, 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    existingFileActions: { '.cursor/mcp.json': 'merge' },
  });

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
    note: string;
  };

  assert.equal(parsed.note, 'keep-me');
  assert.ok(parsed.mcpServers.custom);
  assert.ok(parsed.mcpServers.playwright);
});
