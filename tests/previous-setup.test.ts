import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadPreviousInteractiveDefaults } from '../src/previous-setup.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ca-ai-tools-setup-prev-'));
}

test('loadPreviousInteractiveDefaults returns null when metadata is missing', () => {
  const dir = tmpDir();

  try {
    assert.equal(loadPreviousInteractiveDefaults(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPreviousInteractiveDefaults parses assistants and MCP flags', () => {
  const dir = tmpDir();

  try {
    const assistantSetup = path.join(dir, '.assistant-setup');

    fs.mkdirSync(assistantSetup, { recursive: true });
    fs.writeFileSync(
      path.join(assistantSetup, 'ca-ai-tools-setup.json'),
      JSON.stringify({
        version: 5,
        assistants: ['claude'],
        playwrightMcp: { cursorFile: false, projectRootFile: true },
        figmaMcp: { cursorFile: false, projectRootFile: true },
        qaAiRules: { enabled: true, package: '@metricinsights/qa-ai-rules' },
      }),
      'utf8',
    );

    const d = loadPreviousInteractiveDefaults(dir);

    assert.ok(d);
    assert.deepEqual(d!.assistants, ['claude']);
    assert.equal(d!.playwrightMcpInclude, true);
    assert.equal(d!.figmaMcpInclude, true);
    assert.equal(d!.qaAiRulesInclude, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPreviousInteractiveDefaults uses defaults when MCP blocks are absent', () => {
  const dir = tmpDir();

  try {
    const assistantSetup = path.join(dir, '.assistant-setup');

    fs.mkdirSync(assistantSetup, { recursive: true });
    fs.writeFileSync(
      path.join(assistantSetup, 'ca-ai-tools-setup.json'),
      JSON.stringify({
        assistants: ['cursor', 'claude'],
      }),
      'utf8',
    );

    const d = loadPreviousInteractiveDefaults(dir);

    assert.ok(d);
    assert.equal(d!.playwrightMcpInclude, true);
    assert.equal(d!.figmaMcpInclude, false);
    assert.equal(d!.qaAiRulesInclude, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPreviousInteractiveDefaults reads legacy assistant field', () => {
  const dir = tmpDir();

  try {
    const assistantSetup = path.join(dir, '.assistant-setup');

    fs.mkdirSync(assistantSetup, { recursive: true });
    fs.writeFileSync(
      path.join(assistantSetup, 'ca-ai-tools-setup.json'),
      JSON.stringify({ assistant: 'cursor' }),
      'utf8',
    );

    const d = loadPreviousInteractiveDefaults(dir);

    assert.ok(d);
    assert.deepEqual(d!.assistants, ['cursor']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
