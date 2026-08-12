import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-ai-tools-setup-package-'));
let tarballPath;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  });
}

function runNpm(args) {
  const npmCliPath = process.env.npm_execpath;

  return npmCliPath ? run(process.execPath, [npmCliPath, ...args]) : run('npm', args);
}

function listFiles(root) {
  return fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
}

try {
  const packOutput = runNpm(['pack', '--json']);
  const packResult = JSON.parse(packOutput);

  assert.equal(packResult.length, 1, 'npm pack should produce exactly one artifact');
  tarballPath = path.join(repoRoot, packResult[0].filename);

  const packedPaths = new Set(packResult[0].files.map((file) => file.path));

  assert.ok(packedPaths.has('dist/cli.js'), 'packed artifact should contain the compiled CLI');
  assert.ok(packedPaths.has('dist/release-info.json'), 'packed artifact should contain release provenance');
  assert.ok(
    [...packedPaths].some((filePath) => filePath.startsWith('templates/')),
    'packed artifact should contain templates',
  );
  assert.equal(
    [...packedPaths].some(
      (filePath) => filePath.startsWith('src/') || filePath.startsWith('tests/') || filePath.startsWith('scripts/'),
    ),
    false,
    'development source should not be published',
  );

  const installRoot = path.join(tempRoot, 'install');
  const targetRoot = path.join(tempRoot, 'target');

  fs.mkdirSync(installRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });

  runNpm(['install', '--ignore-scripts', '--no-package-lock', '--prefix', installRoot, tarballPath]);

  const packageRoot = path.join(installRoot, 'node_modules', '@metricinsights', 'ca-ai-tools-setup');
  const cliPath = path.join(packageRoot, 'dist', 'cli.js');
  const releaseInfo = JSON.parse(fs.readFileSync(path.join(packageRoot, 'dist', 'release-info.json'), 'utf8'));
  const versionOutput = run(process.execPath, [cliPath, '--version'], { cwd: installRoot });

  assert.equal(versionOutput, `${packageJson.version}\n`);
  assert.match(releaseInfo.releaseCommit, /^(?:[0-9a-f]{40}|unknown)$/u);

  run(
    process.execPath,
    [
      cliPath,
      '--target',
      targetRoot,
      '--assistants',
      'cursor,claude',
      '--yes',
      '--mcp-playwright',
      'yes',
      '--mcp-figma',
      'yes',
    ],
    { cwd: installRoot },
  );

  const generatedFiles = listFiles(targetRoot);

  assert.equal(generatedFiles.length, 71, 'packed CLI should generate the complete setup');
  assert.ok(fs.existsSync(path.join(targetRoot, '.cursor', 'skills', 'ai-development', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.cursor', 'rules', 'assistant-setup-health.mdc')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.claude', 'skills', 'ai-development', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.assistant-setup', 'SETUP_STATUS.md')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.assistant-setup', 'ca-ai-tools-setup.json')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.cursor', 'mcp.json')));
  assert.ok(fs.existsSync(path.join(targetRoot, '.mcp.json')));

  console.log(`Packaged artifact generated ${generatedFiles.length} files successfully.`);
} finally {
  if (tarballPath) {
    fs.rmSync(tarballPath, { force: true });
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
}
