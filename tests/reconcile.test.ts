import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { Assistant } from '../src/constants.js';
import { generateSetup, getGeneratedFiles, type ExistingFileAction } from '../src/generator.js';
import { generatedMcpServerDefinitions } from '../src/generators/mcp.js';
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
  });
}

function options(targetDir: string, overrides: Partial<ReconcileOptions> = {}): ReconcileOptions {
  return {
    targetDir,
    assistants: ['cursor'],
    figmaMcpInclude: false,
    qaAiRulesInclude: false,
    files: getGeneratedFiles(['cursor'], false, false),
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
  const files = getGeneratedFiles(['cursor'], false, false).map((file) =>
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
  const otherPath = path.join(dir, '.cursor/rules/commit-convention.mdc');
  const originalOther = fs.readFileSync(otherPath, 'utf8');

  fs.writeFileSync(conflictingPath, 'Repository-owned edit in a managed file.\n', 'utf8');

  const files = getGeneratedFiles(['cursor'], false, false).map((file) =>
    file.path === '.cursor/rules/commit-convention.mdc'
      ? { ...file, content: `${file.content}\nNew release content.\n` }
      : file,
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
  const figma = { figmaMcpInclude: true };

  generateSetup({ targetDir: dir, assistants: ['cursor'], force: false, dryRun: false, ...figma });

  const files = getGeneratedFiles(['cursor'], true, false).map((file) => {
    if (file.path !== '.cursor/mcp.json') {
      return file;
    }

    const doc = JSON.parse(file.content) as { mcpServers: Record<string, unknown> };

    doc.mcpServers.releaseServer = { command: 'node', args: ['release-server.js'] };

    return { ...file, content: `${JSON.stringify(doc, null, 2)}\n` };
  });
  const result = updateSetup(options(dir, { files, ...figma }));
  const merged = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  assert.ok(merged.mcpServers.figma);
  assert.ok(merged.mcpServers.releaseServer);
  assert.equal(checkSetup(options(dir, { files, ...figma })).plan.hasChanges, false);
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
  const missingPath = '.cursor/rules/commit-convention.mdc';
  const orphanPath = '.cursor/rules/code-style.mdc';

  fs.rmSync(path.join(dir, missingPath));

  const files = getGeneratedFiles(['cursor'], false, false).filter((file) => file.path !== orphanPath);
  const result = updateSetup(options(dir, { files }));

  assert.ok(result.created.includes(missingPath));
  assert.ok(result.removed.includes(orphanPath));
  assert.equal(fs.existsSync(path.join(dir, missingPath)), true);
  assert.equal(fs.existsSync(path.join(dir, orphanPath)), false);
});

test('updateSetup dry-run reports changes without writing files or metadata', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  const missingPath = '.cursor/rules/commit-convention.mdc';
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);
  const metadataBefore = fs.readFileSync(metadataPath, 'utf8');

  fs.rmSync(path.join(dir, missingPath));

  const result = updateSetup(options(dir, { dryRun: true }));

  assert.equal(result.applied, false);
  assert.ok(result.created.includes(missingPath));
  assert.equal(fs.existsSync(path.join(dir, missingPath)), false);
  assert.equal(fs.readFileSync(metadataPath, 'utf8'), metadataBefore);
});

// --- Files a release stops generating (PP-4839) ---------------------------------------------------
//
// A cleanup release drops dozens of generated files at once. Each must either leave the repository
// or be handed over to it in a single reviewed update: an obsolete file that is kept and still
// tracked holds `check` at exit code 2 forever, which the org rollout reads as "always outdated".

function cursorFilesWithout(...removedPaths: string[]): ReturnType<typeof getGeneratedFiles> {
  return getGeneratedFiles(['cursor'], false, false).filter((file) => !removedPaths.includes(file.path));
}

function readJson<T>(dir: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(dir, relativePath), 'utf8')) as T;
}

function trackedPaths(dir: string): string[] {
  return Object.keys(readJson<{ files: Record<string, unknown> }>(dir, SETUP_METADATA_PATH).files);
}

// Stand-ins for files an older release generated. Real template paths would make these tests break
// every time a template is retired, which is exactly the situation they are here to cover.
const RETIRED_RULE = '.cursor/retired/old-rule.mdc';
const RETIRED_PROMPT = '.cursor/retired/old-prompt.md';

