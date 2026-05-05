import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linear-assistant-cli-'));
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
}

function writeFile(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
}

test('cli --dry-run does not write generated files', () => {
  const targetDir = makeTempDir();

  const result = runCli([
    '--target',
    targetDir,
    '--assistants',
    'cursor',
    '--yes',
    '--dry-run',
    '--mcp-playwright',
    'no',
  ]);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.match(result.stdout, /Dry run completed\./);
  assert.equal(fs.existsSync(path.join(targetDir, 'setup-cursor-assistant.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.dev-environment.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/page-workflow-context.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/ca-ai-tools-setup.json')), false);
  assert.equal(fs.existsSync(path.join(targetDir, 'LINEAR_CLI.md')), false);
});

test('cli --yes with cursor writes default Cursor setup and Playwright MCP', () => {
  const targetDir = makeTempDir();
  const result = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes']);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.ok(fs.existsSync(path.join(targetDir, 'setup-cursor-assistant.md')));
  assert.ok(fs.existsSync(path.join(targetDir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(targetDir, '.cursor/skills/ui-check/SKILL.md')));
  assert.equal(fs.existsSync(path.join(targetDir, '.mcp.json')), false);

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(targetDir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers?: Record<string, unknown>;
  };

  assert.ok(cursorMcp.mcpServers?.playwright);
});

test('cli enables figma-only MCP when Playwright disabled and Figma enabled', () => {
  const targetDir = makeTempDir();
  const result = runCli([
    '--target',
    targetDir,
    '--assistants',
    'cursor',
    '--yes',
    '--mcp-playwright',
    'no',
    '--mcp-figma',
    'yes',
  ]);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.ok(fs.existsSync(path.join(targetDir, '.cursor/rules/figma-mcp.mdc')));

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(targetDir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers?: Record<string, unknown>;
  };

  assert.ok(cursorMcp.mcpServers?.figma);
  assert.equal(Boolean(cursorMcp.mcpServers?.playwright), false);
});

test('cli --force overwrites existing generated files', () => {
  const targetDir = makeTempDir();
  const first = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  assert.equal(first.status, 0, `Initial run failed.\nSTDERR:\n${first.stderr}`);

  const cursorRulesPath = path.join(targetDir, '.cursorrules');
  
  fs.writeFileSync(cursorRulesPath, 'MANUAL TEST CONTENT\n', 'utf8');

  const second = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes']);

  assert.equal(second.status, 0, `Second run failed.\nSTDERR:\n${second.stderr}`);
  assert.equal(fs.readFileSync(cursorRulesPath, 'utf8'), 'MANUAL TEST CONTENT\n');

  const forced = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--force']);

  assert.equal(forced.status, 0, `Forced run failed.\nSTDERR:\n${forced.stderr}`);
  assert.notEqual(fs.readFileSync(cursorRulesPath, 'utf8'), 'MANUAL TEST CONTENT\n');
});

test('cli --yes skips existing .cursor/mcp.json (no merge prompt in non-interactive mode)', () => {
  const targetDir = makeTempDir();
  const mcpPath = path.join(targetDir, '.cursor/mcp.json');
  const customMcp = `${JSON.stringify(
    {
      mcpServers: {
        custom: {
          command: 'node',
          args: ['custom-mcp.js'],
        },
      },
    },
    null,
    2,
  )}\n`;

  writeFile(mcpPath, customMcp);

  const result = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'yes']);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.equal(fs.readFileSync(mcpPath, 'utf8'), customMcp);
  assert.match(result.stdout, /Skipped existing files:/);
  assert.match(result.stdout, /\.cursor\/mcp\.json/);
});

test('cli --yes skips existing .claude/settings.json and AGENTS.md', () => {
  const targetDir = makeTempDir();
  const settingsPath = path.join(targetDir, '.claude/settings.json');
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const customSettings = `${JSON.stringify(
    {
      $schema: 'https://example.local/custom-schema.json',
      enabledPlugins: {
        custom: true,
      },
    },
    null,
    2,
  )}\n`;
  const customAgents = '# Custom agents\n\nDo not overwrite.\n';

  writeFile(settingsPath, customSettings);
  writeFile(agentsPath, customAgents);

  const result = runCli(['--target', targetDir, '--assistants', 'claude', '--yes', '--mcp-playwright', 'yes']);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), customSettings);
  assert.equal(fs.readFileSync(agentsPath, 'utf8'), customAgents);
  assert.match(result.stdout, /\.claude\/settings\.json/);
  assert.match(result.stdout, /AGENTS\.md/);
});

test('cli --yes skips existing .mcp.json and keeps configured token', () => {
  const targetDir = makeTempDir();
  const mcpPath = path.join(targetDir, '.mcp.json');
  const customMcp = `${JSON.stringify(
    {
      mcpServers: {
        figma: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'figma-developer-mcp', '--stdio'],
          env: {
            FIGMA_API_KEY: 'existing-user-token',
          },
        },
      },
    },
    null,
    2,
  )}\n`;

  writeFile(mcpPath, customMcp);

  const result = runCli([
    '--target',
    targetDir,
    '--assistants',
    'claude',
    '--yes',
    '--mcp-playwright',
    'no',
    '--mcp-figma',
    'yes',
  ]);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.equal(fs.readFileSync(mcpPath, 'utf8'), customMcp);
  assert.match(result.stdout, /\.mcp\.json/);
});

test('cli --force overwrites existing mergeable files for claude flow', () => {
  const targetDir = makeTempDir();
  const settingsPath = path.join(targetDir, '.claude/settings.json');
  const agentsPath = path.join(targetDir, 'AGENTS.md');

  writeFile(settingsPath, '{"enabledPlugins":{"legacy":true}}\n');
  writeFile(agentsPath, '# Manual AGENTS\n');

  const result = runCli([
    '--target',
    targetDir,
    '--assistants',
    'claude',
    '--yes',
    '--mcp-playwright',
    'yes',
    '--force',
  ]);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.match(fs.readFileSync(settingsPath, 'utf8'), /claude-code-settings/);
  assert.match(fs.readFileSync(settingsPath, 'utf8'), /mcp__playwright__/);
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /# Claude Code — agent registry/);
});

test('cli exits non-zero for invalid assistants value', () => {
  const targetDir = makeTempDir();
  const result = runCli(['--target', targetDir, '--assistants', 'cursor,unknown', '--yes']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown assistant\(s\): unknown/);
});

test('cli exits non-zero for invalid --mcp-figma value', () => {
  const targetDir = makeTempDir();
  const result = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-figma', 'maybe']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --mcp-figma value "maybe"/);
});
