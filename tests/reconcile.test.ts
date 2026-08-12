import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateSetup, getGeneratedFiles } from '../src/generator.js';
import { checkSetup, updateSetup, type ReconcileOptions } from '../src/reconcile.js';
import { loadSetupMetadata, SETUP_METADATA_PATH } from '../src/setup-metadata.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ca-ai-tools-reconcile-'));
}

function createCursorSetup(targetDir: string): void {
  generateSetup({
    targetDir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
}

function options(targetDir: string, overrides: Partial<ReconcileOptions> = {}): ReconcileOptions {
  return {
    targetDir,
    assistants: ['cursor'],
    playwrightMcpInclude: true,
    figmaMcpInclude: false,
    qaAiRulesInclude: false,
    files: getGeneratedFiles(['cursor'], true, false, false),
    metadata: loadSetupMetadata(targetDir),
    force: false,
    dryRun: false,
    ...overrides,
  };
}

test('checkSetup reports a clean generated setup', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const result = checkSetup(options(dir));

  assert.equal(result.plan.hasChanges, false);
  assert.equal(result.conflicts.length, 0);
  assert.ok(result.unchanged.includes('.cursor/rules/code-style.mdc'));
});

test('updateSetup replaces an unchanged managed file when its source changes', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const files = getGeneratedFiles(['cursor'], true, false, false).map((file) =>
    file.path === '.cursor/rules/code-style.mdc'
      ? { ...file, content: `${file.content}\nUpdated managed rule.\n` }
      : file,
  );
  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, true);
  assert.ok(result.updated.includes('.cursor/rules/code-style.mdc'));
  assert.match(fs.readFileSync(path.join(dir, '.cursor/rules/code-style.mdc'), 'utf8'), /Updated managed rule\./);
});

test('updateSetup blocks every write when a managed file has local changes', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const conflictingPath = path.join(dir, '.cursor/rules/code-style.mdc');
  const otherPath = path.join(dir, 'LINEAR_CLI.md');
  const originalOther = fs.readFileSync(otherPath, 'utf8');

  fs.writeFileSync(conflictingPath, 'Repository-owned edit in a managed file.\n', 'utf8');

  const files = getGeneratedFiles(['cursor'], true, false, false).map((file) =>
    file.path === 'LINEAR_CLI.md' ? { ...file, content: `${file.content}\nNew release content.\n` } : file,
  );
  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, false);
  assert.ok(result.conflicts.includes('.cursor/rules/code-style.mdc'));
  assert.equal(fs.readFileSync(otherPath, 'utf8'), originalOther);
});

test('updateSetup requires force for managed content adopted during initial setup', () => {
  const dir = makeTempDir();
  const managedPath = path.join(dir, '.cursor/rules/code-style.mdc');

  fs.mkdirSync(path.dirname(managedPath), { recursive: true });
  fs.writeFileSync(managedPath, 'Pre-existing managed content.\n', 'utf8');
  createCursorSetup(dir);

  const metadata = loadSetupMetadata(dir);
  const result = updateSetup(options(dir));

  assert.equal(metadata.kind, 'current');

  if (metadata.kind === 'current') {
    assert.equal(metadata.metadata.files['.cursor/rules/code-style.mdc'].baseline, 'adopted');
  }

  assert.ok(result.conflicts.includes('.cursor/rules/code-style.mdc'));
  assert.equal(fs.readFileSync(managedPath, 'utf8'), 'Pre-existing managed content.\n');
});

test('updateSetup force replaces a modified managed baseline', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const managedPath = path.join(dir, '.cursor/rules/code-style.mdc');

  fs.writeFileSync(managedPath, 'Local edit.\n', 'utf8');

  const result = updateSetup(options(dir, { force: true }));

  assert.equal(result.applied, true);
  assert.ok(result.updated.includes('.cursor/rules/code-style.mdc'));
  assert.notEqual(fs.readFileSync(managedPath, 'utf8'), 'Local edit.\n');
});

test('updateSetup preserves and adopts repository-owned protected files', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const protectedPath = path.join(dir, '.cursorrules');

  fs.writeFileSync(protectedPath, 'Custom repository rules.\n', 'utf8');

  const result = updateSetup(options(dir));
  const metadata = loadSetupMetadata(dir);

  assert.equal(result.conflicts.length, 0);
  assert.ok(result.preserved.includes('.cursorrules'));
  assert.equal(fs.readFileSync(protectedPath, 'utf8'), 'Custom repository rules.\n');
  assert.equal(metadata.kind, 'current');

  if (metadata.kind === 'current') {
    assert.equal(metadata.metadata.files['.cursorrules'].baseline, 'adopted');
  }
});

test('updateSetup semantically merges an unchanged structured file', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const files = getGeneratedFiles(['cursor'], true, false, false).map((file) => {
    if (file.path !== '.cursor/mcp.json') {
      return file;
    }

    const doc = JSON.parse(file.content) as { mcpServers: Record<string, unknown> };

    doc.mcpServers.releaseServer = { command: 'node', args: ['release-server.js'] };

    return { ...file, content: `${JSON.stringify(doc, null, 2)}\n` };
  });
  const result = updateSetup(options(dir, { files }));
  const merged = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  assert.ok(merged.mcpServers.playwright);
  assert.ok(merged.mcpServers.releaseServer);
  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, false);
});

