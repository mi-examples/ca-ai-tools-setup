import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildQaAiRulesInitArgs,
  runQaAiRulesSetupWithDeps,
  type QaAiRulesSetupResult,
} from '../src/qa-ai-rules-setup.js';
import type { PackageRunnerId, PackageRunInvocation } from '../src/package-manager.js';

test('buildQaAiRulesInitArgs adds --cursor and --claude for both assistants', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['cursor', 'claude']), ['--cursor', '--claude']);
});

test('buildQaAiRulesInitArgs cursor only', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['cursor']), ['--cursor']);
});

test('buildQaAiRulesInitArgs claude only', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['claude']), ['--claude']);
});

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ai-rules-setup-'));
}

function makeDeps(overrides: {
  existsSync?: (path: fs.PathLike) => boolean;
  detectPackageRunner?: (targetDir: string) => PackageRunnerId;
  buildPackageRunInvocation?: (
    runner: PackageRunnerId,
    packageName: string,
    forwardArgs: string[],
  ) => PackageRunInvocation;
  spawnSync?: (
    command: string,
    args?: readonly string[],
    options?: { cwd?: string; stdio?: 'inherit'; shell?: true; env?: NodeJS.ProcessEnv },
  ) => { error?: Error; status?: number | null };
} = {}) {
  return {
    existsSync: overrides.existsSync ?? fs.existsSync,
    detectPackageRunner: overrides.detectPackageRunner ?? (() => 'npm'),
    buildPackageRunInvocation:
      overrides.buildPackageRunInvocation ??
      ((_runner: PackageRunnerId, _packageName: string, _forwardArgs: string[]) => ({
        runner: 'npm',
        argv: ['npx', '--yes', '@metricinsights/qa-ai-rules', 'init', '--cursor'],
        label: 'npx',
      })),
    spawnSync:
      overrides.spawnSync ??
      ((_command: string, _args?: readonly string[]) => ({
        status: 0,
      })),
    env: process.env,
  };
}

test('runQaAiRulesSetupWithDeps returns no-package-json when target has no package.json', () => {
  const dir = makeTempDir();

  try {
    const result = runQaAiRulesSetupWithDeps(dir, ['cursor'], makeDeps()) as QaAiRulesSetupResult;

    assert.deepEqual(result, { ok: false, reason: 'no-package-json' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runQaAiRulesSetupWithDeps returns no-assistant-for-rules when assistants list is empty', () => {
  const dir = makeTempDir();

  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}\n', 'utf8');
    const result = runQaAiRulesSetupWithDeps(dir, [], makeDeps()) as QaAiRulesSetupResult;

    assert.deepEqual(result, { ok: false, reason: 'no-assistant-for-rules' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runQaAiRulesSetupWithDeps returns run-failed when spawnSync throws error', () => {
  const dir = makeTempDir();

  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}\n', 'utf8');
    const result = runQaAiRulesSetupWithDeps(
      dir,
      ['cursor'],
      makeDeps({
        detectPackageRunner: () => 'pnpm',
        buildPackageRunInvocation: () => ({
          runner: 'pnpm',
          argv: ['pnpm', 'dlx', '@metricinsights/qa-ai-rules', 'init', '--cursor'],
          label: 'pnpm dlx',
        }),
        spawnSync: () => ({ error: new Error('spawn failed') }),
      }),
    );

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'run-failed');
    assert.equal(result.runnerLabel, 'pnpm dlx');
    assert.match(result.detail ?? '', /spawn failed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runQaAiRulesSetupWithDeps returns run-failed when command exits non-zero', () => {
  const dir = makeTempDir();

  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}\n', 'utf8');
    const result = runQaAiRulesSetupWithDeps(
      dir,
      ['claude'],
      makeDeps({
        detectPackageRunner: () => 'bun',
        buildPackageRunInvocation: () => ({
          runner: 'bun',
          argv: ['bunx', '@metricinsights/qa-ai-rules', 'init', '--claude'],
          label: 'bunx',
        }),
        spawnSync: () => ({ status: 2 }),
      }),
    );

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'run-failed');
    assert.equal(result.runnerLabel, 'bunx');
    assert.equal(result.detail, 'exit code 2');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runQaAiRulesSetupWithDeps returns success and forwards init args', () => {
  const dir = makeTempDir();
  const calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
  const invocations: Array<{ runner: PackageRunnerId; packageName: string; forwardArgs: string[] }> = [];

  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}\n', 'utf8');
    const result = runQaAiRulesSetupWithDeps(
      dir,
      ['cursor', 'claude'],
      makeDeps({
        detectPackageRunner: () => 'yarn-dlx',
        buildPackageRunInvocation: (runner, packageName, forwardArgs) => {
          invocations.push({ runner, packageName, forwardArgs });

          return {
            runner: 'yarn-dlx',
            argv: ['yarn', 'dlx', packageName, ...forwardArgs],
            label: 'yarn dlx',
          };
        },
        spawnSync: (command, args, options) => {
          calls.push({ command, args: [...(args ?? [])], cwd: options?.cwd });

          return { status: 0 };
        },
      }),
    );

    assert.deepEqual(invocations, [
      {
        runner: 'yarn-dlx',
        packageName: '@metricinsights/qa-ai-rules',
        forwardArgs: ['init', '--cursor', '--claude'],
      },
    ]);
    assert.deepEqual(calls, [
      {
        command: 'yarn',
        args: ['dlx', '@metricinsights/qa-ai-rules', 'init', '--cursor', '--claude'],
        cwd: dir,
      },
    ]);
    assert.deepEqual(result, { ok: true, runnerLabel: 'yarn dlx' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
