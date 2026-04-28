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
  assert.ok(fs.existsSync(path.join(dir, '.dev-environment.md')));
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

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: true });
  assert.equal(meta.version, 3);
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
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
  assert.ok(second.skipped.includes('.dev-environment.md'));
  assert.ok(second.skipped.includes('.assistant-setup/ca-ai-tools-setup.json'));
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

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: true, projectRootFile: true });
  assert.deepEqual(meta.figmaMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
});

test('generateSetup writes figma MCP only when requested', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
    figmaMcpInclude: true,
  });

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  const claudeMcp = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.ok(cursorMcp.mcpServers.figma);
  assert.equal(cursorMcp.mcpServers.playwright, undefined);
  assert.ok(claudeMcp.mcpServers.figma);
  assert.equal(claudeMcp.mcpServers.playwright, undefined);
  assert.equal(fs.existsSync(path.join(dir, '.claude/agents/figma-mcp.md')), true);
  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.figmaMcp, { cursorFile: true, projectRootFile: true });
});

test('generateSetup can combine playwright and figma MCP in one file', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    figmaMcpInclude: true,
  });

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };

  assert.ok(cursorMcp.mcpServers.playwright);
  assert.ok(cursorMcp.mcpServers.figma);
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
  assert.equal(fs.existsSync(path.join(dir, '.dev-environment.md')), false);
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

test('generateSetup migrates legacy setup metadata files to new names', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.assistant-setup'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), true);
  assert.ok(
    result.migratedLegacy.includes('.assistant-setup/linear-cli-setup.json -> .assistant-setup/ca-ai-tools-setup.json'),
  );
  assert.ok(result.migratedLegacy.includes('.cursor/linear-cli-setup.json -> .cursor/ca-ai-tools-setup.json'));
});

test('generateSetup removes legacy metadata files with --force', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.assistant-setup'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: true,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), true);
  assert.ok(result.removedLegacy.includes('.assistant-setup/linear-cli-setup.json'));
  assert.ok(result.removedLegacy.includes('.cursor/linear-cli-setup.json'));
});
