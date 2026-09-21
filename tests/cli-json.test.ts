import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ca-ai-tools-setup-json-'));
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
}

/**
 * Parses stdout as the whole JSON document. Asserting `JSON.parse` succeeds on the raw stream is
 * the point of most of these tests: the contract is that nothing else — a clack banner, a warning,
 * a progress line — is ever allowed onto stdout in `--json` mode.
 */
function parseJsonStdout(result: ReturnType<typeof runCli>): Record<string, unknown> {
  assert.doesNotThrow(
    () => JSON.parse(result.stdout),
    `stdout was not a single JSON document.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );

  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function generate(targetDir: string, extraArgs: string[] = []) {
  return runCli(['--target', targetDir, '--assistants', 'cursor', '--yes', '--mcp-playwright', 'no', ...extraArgs]);
}

test('generate --json emits one JSON document and nothing else on stdout', () => {
  const targetDir = makeTempDir();
  const result = generate(targetDir, ['--json']);

  assert.equal(result.status, 0, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'generate');
  assert.equal(payload.targetDir, targetDir);
  assert.equal(payload.exitCode, 0);
  assert.deepEqual(payload.assistants, ['cursor']);
  assert.ok(Array.isArray(payload.created) && (payload.created as string[]).length > 0);
  assert.equal((payload.counts as Record<string, number>).created, (payload.created as string[]).length);
  assert.doesNotMatch(result.stdout, /Setup generation completed/);
});

test('generate --json reports the resolved MCP targets and QA hook', () => {
  const targetDir = makeTempDir();
  const result = generate(targetDir, ['--json', '--mcp-figma', 'yes']);

  assert.equal(result.status, 0, result.stderr);

  const payload = parseJsonStdout(result);

  assert.deepEqual(payload.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(payload.figmaMcp, { cursorFile: true, projectRootFile: false });
  assert.deepEqual(payload.qaAiRules, {
    enabled: false,
    package: '@metricinsights/qa-ai-rules',
    hook: 'inactive',
  });
});

test('check --json reports a synchronized setup with exit code 0', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const result = runCli(['check', targetDir, '--json']);

  assert.equal(result.status, 0, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.mode, 'check');
  assert.equal(payload.hasChanges, false);
  assert.equal(payload.hasConflicts, false);
  assert.equal(payload.exitCode, 0);
  assert.deepEqual(payload.conflicts, []);
  assert.ok((payload.unchanged as string[]).length > 0);
});

test('check --json reports a missing managed file and exits 2 without writing', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const missingPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.rmSync(missingPath);

  const result = runCli(['check', targetDir, '--json']);

  assert.equal(result.status, 2, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.hasChanges, true);
  assert.equal(payload.exitCode, 2);
  assert.deepEqual(payload.missing, ['.cursor/rules/code-style.mdc']);
  assert.deepEqual(payload.created, ['.cursor/rules/code-style.mdc']);
  assert.equal(fs.existsSync(missingPath), false);
});

// The payload's own exitCode and the process exit status are two ways of saying the same thing;
// a consumer that reads one and a consumer that reads the other must never disagree.
test('check --json exitCode always matches the process exit status', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const clean = runCli(['check', targetDir, '--json']);

  assert.equal(parseJsonStdout(clean).exitCode, clean.status);

  fs.rmSync(path.join(targetDir, '.cursor/rules/code-style.mdc'));

  const dirty = runCli(['check', targetDir, '--json']);

  assert.equal(parseJsonStdout(dirty).exitCode, dirty.status);
});

test('update --json surfaces conflicts as a named bucket and a per-file plan entry', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const conflictPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.writeFileSync(conflictPath, 'Local managed edit.\n', 'utf8');

  const result = runCli(['update', targetDir, '--json']);

  assert.equal(result.status, 2, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.applied, false);
  assert.equal(payload.hasConflicts, true);
  assert.deepEqual(payload.conflicts, ['.cursor/rules/code-style.mdc']);
  assert.equal(fs.readFileSync(conflictPath, 'utf8'), 'Local managed edit.\n');

  const conflicted = (payload.plan as { path: string; state: string; action: string; reason?: string }[]).find(
    (file) => file.path === '.cursor/rules/code-style.mdc',
  );

  assert.equal(conflicted?.state, 'conflict');
  assert.equal(conflicted?.action, 'none');
  assert.ok(conflicted?.reason);
});

// ReconcilePlan carries the full desired and current text of every file. Leaking that into the
// payload would make it megabytes wide for a consumer that already has the working tree.
test('the --json plan carries classifications only, never file content', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const payload = parseJsonStdout(runCli(['check', targetDir, '--json']));

  for (const file of payload.plan as Record<string, unknown>[]) {
    assert.deepEqual(
      Object.keys(file).filter((key) => !['path', 'ownership', 'state', 'action', 'reason'].includes(key)),
      [],
      `unexpected key in plan entry for ${String(file.path)}`,
    );
  }
});

test('update --json applies changes and reports applied: true', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const missingPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.rmSync(missingPath);

  const result = runCli(['update', targetDir, '--json']);

  assert.equal(result.status, 0, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.applied, true);
  assert.equal(payload.exitCode, 0);
  assert.deepEqual(payload.created, ['.cursor/rules/code-style.mdc']);
  assert.equal(fs.existsSync(missingPath), true);
});

test('update --json --dry-run previews without writing and exits 2', () => {
  const targetDir = makeTempDir();

  assert.equal(generate(targetDir).status, 0);

  const missingPath = path.join(targetDir, '.cursor/rules/code-style.mdc');

  fs.rmSync(missingPath);

  const result = runCli(['update', targetDir, '--json', '--dry-run']);

  assert.equal(result.status, 2, result.stderr);

  const payload = parseJsonStdout(result);

  assert.equal(payload.dryRun, true);
  assert.equal(payload.hasChanges, true);
  assert.equal(payload.exitCode, 2);
  assert.equal(fs.existsSync(missingPath), false);
});

test('check --json on an untouched repository reports setup-metadata-missing, not a bare failure', () => {
  const result = runCli(['check', makeTempDir(), '--json']);

  assert.equal(result.status, 1);

  const payload = parseJsonStdout(result);

  assert.equal(payload.ok, false);
  assert.equal(payload.mode, 'check');
  assert.equal(payload.exitCode, 1);
  assert.equal((payload.error as { code: string }).code, 'setup-metadata-missing');
});

test('check --json on unparseable metadata reports setup-metadata-invalid', () => {
  const targetDir = makeTempDir();

  fs.mkdirSync(path.join(targetDir, '.assistant-setup'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.assistant-setup/ca-ai-tools-setup.json'), '{ not json', 'utf8');

  const result = runCli(['check', targetDir, '--json']);

  assert.equal(result.status, 1);
  assert.equal((parseJsonStdout(result).error as { code: string }).code, 'setup-metadata-invalid');
});

test('--json refuses an interactive generate run rather than emitting a half-prompted stream', () => {
  const result = runCli(['--target', makeTempDir(), '--json']);

  assert.equal(result.status, 1);

  const payload = parseJsonStdout(result);

  assert.equal(payload.ok, false);
  assert.equal(payload.mode, 'generate');
  assert.match((payload.error as { message: string }).message, /requires a non-interactive run/);
});

test('an unrecognized --json failure still parses, with code "unknown"', () => {
  const result = runCli(['--target', makeTempDir(), '--assistants', 'cursor,bogus', '--yes', '--json']);

  assert.equal(result.status, 1);

  const payload = parseJsonStdout(result);

  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code: string }).code, 'unknown');
  assert.match((payload.error as { message: string }).message, /Unknown assistant\(s\): bogus/);
});

test('without --json the human summary is unchanged', () => {
  const targetDir = makeTempDir();
  const result = generate(targetDir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Setup generation completed\./);
  assert.throws(() => JSON.parse(result.stdout));
});
