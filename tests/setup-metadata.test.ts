import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createSetupMetadata,
  createSetupStatusContent,
  hashContent,
  loadSetupMetadata,
  ownershipForPath,
  serializeSetupMetadata,
  SETUP_METADATA_PATH,
} from '../src/setup-metadata.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ca-ai-tools-metadata-'));
}

test('hashContent returns a stable SHA-256 digest with portable line endings', () => {
  assert.equal(hashContent('hello\n'), 'sha256:5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03');
  assert.equal(hashContent('hello\n'), hashContent('hello\r\n'));
});

test('ownershipForPath separates managed, protected, and structured files', () => {
  assert.equal(ownershipForPath('.cursor/rules/code-style.mdc'), 'managed');
  assert.equal(ownershipForPath('.cursorrules'), 'protected');
  assert.equal(ownershipForPath('.dev-environment.md'), 'protected');
  assert.equal(ownershipForPath('.cursor/mcp.json'), 'structured');
  assert.equal(ownershipForPath('AGENTS.md'), 'structured');
});

test('createSetupMetadata is deterministic and sorts file records', () => {
  const provenance = {
    package: '@metricinsights/ca-ai-tools-setup',
    version: '1.2.3',
    releaseCommit: 'abc123',
    templateRevision: 'abc123',
  };
  const metadata = createSetupMetadata(
    {
      assistants: ['cursor'],
      playwrightMcp: { cursorFile: true, projectRootFile: false },
      figmaMcp: { cursorFile: false, projectRootFile: false },
      qaAiRulesEnabled: false,
    },
    [
      { path: 'z.md', content: 'z\n' },
      { path: 'a.md', content: 'a\n' },
      { path: SETUP_METADATA_PATH, content: 'ignored\n' },
    ],
    new Map([['z.md', 'custom z\n']]),
    provenance,
  );
  const serialized = serializeSetupMetadata(metadata);
  const parsed = JSON.parse(serialized) as Record<string, unknown>;

  assert.deepEqual(Object.keys(metadata.files), ['a.md', 'z.md']);
  assert.equal(metadata.files['a.md'].baseline, 'generated');
  assert.equal(metadata.files['z.md'].baseline, 'adopted');
  assert.deepEqual(metadata.provenance, provenance);
  assert.equal(parsed.generatedAt, undefined);
  assert.equal(serialized, serializeSetupMetadata(metadata));
});

test('createSetupStatusContent exposes an agent-readable deterministic marker', () => {
  const content = createSetupStatusContent(
    {
      assistants: ['cursor', 'claude'],
      playwrightMcp: { cursorFile: true, projectRootFile: true },
      figmaMcp: { cursorFile: false, projectRootFile: false },
      qaAiRulesEnabled: false,
    },
    {
      package: '@metricinsights/ca-ai-tools-setup',
      version: '1.2.3',
      releaseCommit: 'abc123',
      templateRevision: 'abc123',
    },
  );

  assert.match(content, /ca-ai-tools-setup-status/);
  assert.match(content, /"packageVersion":"1\.2\.3"/);
  assert.match(content, /"assistants":\["cursor","claude"\]/);
  assert.match(content, /Exit code `2`/);
  assert.match(content, /Never run `update` or `--force` without explicit developer approval/);
  assert.equal(
    content,
    createSetupStatusContent(
      {
        assistants: ['cursor', 'claude'],
        playwrightMcp: { cursorFile: true, projectRootFile: true },
        figmaMcp: { cursorFile: false, projectRootFile: false },
        qaAiRulesEnabled: false,
      },
      {
        package: '@metricinsights/ca-ai-tools-setup',
        version: '1.2.3',
        releaseCommit: 'abc123',
        templateRevision: 'abc123',
      },
    ),
  );
});

test('loadSetupMetadata distinguishes schema 5, schema 6, and malformed metadata', () => {
  const dir = makeTempDir();
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);

  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, '{"version":5,"assistants":["cursor"]}\n', 'utf8');
  assert.equal(loadSetupMetadata(dir).kind, 'legacy');

  fs.writeFileSync(metadataPath, '{"version":6}\n', 'utf8');
  assert.equal(loadSetupMetadata(dir).kind, 'invalid');

  fs.writeFileSync(metadataPath, '{not-json', 'utf8');
  assert.equal(loadSetupMetadata(dir).kind, 'invalid');
});

test('loadSetupMetadata rejects unsafe file-record paths and ignores claimed ownership', () => {
  const dir = makeTempDir();
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);
  const baseMetadata = createSetupMetadata(
    {
      assistants: ['cursor'],
      playwrightMcp: { cursorFile: false, projectRootFile: false },
      figmaMcp: { cursorFile: false, projectRootFile: false },
      qaAiRulesEnabled: false,
    },
    [{ path: 'AGENTS.md', content: '# Agents\n' }],
  );

  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });

  const claimedManaged = structuredClone(baseMetadata);

  claimedManaged.files['AGENTS.md'].ownership = 'managed';
  fs.writeFileSync(metadataPath, serializeSetupMetadata(claimedManaged), 'utf8');

  const loaded = loadSetupMetadata(dir);

  assert.equal(loaded.kind, 'current');

  if (loaded.kind === 'current') {
    assert.equal(loaded.metadata.files['AGENTS.md'].ownership, 'structured');
  }

  const unsafe = structuredClone(baseMetadata);

  unsafe.files['../outside.md'] = unsafe.files['AGENTS.md'];
  fs.writeFileSync(metadataPath, serializeSetupMetadata(unsafe), 'utf8');

  assert.equal(loadSetupMetadata(dir).kind, 'invalid');
});
