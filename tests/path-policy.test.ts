import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { resolveCliRepoRoot } from '../src/path-policy.js';

function sampleCwd(): string {
  return path.resolve(os.tmpdir(), 'ca-ai-tools-setup-tests', 'repo-parent');
}

test('resolveCliRepoRoot uses cwd when target omitted', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot(undefined, cwd), path.resolve(cwd));
});

test('resolveCliRepoRoot resolves relative segment against cwd', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot('child', cwd), path.resolve(cwd, 'child'));
});

test('resolveCliRepoRoot treats whitespace-only as cwd', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot('   ', cwd), path.resolve(cwd));
});

test('resolveCliRepoRoot treats empty string as cwd', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot('', cwd), path.resolve(cwd));
});

test('resolveCliRepoRoot matches path.resolve for relative dot and nested segments', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot('./child', cwd), path.resolve(cwd, 'child'));
  assert.equal(resolveCliRepoRoot('a/b', cwd), path.resolve(cwd, 'a', 'b'));
});

test('resolveCliRepoRoot normalizes parent segments like path.resolve', () => {
  const cwd = sampleCwd();

  assert.equal(resolveCliRepoRoot('..', cwd), path.resolve(cwd, '..'));
});

test('resolveCliRepoRoot absolute target matches path.resolve(cwd, target)', () => {
  const cwd = sampleCwd();
  const absolute = path.resolve(os.tmpdir(), 'ca-ai-tools-setup-tests', 'abs-repo');

  assert.equal(resolveCliRepoRoot(absolute, cwd), path.resolve(cwd, absolute));
});

test('resolveCliRepoRoot always returns an absolute path', () => {
  const cwd = sampleCwd();

  assert.equal(path.isAbsolute(resolveCliRepoRoot(undefined, cwd)), true);
  assert.equal(path.isAbsolute(resolveCliRepoRoot('child', cwd)), true);
});
