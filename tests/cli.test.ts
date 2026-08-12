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
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/SETUP_STATUS.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/ca-ai-tools-setup.json')), false);
  assert.equal(fs.existsSync(path.join(targetDir, 'LINEAR_CLI.md')), false);
});

test('cli --yes with cursor writes default Cursor setup and Playwright MCP', () => {
  const targetDir = makeTempDir();
  const result = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes']);

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.ok(fs.existsSync(path.join(targetDir, 'setup-cursor-assistant.md')));
  assert.ok(fs.existsSync(path.join(targetDir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(targetDir, '.cursor/skills/testing-with-linear/SKILL.md')));
  assert.equal(fs.existsSync(path.join(targetDir, '.cursor/skills/ui-check/SKILL.md')), false);
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

test('cli --yes skips existing settings and safely merges AGENTS.md', () => {
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
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /Do not overwrite\./);
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /`code-style\.md`/);
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

test('cli --force overwrites settings but safely merges existing AGENTS.md', () => {
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
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /# Manual AGENTS/);
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /Registered agents added by ca-ai-tools-setup/);
  assert.match(fs.readFileSync(agentsPath, 'utf8'), /`code-style\.md`/);
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

test('cli --version prints the package version without starting setup', () => {
  const result = runCli(['--version']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, '0.1.0\n');
  assert.equal(result.stderr, '');
});

test('cli check returns zero for a synchronized tracked setup', () => {
  const targetDir = makeTempDir();
  const generated = runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  assert.equal(generated.status, 0, generated.stderr);

  const checked = runCli(['check', targetDir]);

  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Setup check completed\./);
  assert.match(checked.stdout, /Conflicts: 0/);
});

test('cli check returns two for a missing managed file without changing the repository', () => {
  const targetDir = makeTempDir();

  runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  const missingPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.rmSync(missingPath);

  const checked = runCli(['check', targetDir]);

  assert.equal(checked.status, 2, checked.stderr);
  assert.match(checked.stdout, /\.cursor\/rules\/code-style\.mdc \(create\)/);
  assert.equal(fs.existsSync(missingPath), false);
});

test('cli update recreates a missing managed file and produces a PR summary', () => {
  const targetDir = makeTempDir();

  runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  const missingPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.rmSync(missingPath);

  const updated = runCli(['update', targetDir]);

  assert.equal(updated.status, 0, updated.stderr);
  assert.equal(fs.existsSync(missingPath), true);
  assert.match(updated.stdout, /Setup update completed\./);
  assert.match(updated.stdout, /PR summary:/);
});

test('cli update blocks all writes when a managed file conflicts', () => {
  const targetDir = makeTempDir();

  runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  const conflictPath = path.join(targetDir, '.cursor/rules/code-style.mdc');
  const missingPath = path.join(targetDir, '.cursor/rules/linear-cli.mdc');

  fs.writeFileSync(conflictPath, 'Local managed edit.\n', 'utf8');
  fs.rmSync(missingPath);

  const updated = runCli(['update', targetDir]);

  assert.equal(updated.status, 2, updated.stderr);
  assert.match(updated.stdout, /Setup update blocked by conflicts\./);
  assert.equal(fs.existsSync(missingPath), false);
  assert.equal(fs.readFileSync(conflictPath, 'utf8'), 'Local managed edit.\n');
});

test('cli update is deterministic when no generated content changed', () => {
  const targetDir = makeTempDir();

  runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no']);

  const metadataPath = path.join(targetDir, '.assistant-setup/ca-ai-tools-setup.json');
  const before = fs.readFileSync(metadataPath, 'utf8');
  const updated = runCli(['update', targetDir]);
  const after = fs.readFileSync(metadataPath, 'utf8');

  assert.equal(updated.status, 0, updated.stderr);
  assert.equal(after, before);
  assert.doesNotMatch(after, /generatedAt/);
});