test('updateSetup safely merges modified AGENTS.md even with force', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const agentsPath = path.join(dir, 'AGENTS.md');

  fs.writeFileSync(agentsPath, '# Repository AGENTS\n\nKeep custom instructions.\n', 'utf8');

  const checked = checkSetup(options(dir, { force: true }));
  const updated = updateSetup(options(dir, { force: true }));
  const merged = fs.readFileSync(agentsPath, 'utf8');
  const metadata = loadSetupMetadata(dir);

  assert.equal(checked.conflicts.length, 0);
  assert.ok(checked.merged.includes('AGENTS.md'));
  assert.ok(updated.merged.includes('AGENTS.md'));
  assert.match(merged, /Keep custom instructions\./);
  assert.match(merged, /Registered agents added by ca-ai-tools-setup/);
  assert.match(merged, /`code-style\.md`/);

  assert.equal(metadata.kind, 'current');

  if (metadata.kind === 'current') {
    assert.equal(metadata.metadata.files['AGENTS.md'].baseline, 'merged');
  }
});

test('updateSetup migrates matching schema 5 metadata without rewriting tracked files', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);

  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify({
      version: 5,
      assistants: ['cursor'],
      playwrightMcp: { cursorFile: true, projectRootFile: false },
      figmaMcp: { cursorFile: false, projectRootFile: false },
      qaAiRules: { enabled: false },
    })}\n`,
    'utf8',
  );

  const before = fs.readFileSync(path.join(dir, '.cursor/rules/code-style.mdc'), 'utf8');
  const check = checkSetup(options(dir));
  const updated = updateSetup(options(dir));
  const metadata = loadSetupMetadata(dir);

  assert.equal(check.metadataMigrationRequired, true);
  assert.equal(check.plan.hasChanges, true);
  assert.equal(updated.conflicts.length, 0);
  assert.equal(fs.readFileSync(path.join(dir, '.cursor/rules/code-style.mdc'), 'utf8'), before);
  assert.equal(metadata.kind, 'current');
});

test('schema 5 migration preserves unhashed legacy files unless force explicitly removes them', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const metadataPath = path.join(dir, SETUP_METADATA_PATH);
  const legacyPath = path.join(dir, '.cursor/skills/ui-check/SKILL.md');

  fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
  fs.writeFileSync(legacyPath, 'Legacy generated content.\n', 'utf8');
  fs.writeFileSync(
    metadataPath,
    '{"version":5,"assistants":["cursor"],"playwrightMcp":{"cursorFile":true,"projectRootFile":false}}\n',
    'utf8',
  );

  const blocked = updateSetup(options(dir));

  assert.ok(blocked.conflicts.includes('.cursor/skills/ui-check/SKILL.md'));
  assert.equal(fs.existsSync(legacyPath), true);

  const forced = updateSetup(options(dir, { force: true }));

  assert.ok(forced.removed.includes('.cursor/skills/ui-check/SKILL.md'));
  assert.equal(fs.existsSync(legacyPath), false);
});

test('updateSetup recreates missing files and removes unchanged managed orphans', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const missingPath = '.cursor/rules/linear-cli.mdc';
  const orphanPath = '.cursor/rules/code-style.mdc';

  fs.rmSync(path.join(dir, missingPath));

  const files = getGeneratedFiles(['cursor'], true, false, false).filter((file) => file.path !== orphanPath);
  const result = updateSetup(options(dir, { files }));

  assert.ok(result.created.includes(missingPath));
  assert.ok(result.removed.includes(orphanPath));
  assert.equal(fs.existsSync(path.join(dir, missingPath)), true);
  assert.equal(fs.existsSync(path.join(dir, orphanPath)), false);
});

test('updateSetup dry-run reports changes without writing files or metadata', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const missingPath = '.cursor/rules/linear-cli.mdc';
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);
  const metadataBefore = fs.readFileSync(metadataPath, 'utf8');

  fs.rmSync(path.join(dir, missingPath));

  const result = updateSetup(options(dir, { dryRun: true }));

  assert.equal(result.applied, false);
  assert.ok(result.created.includes(missingPath));
  assert.equal(fs.existsSync(path.join(dir, missingPath)), false);
  assert.equal(fs.readFileSync(metadataPath, 'utf8'), metadataBefore);
});

test('updateSetup force preserves protected or modified orphans while applying safe changes', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const structuredPath = path.join(dir, '.cursor/mcp.json');
  const missingPath = path.join(dir, '.cursor/rules/linear-cli.mdc');

  fs.writeFileSync(structuredPath, '{"mcpServers":{"custom":{"command":"node"}}}\n', 'utf8');
  fs.rmSync(missingPath);

  const filesWithoutMcp = getGeneratedFiles(['cursor'], false, false, false);
  const result = updateSetup(
    options(dir, {
      files: filesWithoutMcp,
      playwrightMcpInclude: false,
      force: true,
    }),
  );

  assert.equal(result.applied, true);
  assert.ok(result.orphaned.includes('.cursor/mcp.json'));
  assert.equal(fs.existsSync(structuredPath), true);
  assert.equal(fs.existsSync(missingPath), true);
});

test('checkSetup rejects malformed metadata', () => {
  const dir = makeTempDir();
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);

  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, '{"version":6}\n', 'utf8');

  assert.throws(() => checkSetup(options(dir)), /Invalid setup metadata/);
});
