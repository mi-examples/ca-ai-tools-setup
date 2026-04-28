import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linear-assistant-cli-'));
}

test('cli --dry-run does not write generated files', () => {
  const targetDir = makeTempDir();

  const result = spawnSync(
    process.execPath,
    ['dist/cli.js', '--target', targetDir, '--assistants', 'cursor', '--yes', '--dry-run', '--mcp-playwright', 'no'],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, `CLI exited with non-zero status.\nSTDERR:\n${result.stderr}`);
  assert.match(result.stdout, /Dry run completed\./);
  assert.equal(fs.existsSync(path.join(targetDir, 'setup-cursor-assistant.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/page-workflow-context.md')), false);
  assert.equal(fs.existsSync(path.join(targetDir, '.assistant-setup/linear-cli-setup.json')), false);
});