/** A Cursor setup as an older release left it: today's files plus the retired ones. */
function createCursorSetupWithRetiredFiles(targetDir: string): void {
  generateSetup({
    targetDir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    files: [
      ...getGeneratedFiles(['cursor'], false, false),
      ...[RETIRED_PROMPT, RETIRED_RULE].map((retiredPath) => ({
        path: retiredPath,
        content: `Generated by an older release: ${retiredPath}\n`,
      })),
    ],
  });
}

test('updateSetup removes untouched obsolete files together with the directory they leave empty', () => {
  const dir = makeTempDir();

  createCursorSetupWithRetiredFiles(dir);

  const result = updateSetup(options(dir));

  assert.equal(result.applied, true);
  assert.deepEqual(result.removed, [RETIRED_PROMPT, RETIRED_RULE]);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/retired')), false);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules')));
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

test('a locally edited obsolete file blocks the update until --force removes it', () => {
  const dir = makeTempDir();

  createCursorSetupWithRetiredFiles(dir);
  fs.writeFileSync(path.join(dir, RETIRED_RULE), 'Repository-owned edit.\n', 'utf8');

  const blocked = updateSetup(options(dir));

  assert.equal(blocked.applied, false);
  assert.deepEqual(blocked.conflicts, [RETIRED_RULE]);
  assert.equal(fs.readFileSync(path.join(dir, RETIRED_RULE), 'utf8'), 'Repository-owned edit.\n');
  // A conflict blocks every write, so the untouched obsolete file is still there as well.
  assert.equal(fs.existsSync(path.join(dir, RETIRED_PROMPT)), true);

  const forced = updateSetup(options(dir, { force: true }));

  assert.equal(forced.applied, true);
  assert.deepEqual(forced.removed, [RETIRED_PROMPT, RETIRED_RULE]);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/retired')), false);
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

test('an obsolete file adopted from the repository is never removed without --force', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.cursor/retired'), { recursive: true });
  fs.writeFileSync(path.join(dir, RETIRED_RULE), 'Written by the team before setup.\n', 'utf8');
  createCursorSetupWithRetiredFiles(dir);

  const result = updateSetup(options(dir));

  assert.equal(result.applied, false);
  assert.deepEqual(result.conflicts, [RETIRED_RULE]);
  assert.equal(fs.readFileSync(path.join(dir, RETIRED_RULE), 'utf8'), 'Written by the team before setup.\n');
});

// --- Protected files (PP-4665) -------------------------------------------------------------------
//
// `CLAUDE.md` and its kind are protected because a team may write its own content into them. Until
// someone does, the file is only a copy of the template and has to follow it — otherwise every
// repository keeps the instructions of the release that set it up. `.cursorignore` stands in for
// them here: it is protected and plain text.

const PROTECTED_PATH = '.cursorignore';

function cursorFilesWithNewTemplate(protectedPath: string): ReturnType<typeof getGeneratedFiles> {
  return getGeneratedFiles(['cursor'], false, false).map((file) =>
    file.path === protectedPath ? { ...file, content: `${file.content}\n# Added by a newer release.\n` } : file,
  );
}

test('an untouched protected file that is no longer generated is removed', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const files = cursorFilesWithout(PROTECTED_PATH);
  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, true);
  assert.deepEqual(result.removed, [PROTECTED_PATH]);
  assert.equal(fs.existsSync(path.join(dir, PROTECTED_PATH)), false);
  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, false);
});

test('an edited protected file that is no longer generated stays and stops being tracked', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  fs.writeFileSync(path.join(dir, PROTECTED_PATH), 'Repository-owned content.\n', 'utf8');

  const files = cursorFilesWithout(PROTECTED_PATH);
  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, true);
  assert.deepEqual(result.orphaned, [PROTECTED_PATH]);
  assert.deepEqual(result.removed, []);
  assert.equal(fs.readFileSync(path.join(dir, PROTECTED_PATH), 'utf8'), 'Repository-owned content.\n');
  assert.equal(trackedPaths(dir).includes(PROTECTED_PATH), false);
  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, false);
});

test('an untouched protected file follows its template', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const files = cursorFilesWithNewTemplate(PROTECTED_PATH);
  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, true);
  assert.ok(result.updated.includes(PROTECTED_PATH));
  assert.deepEqual(result.pendingMerges, []);
  assert.match(fs.readFileSync(path.join(dir, PROTECTED_PATH), 'utf8'), /Added by a newer release/);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/pending-updates')), false);
  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, false);
});

