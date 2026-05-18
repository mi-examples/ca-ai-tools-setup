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
import { buildPackageRunInvocation, type PackageRunnerId, type PackageRunInvocation } from '../src/package-manager.js';
import { QA_AI_RULES_PACKAGE } from '../src/constants.js';

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
  spawnPackageArgv?: (
    argv: readonly string[],
    options?: { cwd?: string; stdio?: 'inherit'; env?: NodeJS.ProcessEnv },
  ) => { error?: Error; status?: number | null };
} = {}) {
  return {
    existsSync: overrides.existsSync ?? fs.existsSync,
    detectPackageRunner: overrides.detectPackageRunner ?? (() => 'npm'),
    buildPackageRunInvocation:
      overrides.buildPackageRunInvocation ??
      ((runner, packageName, forwardArgs) =>
        buildPackageRunInvocation(runner, packageName, forwardArgs)) as (
        runner: PackageRunnerId,
        packageName: string,
        forwardArgs: string[],
      ) => PackageRunInvocation,
    spawnPackageArgv:
      overrides.spawnPackageArgv ??
      ((() => ({
        status: 0,
      })) as (
        argv: readonly string[],
        options?: { cwd?: string; stdio?: 'inherit'; env?: NodeJS.ProcessEnv },
      ) => { error?: Error; status?: number | null }),
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

test('runQaAiRulesSetupWithDeps returns run-failed when spawnPackageArgv throws error', () => {
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
          argv: ['pnpm', 'dlx', QA_AI_RULES_PACKAGE, 'init', '--cursor'],
          label: 'pnpm dlx',
        }),
        spawnPackageArgv: () => ({ error: new Error('spawn failed') }),
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
          argv: ['bunx', QA_AI_RULES_PACKAGE, 'init', '--claude'],
          label: 'bunx',
        }),
        spawnPackageArgv: () => ({ status: 2 }),
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
  const calls: Array<{ argv: string[]; cwd?: string }> = [];
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
        spawnPackageArgv: (argv, options) => {
          calls.push({ argv: [...argv], cwd: options?.cwd });

          return { status: 0 };
        },
      }),
    );

    assert.deepEqual(invocations, [
      {
        runner: 'yarn-dlx',
        packageName: QA_AI_RULES_PACKAGE,
        forwardArgs: ['init', '--cursor', '--claude'],
      },
    ]);
    assert.deepEqual(calls, [
      {
        argv: ['yarn', 'dlx', '@metricinsights/qa-ai-rules', 'init', '--cursor', '--claude'],
        cwd: dir,
      },
    ]);
    assert.deepEqual(result, { ok: true, runnerLabel: 'yarn dlx' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
