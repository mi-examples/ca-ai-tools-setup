import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPackageRunInvocation,
  buildWindowsCmdCommandLine,
  buildWindowsCmdSpawnArgument,
  buildWindowsNpmExecArgv,
  describeSpawnPackageArgv,
  detectPackageRunner,
  hasBareScopedPackageArg,
  isCmdSafeArgv,
  isNpmExecArgv,
  npxArgvToNpmExecArgv,
  quoteWindowsCmdArgument,
  type PackageRunnerId,
} from '../src/package-manager.js';
import { QA_AI_RULES_CLI, QA_AI_RULES_PACKAGE } from '../src/constants.js';

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ca-pm-'));
}

function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

test('detectPackageRunner uses packageManager field (pnpm)', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), {
      name: 'x',
      packageManager: 'pnpm@9.0.0',
    });
    assert.equal(detectPackageRunner(dir), 'pnpm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner uses packageManager field (yarn 3 → yarn-dlx)', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), {
      name: 'x',
      packageManager: 'yarn@3.6.0',
    });
    assert.equal(detectPackageRunner(dir), 'yarn-dlx');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner uses packageManager field (yarn 1 → npm / npx)', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), {
      name: 'x',
      packageManager: 'yarn@1.22.19',
    });
    assert.equal(detectPackageRunner(dir), 'npm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner pnpm-lock.yaml', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), { name: 'x' });
    fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), 'lockfile: v9\n', 'utf8');
    assert.equal(detectPackageRunner(dir), 'pnpm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner bun.lockb', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), { name: 'x' });
    fs.writeFileSync(path.join(dir, 'bun.lockb'), '', 'utf8');
    assert.equal(detectPackageRunner(dir), 'bun');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner yarn.lock + berry layout → yarn-dlx', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), { name: 'x' });
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '# yarn lock\n', 'utf8');
    fs.writeFileSync(path.join(dir, '.yarnrc.yml'), 'nodeLinker: node-modules\n', 'utf8');
    assert.equal(detectPackageRunner(dir), 'yarn-dlx');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner yarn.lock only → npm', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), { name: 'x' });
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '# yarn v1 lock\n', 'utf8');
    assert.equal(detectPackageRunner(dir), 'npm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectPackageRunner defaults to npm', () => {
  const dir = tmp();

  try {
    writeJson(path.join(dir, 'package.json'), { name: 'x' });
    assert.equal(detectPackageRunner(dir), 'npm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function assertArgv(runner: PackageRunnerId, expectedPrefix: string[], expectedTail: string[]): void {
  const inv = buildPackageRunInvocation(runner, QA_AI_RULES_PACKAGE, ['init', '--cursor']);
  const want = [...expectedPrefix, ...expectedTail];

  assert.deepEqual(inv.argv, want);
}

test('buildPackageRunInvocation argv by runner', () => {
  if (process.platform === 'win32') {
    assertArgv(
      'npm',
      ['npm', 'exec', '--yes', `--package=${QA_AI_RULES_PACKAGE}`, '--', QA_AI_RULES_CLI],
      ['init', '--cursor'],
    );
  } else {
    assertArgv('npm', ['npx', '--yes'], [QA_AI_RULES_PACKAGE, 'init', '--cursor']);
  }

  assertArgv('pnpm', ['pnpm', 'dlx'], [QA_AI_RULES_PACKAGE, 'init', '--cursor']);
  assertArgv('yarn-dlx', ['yarn', 'dlx'], [QA_AI_RULES_PACKAGE, 'init', '--cursor']);
  assertArgv('bun', ['bunx'], [QA_AI_RULES_PACKAGE, 'init', '--cursor']);
});

test('quoteWindowsCmdArgument quotes scoped npm package names', () => {
  assert.equal(quoteWindowsCmdArgument('@metricinsights/qa-ai-rules'), '"@metricinsights/qa-ai-rules"');
  assert.equal(quoteWindowsCmdArgument('init'), 'init');
});

test('buildWindowsCmdCommandLine quotes scoped package in npx argv', () => {
  const line = buildWindowsCmdCommandLine([
    'npx',
    '--yes',
    '@metricinsights/qa-ai-rules',
    'init',
    '--cursor',
  ]);

  assert.equal(line, 'npx --yes "@metricinsights/qa-ai-rules" init --cursor');
});

test('buildWindowsCmdSpawnArgument wraps full command line for cmd /s /c', () => {
  const arg = buildWindowsCmdSpawnArgument(['npx', '--yes', '@metricinsights/qa-ai-rules', 'init']);

  assert.equal(arg, '"npx --yes ""@metricinsights/qa-ai-rules"" init"');
});

test('hasBareScopedPackageArg detects bare scoped package argv', () => {
  assert.equal(hasBareScopedPackageArg(['npx', '--yes', '@scope/pkg', 'init']), true);
  assert.equal(isCmdSafeArgv(buildWindowsNpmExecArgv('@scope/pkg', ['init'])), true);
  assert.equal(isNpmExecArgv(buildWindowsNpmExecArgv('@scope/pkg', ['init'])), true);
});

test('describeSpawnPackageArgv uses shell-safe npm exec on Windows', () => {
  const argv = buildWindowsNpmExecArgv('@scope/pkg', ['init']);
  const plan = describeSpawnPackageArgv(argv, '/tmp/app');

  assert.equal(plan.cwd, '/tmp/app');

  if (process.platform === 'win32') {
    assert.equal(plan.method, 'win32-shell-safe');
    assert.equal(plan.shellCommandLine, buildWindowsCmdCommandLine(argv));
  } else {
    assert.equal(plan.method, 'posix-spawn');
  }
});

test('describeSpawnPackageArgv uses win32-direct for bare scoped package argv', () => {
  const argv = ['pnpm', 'dlx', '@scope/pkg', 'init'];
  const plan = describeSpawnPackageArgv(argv, '/tmp/app');

  assert.equal(plan.method, process.platform === 'win32' ? 'win32-direct' : 'posix-spawn');
  assert.equal(plan.shellCommandLine, undefined);
});

test('buildWindowsNpmExecArgv uses --package= and CLI name', () => {
  assert.deepEqual(buildWindowsNpmExecArgv(QA_AI_RULES_PACKAGE, ['init', '--cursor']), [
    'npm',
    'exec',
    '--yes',
    `--package=${QA_AI_RULES_PACKAGE}`,
    '--',
    QA_AI_RULES_CLI,
    'init',
    '--cursor',
  ]);
});

test('npxArgvToNpmExecArgv converts npx argv', () => {
  assert.deepEqual(
    npxArgvToNpmExecArgv(['npx', '--yes', QA_AI_RULES_PACKAGE, 'init', '--cursor']),
    buildWindowsNpmExecArgv(QA_AI_RULES_PACKAGE, ['init', '--cursor']),
  );
  assert.equal(npxArgvToNpmExecArgv(['pnpm', 'dlx', QA_AI_RULES_PACKAGE, 'init']), null);
});