test('an edited protected file is never overwritten; its new template waits to be merged', () => {
  const dir = makeTempDir();
  const pendingPath = path.join(dir, '.assistant-setup/pending-updates', PROTECTED_PATH);

  createCursorSetup(dir);
  fs.writeFileSync(path.join(dir, PROTECTED_PATH), 'Repository-owned content.\n', 'utf8');

  // Same template as before: the edit alone asks for nothing.
  const unchangedTemplate = updateSetup(options(dir));

  assert.deepEqual(unchangedTemplate.pendingMerges, []);
  assert.equal(fs.existsSync(pendingPath), false);

  const files = cursorFilesWithNewTemplate(PROTECTED_PATH);
  const template = files.find((entry) => entry.path === PROTECTED_PATH)!.content;

  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, true);

  const result = updateSetup(options(dir, { files }));

  assert.equal(result.applied, true);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.pendingMerges, [PROTECTED_PATH]);
  assert.ok(result.preserved.includes(PROTECTED_PATH));
  assert.equal(fs.readFileSync(path.join(dir, PROTECTED_PATH), 'utf8'), 'Repository-owned content.\n');
  assert.equal(fs.readFileSync(pendingPath, 'utf8'), template);

  // The template is now on record, so the next run asks for nothing new — and it must not delete
  // a pending template nobody has merged yet.
  const again = updateSetup(options(dir, { files }));

  assert.deepEqual(again.pendingMerges, []);
  assert.equal(fs.existsSync(pendingPath), true);
  assert.equal(checkSetup(options(dir, { files })).plan.hasChanges, false);
});

test('the personal .dev-environment.md never gets a pending template', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);
  fs.writeFileSync(path.join(dir, '.dev-environment.md'), 'My machine.\n', 'utf8');

  const result = updateSetup(options(dir, { files: cursorFilesWithNewTemplate('.dev-environment.md') }));

  assert.equal(result.applied, true);
  assert.deepEqual(result.pendingMerges, []);
  assert.equal(fs.readFileSync(path.join(dir, '.dev-environment.md'), 'utf8'), 'My machine.\n');
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/pending-updates')), false);
});

// --- The Playwright MCP server older releases wrote (PP-4531) ------------------------------------
//
// The generator no longer writes it, so today's code cannot produce the state these tests start
// from. It is put together by hand: the server in the MCP files and in Claude's settings, plus the
// `playwrightMcp` marker the old release recorded in the metadata.

const PLAYWRIGHT_SERVER = generatedMcpServerDefinitions().playwright;
const NO_PLAYWRIGHT_MARKER = { cursorFile: false, projectRootFile: false };

type PlaywrightReleaseSetup = {
  figma?: boolean;
  existingFileActions?: Partial<Record<string, ExistingFileAction>>;
};

function createSetupFromPlaywrightMcpRelease(
  targetDir: string,
  assistants: Assistant[],
  { figma = false, existingFileActions }: PlaywrightReleaseSetup = {},
): void {
  const current = getGeneratedFiles(assistants, figma, false);
  const mcpPaths = [
    ...(assistants.includes('cursor') ? ['.cursor/mcp.json'] : []),
    ...(assistants.includes('claude') ? ['.mcp.json'] : []),
  ];
  const withPlaywright = (content: string | undefined): string => {
    const doc = JSON.parse(content ?? '{"mcpServers":{}}') as { mcpServers: Record<string, unknown> };

    return `${JSON.stringify({ mcpServers: { playwright: PLAYWRIGHT_SERVER, ...doc.mcpServers } }, null, 2)}\n`;
  };
  const files = current
    .filter((file) => !mcpPaths.includes(file.path))
    .map((file) => {
      if (file.path !== '.claude/settings.json') {
        return file;
      }

      const settings = JSON.parse(file.content) as {
        enabledMcpjsonServers?: string[];
        permissions?: { allow?: string[] };
      };

      return {
        ...file,
        content: `${JSON.stringify(
          {
            ...settings,
            enableAllProjectMcpServers: true,
            enabledMcpjsonServers: ['playwright', ...(settings.enabledMcpjsonServers ?? [])],
            permissions: { allow: ['mcp__playwright__*', ...(settings.permissions?.allow ?? [])] },
          },
          null,
          2,
        )}\n`,
      };
    });

  for (const mcpPath of mcpPaths) {
    files.push({ path: mcpPath, content: withPlaywright(current.find((file) => file.path === mcpPath)?.content) });
  }

  generateSetup({
    targetDir,
    assistants,
    force: false,
    dryRun: false,
    figmaMcpInclude: figma,
    files,
    existingFileActions,
  });

  const metadataPath = path.join(targetDir, SETUP_METADATA_PATH);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as Record<string, unknown>;

  metadata.playwrightMcp = {
    cursorFile: assistants.includes('cursor'),
    projectRootFile: assistants.includes('claude'),
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

function playwrightMarker(dir: string): unknown {
  return readJson<{ playwrightMcp: unknown }>(dir, SETUP_METADATA_PATH).playwrightMcp;
}

test('an untouched MCP file from an older release is removed with its Playwright server', () => {
  const dir = makeTempDir();

  createSetupFromPlaywrightMcpRelease(dir, ['cursor']);

  const result = updateSetup(options(dir));

  assert.equal(result.applied, true);
  assert.ok(result.removed.includes('.cursor/mcp.json'));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);
  assert.deepEqual(playwrightMarker(dir), NO_PLAYWRIGHT_MARKER);
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

test('an MCP file with repository servers loses only the Playwright server and becomes repository-owned', () => {
  const dir = makeTempDir();
  const mcpPath = path.join(dir, '.cursor/mcp.json');

  fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
  fs.writeFileSync(mcpPath, '{"mcpServers":{"custom":{"command":"node"}}}\n', 'utf8');
  createSetupFromPlaywrightMcpRelease(dir, ['cursor'], { existingFileActions: { '.cursor/mcp.json': 'merge' } });

  assert.deepEqual(Object.keys(readJson<{ mcpServers: object }>(dir, '.cursor/mcp.json').mcpServers), [
    'custom',
    'playwright',
  ]);

  const result = updateSetup(options(dir));

  assert.equal(result.applied, true);
  assert.equal(result.conflicts.length, 0);
  assert.ok(result.updated.includes('.cursor/mcp.json'));
  assert.deepEqual(readJson<{ mcpServers: object }>(dir, '.cursor/mcp.json').mcpServers, {
    custom: { command: 'node' },
  });
  assert.equal(trackedPaths(dir).includes('.cursor/mcp.json'), false);
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

test('a locally edited obsolete MCP file is a conflict; --force keeps what the repository owns', () => {
  const dir = makeTempDir();

  createSetupFromPlaywrightMcpRelease(dir, ['cursor']);

  const mcpPath = path.join(dir, '.cursor/mcp.json');
  const edited = {
    mcpServers: {
      // Same name as the generated server, but the repository changed it — so it is theirs.
      playwright: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp', '--headless'] },
      custom: { command: 'node' },
    },
  };

  fs.writeFileSync(mcpPath, `${JSON.stringify(edited, null, 2)}\n`, 'utf8');

  const blocked = updateSetup(options(dir));

  assert.equal(blocked.applied, false);
  assert.deepEqual(blocked.conflicts, ['.cursor/mcp.json']);

  const forced = updateSetup(options(dir, { force: true }));

  assert.equal(forced.applied, true);
  assert.deepEqual(forced.orphaned, ['.cursor/mcp.json']);
  assert.deepEqual(readJson(dir, '.cursor/mcp.json'), edited);
  assert.equal(trackedPaths(dir).includes('.cursor/mcp.json'), false);
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

test('the Playwright server leaves .mcp.json and .claude/settings.json; the Figma server stays', () => {
  const dir = makeTempDir();
  const claude = (figma: boolean): Partial<ReconcileOptions> => ({
    assistants: ['claude'],
    figmaMcpInclude: figma,
    files: getGeneratedFiles(['claude'], figma, false),
  });

  createSetupFromPlaywrightMcpRelease(dir, ['claude'], { figma: true });

  assert.deepEqual(readJson<{ enabledMcpjsonServers: string[] }>(dir, '.claude/settings.json').enabledMcpjsonServers, [
    'playwright',
    'figma',
  ]);

  const figmaOnly = updateSetup(options(dir, claude(true)));

  assert.equal(figmaOnly.applied, true);
  assert.equal(figmaOnly.conflicts.length, 0);
  assert.deepEqual(Object.keys(readJson<{ mcpServers: object }>(dir, '.mcp.json').mcpServers), ['figma']);

  const settings = readJson<Record<string, unknown>>(dir, '.claude/settings.json');

  assert.deepEqual(settings.enabledMcpjsonServers, ['figma']);
  assert.deepEqual(settings.permissions, { allow: ['mcp__figma__*'] });
  assert.equal(settings.enableAllProjectMcpServers, true);
  assert.deepEqual(playwrightMarker(dir), NO_PLAYWRIGHT_MARKER);
  assert.equal(checkSetup(options(dir, claude(true))).plan.hasChanges, false);

  // Turning Figma off afterwards takes the same path: the last generated server goes, and with it
  // the file and every MCP key the generator put into the settings.
  const none = updateSetup(options(dir, claude(false)));

  assert.equal(none.applied, true);
  assert.ok(none.removed.includes('.mcp.json'));
  assert.equal(fs.existsSync(path.join(dir, '.mcp.json')), false);

  const cleared = readJson<Record<string, unknown>>(dir, '.claude/settings.json');

  assert.equal('enabledMcpjsonServers' in cleared, false);
  assert.equal('enableAllProjectMcpServers' in cleared, false);
  assert.equal('permissions' in cleared, false);
  assert.ok(cleared.enabledPlugins);
  assert.equal(checkSetup(options(dir, claude(false))).plan.hasChanges, false);
});

test('a Playwright server the generator never wrote is left alone', () => {
  const dir = makeTempDir();
  const mcpPath = path.join(dir, '.cursor/mcp.json');
  const figma = { figmaMcpInclude: true };

  // The repository added the very same server itself; this release only merged Figma into the file.
  fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
  fs.writeFileSync(mcpPath, `${JSON.stringify({ mcpServers: { playwright: PLAYWRIGHT_SERVER } })}\n`, 'utf8');
  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    ...figma,
    existingFileActions: { '.cursor/mcp.json': 'merge' },
  });

  assert.deepEqual(playwrightMarker(dir), NO_PLAYWRIGHT_MARKER);

  const result = updateSetup(options(dir));

  assert.equal(result.applied, true);
  assert.deepEqual(readJson<{ mcpServers: object }>(dir, '.cursor/mcp.json').mcpServers, {
    playwright: PLAYWRIGHT_SERVER,
  });
  assert.equal(checkSetup(options(dir)).plan.hasChanges, false);
});

// The shape of the cleanup release: many files gone at once, from several directories, in a
// repository nobody edited. One update must leave nothing behind and nothing pending.
test('upgrade from a release with more files: one update removes them all and a second changes nothing', () => {
  const dir = makeTempDir();
  const current = getGeneratedFiles(['cursor', 'claude'], false, false);
  const retired = [
    'LINEAR_CLI.md',
    '.cursor/rules/linear-cli.mdc',
    '.cursor/skills/retired-skill/SKILL.md',
    '.cursor/skills/retired-skill/references/details.md',
    '.claude/legacy-workflows/retired-flow.md',
    '.claude/legacy-commands/retired-command.md',
  ];
  const previousRelease = [
    ...current,
    ...retired.map((retiredPath) => ({
      path: retiredPath,
      content: `Generated by an older release: ${retiredPath}\n`,
    })),
  ];
  const upgrade = (overrides: Partial<ReconcileOptions> = {}): ReconcileOptions =>
    options(dir, {
      assistants: ['cursor', 'claude'],
      files: current,
      ...overrides,
    });

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    files: previousRelease,
  });

  for (const retiredPath of retired) {
    assert.equal(fs.existsSync(path.join(dir, retiredPath)), true);
  }

  assert.equal(checkSetup(upgrade()).plan.hasChanges, true);

  const first = updateSetup(upgrade());

  assert.equal(first.applied, true);
  assert.equal(first.conflicts.length, 0);
  assert.deepEqual([...first.removed].sort(), [...retired].sort());

  for (const retiredPath of retired) {
    assert.equal(fs.existsSync(path.join(dir, retiredPath)), false, `${retiredPath} should be gone`);
  }

  for (const emptiedDir of ['.cursor/skills/retired-skill', '.claude/legacy-workflows', '.claude/legacy-commands']) {
    assert.equal(fs.existsSync(path.join(dir, emptiedDir)), false, `${emptiedDir} should be gone`);
  }

  assert.equal(
    trackedPaths(dir).some((tracked) => retired.includes(tracked)),
    false,
  );
  assert.equal(checkSetup(upgrade()).plan.hasChanges, false);

  const second = updateSetup(upgrade());

  assert.equal(second.metadataUpdated, false);
  assert.deepEqual(
    [second.created, second.updated, second.merged, second.removed, second.orphaned, second.conflicts].flat(),
    [],
  );
});

test('checkSetup rejects malformed metadata', () => {
  const dir = makeTempDir();
  const metadataPath = path.join(dir, SETUP_METADATA_PATH);

  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, '{"version":6}\n', 'utf8');

  assert.throws(() => checkSetup(options(dir)), /Invalid setup metadata/);
});

// Under --force a modified managed file is planned as state 'modified' + action 'overwrite'.
// Filtering the preserved bucket on state alone reported such a file as preserved in the very run
// that replaced it — which an automated update PR would repeat to a reviewer as "your changes were
// kept". The bucket means "repository-owned content survived", so a write disqualifies it.
test('updateSetup --force does not report an overwritten managed file as preserved', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const managedPath = path.join(dir, '.cursor/rules/code-style.mdc');

  fs.writeFileSync(managedPath, 'Local edit.\n', 'utf8');

  const result = updateSetup({ ...options(dir), force: true });

  assert.ok(result.updated.includes('.cursor/rules/code-style.mdc'));
  assert.equal(result.preserved.includes('.cursor/rules/code-style.mdc'), false);
  assert.notEqual(fs.readFileSync(managedPath, 'utf8'), 'Local edit.\n');
});

test('updateSetup --force still reports a protected file as preserved', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const protectedPath = path.join(dir, '.cursorrules');

  fs.writeFileSync(protectedPath, 'Custom repository rules.\n', 'utf8');

  const result = updateSetup({ ...options(dir), force: true });

  assert.ok(result.preserved.includes('.cursorrules'));
  assert.equal(fs.readFileSync(protectedPath, 'utf8'), 'Custom repository rules.\n');
});

// createSetupMetadata() recomputes every baseline from content hashes alone, and merged content
// never equals the generated source — so a clean, already-merged AGENTS.md was being downgraded to
// 'adopted', which collisionPlan() then re-planned as a merge. The result was an oscillation:
// update, check clean, update, check dirty, with the file's bytes never changing. It failed the
// org rollout's post-update validation on mi-pp/report-cleanup.
test('updateSetup keeps a merged AGENTS.md baseline across a no-op run', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const agentsPath = path.join(dir, 'AGENTS.md');

  fs.writeFileSync(agentsPath, '# Repository agents\n\nHand-written rows.\n', 'utf8');

  // First update merges the generated rows in and records baseline: 'merged'.
  const merged = updateSetup(options(dir));

  assert.ok(merged.merged.includes('AGENTS.md'));

  const afterMerge = loadSetupMetadata(dir);

  assert.equal(afterMerge.kind, 'current');

  if (afterMerge.kind === 'current') {
    assert.equal(afterMerge.metadata.files['AGENTS.md'].baseline, 'merged');
  }

  const contentAfterMerge = fs.readFileSync(agentsPath, 'utf8');

  // A second update changes nothing, so the baseline must survive it untouched.
  updateSetup(options(dir));

  const afterNoOp = loadSetupMetadata(dir);

  assert.equal(fs.readFileSync(agentsPath, 'utf8'), contentAfterMerge);
  assert.equal(afterNoOp.kind, 'current');

  if (afterNoOp.kind === 'current') {
    assert.equal(afterNoOp.metadata.files['AGENTS.md'].baseline, 'merged');
  }

  // And the repository must read as synchronized rather than needing another merge.
  const checked = checkSetup(options(dir));

  assert.equal(checked.plan.hasChanges, false);
  assert.deepEqual(checked.merged, []);
});

// PP-4659: LINEAR_CLI.md is gone and so is the metadata key that pointed at it. Repositories set up
// by an older release still carry the key; their metadata has to keep loading, and the leftover key
// alone must not make the setup look outdated.
test('metadata that still has linearCliReference loads and is not reported as outdated', () => {
  const dir = makeTempDir();

  createCursorSetup(dir);

  const metadataPath = path.join(dir, SETUP_METADATA_PATH);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as Record<string, unknown>;

  metadata.linearCliReference = { file: 'LINEAR_CLI.md', generated: true };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  assert.equal(loadSetupMetadata(dir).kind, 'current');

  const result = checkSetup(options(dir));

  assert.equal(result.conflicts.length, 0);
  assert.equal(result.plan.hasChanges, false);
});
