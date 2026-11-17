import fs from 'node:fs';
import path from 'node:path';
import { SETUP_ASSISTANT_FILES, type Assistant } from './constants.js';
import { generateCursorFiles } from './generators/cursor.js';
import { generateClaudeFiles } from './generators/claude.js';
import { buildRuleFiles } from './generators/rules.js';
import { buildSkillFiles } from './generators/skills.js';
import { isMergeablePath, mergeFile } from './mcp-json-merge.js';
import type { GeneratedFile } from './generators/types.js';
import { readTemplate, renderAssistantBlocks } from './templates.js';
import {
  createSetupMetadata,
  createSetupStatusContent,
  hashContent,
  loadSetupMetadata,
  normalizeSetupPath,
  serializeSetupMetadata,
  SETUP_METADATA_PATH,
  SETUP_STATUS_PATH,
  type SetupFileRecord,
} from './setup-metadata.js';

export type ExistingFileAction = 'skip' | 'merge' | 'overwrite';

/**
 * Files the repository owns outright, so an existing copy is always merged into — never skipped,
 * and never replaced, not even by --force. AGENTS.md carries repository-authored rows; .gitignore
 * carries whatever the team decided to ignore, and losing either to a setup run would be a real
 * regression rather than a refreshed template.
 */
const ALWAYS_MERGED_PATHS = new Set(['AGENTS.md', '.gitignore']);

export type GenerateOptions = {
  targetDir: string;
  assistants: Assistant[];
  force: boolean;
  dryRun: boolean;
  /**
   * When true, writes Figma MCP config for each selected assistant:
   * Cursor → `.cursor/mcp.json`, Claude → `.mcp.json` at repo root.
   */
  figmaMcpInclude?: boolean;
  /**
   * When true, metadata records QA AI rules; the CLI also runs `qa-ai-rules init` after writes unless dry-run.
   */
  qaAiRulesInclude?: boolean;
  /**
   * When a file already exists and `force` is false, per-path action.
   * Only `.cursor/mcp.json` and `.mcp.json` support `merge` (JSON `mcpServers` union).
   */
  existingFileActions?: Partial<Record<string, ExistingFileAction>>;
  /** Pre-computed file list from `getGeneratedFiles`; skips a second call inside `generateSetup`. */
  files?: GeneratedFile[];
};

export type GenerateResult = {
  created: string[];
  skipped: string[];
  overwritten: string[];
  merged: string[];
  migratedLegacy: string[];
  removedLegacy: string[];
};

export type FigmaMcpTargets = {
  cursorFile: boolean;
  projectRootFile: boolean;
};

const LEGACY_FILE_MAPPINGS = [
  {
    legacyPath: '.assistant-setup/linear-cli-setup.json',
    currentPath: '.assistant-setup/ca-ai-tools-setup.json',
  },
] as const;

/**
 * Paths older releases generated and this one does not. A tracked repository does not need this
 * list — its metadata already names every file it was given, and `update` / a re-run remove the
 * ones that are gone. The list is for repositories with schema 5 metadata or none at all, where
 * nothing else says the file was ever ours. Add a path here whenever a release stops generating it.
 */
export const REMOVABLE_LEGACY_SETUP_PATHS = [
  // PP-3640: legacy AI QA flow.
  '.cursor/skills/ai-testing/SKILL.md',
  '.cursor/skills/ui-check/SKILL.md',
  '.claude/skills/ai-testing/SKILL.md',
  '.claude/skills/ui-check/SKILL.md',
  '.claude/workflows/ui-check.md',
  '.cursor/skills/README.md',
  // PP-4664: templates that never applied to Portal Page projects, and files nothing reads.
  '.cursor/skills/form-builder/SKILL.md',
  '.cursor/prompts/form-prompt.md',
  '.cursor/prompts/react-component-unit.md',
  '.cursor/rules/test-case-rules.mdc',
  '.cursor/rules/test-suite-template.mdc',
  '.cursor/ca-ai-tools-setup.json',
  '.cursor/linear-cli-setup.json',
  '.claude/skills/README.md',
  // PP-4531: Playwright MCP is gone; browser automation runs through the Playwright CLI.
  '.cursor/skills/playwright-mcp/SKILL.md',
  '.claude/workflows/playwright-mcp.md',
  // PP-4659: Linear is reached through the Linear MCP; linear-cli can no longer be authorized.
  'LINEAR_CLI.md',
  '.cursor/rules/linear-cli.mdc',
  // PP-4665: one source per rule and skill. The Claude workflows and commands duplicated the
  // skills, three "agents" were rules, and the on-demand rules became skills.
  '.claude/workflows/linear-workflow.md',
  '.claude/workflows/testing-with-linear.md',
  '.claude/workflows/testing-flow.md',
  '.claude/workflows/ui-check-simple.md',
  '.claude/workflows/linear-qa-report.md',
  '.claude/workflows/playwright-cli.md',
  '.claude/workflows/test-documentation.md',
  '.claude/commands/testing-with-linear.md',
  '.claude/commands/testing-flow.md',
  '.claude/commands/linear-report.md',
  '.claude/commands/start-working-with-task.md',
  '.claude/commands/test-documentation.md',
  '.claude/agents/code-style.md',
  '.claude/agents/frontend-architecture.md',
  '.claude/agents/commit-convention.md',
  '.claude/agents/figma-mcp.md',
  '.cursor/rules/commit-convention.mdc',
  '.cursor/rules/figma-mcp.mdc',
  '.cursor/rules/linear-merge-notification.mdc',
  '.cursor/rules/portal-env-credentials.mdc',
  '.cursor/rules/README.md',
  // PP-4661: this skill needs tools only the official Figma MCP has; the setup registers Framelink.
  '.cursor/skills/figma-code-connect/SKILL.md',
  '.cursor/skills/figma-code-connect/references/api.md',
  '.cursor/skills/figma-code-connect/references/advanced-patterns.md',
  '.claude/skills/figma-code-connect/SKILL.md',
  '.claude/skills/figma-code-connect/references/api.md',
  '.claude/skills/figma-code-connect/references/advanced-patterns.md',
] as const;

/**
 * Everything older releases generated that this selection no longer gets. On top of the fixed list
 * there are paths that are retired only for some selections:
 *
 * - skills moved to `.claude/skills/` wherever Claude Code is selected, so the copies under
 *   `.cursor/skills/` would show every skill to Cursor twice, the old text next to the new;
 * - a Claude-only setup used to get the Cursor rules as well.
 *
 * A tracked repository finds these through its metadata. This list is for schema 5 and untracked
 * repositories, which have no other record of what the setup once wrote.
 */
export function retiredSetupPaths(assistants: readonly Assistant[]): string[] {
  const paths: string[] = [...REMOVABLE_LEGACY_SETUP_PATHS];

  if (assistants.includes('claude')) {
    paths.push(...buildSkillFiles(['cursor'], true).map((file) => file.path));
  }

  if (!assistants.includes('cursor')) {
    paths.push(...buildRuleFiles(['cursor']).map((file) => file.path));
  }

  return paths;
}

function shouldAlwaysOverwrite(filePath: string): boolean {
  return SETUP_ASSISTANT_FILES.has(filePath);
}

export function resolveFigmaMcpTargets(assistants: Assistant[], include: boolean): FigmaMcpTargets {
  if (!include) {
    return { cursorFile: false, projectRootFile: false };
  }

  return {
    cursorFile: assistants.includes('cursor'),
    projectRootFile: assistants.includes('claude'),
  };
}

export function getGeneratedFiles(
  assistants: Assistant[],
  figmaMcpInclude = false,
  qaAiRulesInclude = false,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const figmaTargets = resolveFigmaMcpTargets(assistants, figmaMcpInclude);

  if (assistants.includes('cursor')) {
    files.push(...generateCursorFiles({ includeFigmaMcp: figmaTargets.cursorFile }));
  }

  if (assistants.includes('claude')) {
    files.push(...generateClaudeFiles({ includeFigmaMcp: figmaTargets.projectRootFile }));
  }

  // Shared content, one source each: rules are rendered per assistant, skills go to one folder.
  files.push(...buildRuleFiles(assistants));
  files.push(...buildSkillFiles(assistants, figmaMcpInclude));

  files.push({
    path: '.assistant-setup/page-workflow-context.md',
    content: readTemplate('assistant-setup/page-workflow-context.md'),
  });

  files.push({
    path: '.dev-environment.md',
    content: readTemplate('assistant-setup/dev-environment.md'),
  });

  // .dev-environment.md is regenerated per developer machine — it records the local instance URL,
  // shell profile and paths — so it must never be committed. Merged into whatever .gitignore the
  // repository already has rather than written over it.
  files.push({
    path: '.gitignore',
    content: readTemplate('gitignore'),
  });

  files.push({
    path: 'AGENTS.md',
    content: renderAssistantBlocks(readTemplate('AGENTS.md'), assistants),
  });

  const metadataConfiguration = {
    assistants,
    figmaMcp: figmaTargets,
    qaAiRulesEnabled: qaAiRulesInclude,
  };

  files.push({
    path: SETUP_STATUS_PATH,
    content: createSetupStatusContent(metadataConfiguration),
  });

  const metadata = createSetupMetadata(metadataConfiguration, files);

  files.push({
    path: SETUP_METADATA_PATH,
    content: serializeSetupMetadata(metadata),
  });

  return files;
}

/**
 * Remove the directories a deleted file leaves empty, walking up and stopping at the target root.
 * Returns the removed directories as repository-relative paths, deepest first.
 */
export function removeEmptyParentDirs(targetDir: string, filePath: string): string[] {
  const targetRoot = path.resolve(targetDir);
  const removed: string[] = [];
  let dir = path.dirname(path.resolve(filePath));

  while (true) {
    const rel = path.relative(targetRoot, dir);

    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      break;
    }

    let entries: string[];

    try {
      entries = fs.readdirSync(dir);
    } catch {
      break;
    }

    if (entries.length > 0) {
      break;
    }

    fs.rmdirSync(dir);
    removed.push(rel.split(path.sep).join('/'));
    dir = path.dirname(dir);
  }

  return removed;
}

function removeSetupFile(
  targetDir: string,
  relativePath: string,
  options: Pick<GenerateOptions, 'dryRun'>,
  result: GenerateResult,
): void {
  const destination = path.join(targetDir, relativePath);

  result.removedLegacy.push(relativePath);

  if (!options.dryRun) {
    fs.rmSync(destination);
    result.removedLegacy.push(...removeEmptyParentDirs(targetDir, destination));
  }
}

/** True when a tracked file still holds exactly what the generator wrote, with no repository content in it. */
function isUntouchedGeneratedFile(content: string, record: SetupFileRecord): boolean {
  return record.baseline === 'generated' && hashContent(content) === record.contentHash;
}

function removeObsoleteSetupFiles(
  targetDir: string,
  assistants: readonly Assistant[],
  previousRecords: Readonly<Record<string, SetupFileRecord>>,
  options: Pick<GenerateOptions, 'force' | 'dryRun'>,
  result: GenerateResult,
): void {
  for (const relativePath of retiredSetupPaths(assistants)) {
    const destination = path.join(targetDir, relativePath);

    if (!fs.existsSync(destination)) {
      continue;
    }

    const record = previousRecords[relativePath];

    // A tracked file with repository edits is not ours to delete in passing; removeTrackedOrphans()
    // keeps its record so `check` reports it. A file with no record predates tracking, so there is
    // nothing to compare it with and it goes as before — listed under "Removed legacy files".
    if (record && !options.force && !isUntouchedGeneratedFile(fs.readFileSync(destination, 'utf8'), record)) {
      continue;
    }

    removeSetupFile(targetDir, relativePath, options, result);
  }
}

/**
 * A plain re-run has to clean up after a release that stopped generating a file, or the obsolete
 * file outlives its metadata record and nothing ever reports it again. Only files that are still
 * exactly what the generator wrote are removed here. Anything with repository content stays, and
 * its record is returned so the new metadata keeps it and `check` / `update` raise the conflict.
 */
function removeTrackedOrphans(
  targetDir: string,
  previousRecords: Readonly<Record<string, SetupFileRecord>>,
  desiredPaths: ReadonlySet<string>,
  options: Pick<GenerateOptions, 'force' | 'dryRun'>,
  result: GenerateResult,
): Record<string, SetupFileRecord> {
  const kept: Record<string, SetupFileRecord> = {};

  for (const [relativePath, record] of Object.entries(previousRecords)) {
    const destination = path.join(targetDir, relativePath);

    if (desiredPaths.has(relativePath) || result.removedLegacy.includes(relativePath) || !fs.existsSync(destination)) {
      continue;
    }

    if (
      isUntouchedGeneratedFile(fs.readFileSync(destination, 'utf8'), record) ||
      (options.force && record.ownership === 'managed')
    ) {
      removeSetupFile(targetDir, relativePath, options, result);
      continue;
    }

    // A protected file the repository edited is its own from here on: it simply stops being tracked.
    if (record.ownership === 'protected') {
      continue;
    }

    kept[relativePath] = record;
  }

  return kept;
}

function migrateLegacyFiles(
  targetDir: string,
  options: Pick<GenerateOptions, 'force' | 'dryRun'>,
  result: GenerateResult,
): void {
  for (const mapping of LEGACY_FILE_MAPPINGS) {
    const legacyDestination = path.join(targetDir, mapping.legacyPath);
    const currentDestination = path.join(targetDir, mapping.currentPath);
    const legacyExists = fs.existsSync(legacyDestination);

    if (!legacyExists) {
      continue;
    }

    if (options.force) {
      if (!options.dryRun) {
        fs.rmSync(legacyDestination);
      }

      result.removedLegacy.push(mapping.legacyPath);
      continue;
    }

    const currentExists = fs.existsSync(currentDestination);

    if (currentExists) {
      continue;
    }

    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(currentDestination), { recursive: true });
      fs.renameSync(legacyDestination, currentDestination);
    }

    result.migratedLegacy.push(`${mapping.legacyPath} -> ${mapping.currentPath}`);
  }
}

function writeOneFile(
  targetDir: string,
  file: GeneratedFile,
  options: {
    force: boolean;
    dryRun: boolean;
    existingFileActions?: Partial<Record<string, ExistingFileAction>>;
  },
  result: GenerateResult,
): void {
  const destination = path.join(targetDir, file.path);
  const exists = fs.existsSync(destination);
  const actions = options.existingFileActions;

  if (exists && ALWAYS_MERGED_PATHS.has(normalizeSetupPath(file.path))) {
    if (!options.dryRun) {
      const existingContent = fs.readFileSync(destination, 'utf8');
      const merged = mergeFile(file.path, existingContent, file.content);

      fs.writeFileSync(destination, merged, 'utf8');
    }

    result.merged.push(file.path);

    return;
  }

  if (options.force) {
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.content, 'utf8');
    }

    if (exists) {
      result.overwritten.push(file.path);
    } else {
      result.created.push(file.path);
    }

    return;
  }

  if (exists) {
    if (shouldAlwaysOverwrite(file.path)) {
      if (!options.dryRun) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, file.content, 'utf8');
      }

      result.overwritten.push(file.path);

      return;
    }

    const action = actions?.[file.path] ?? 'skip';

    if (action === 'skip') {
      result.skipped.push(file.path);

      return;
    }

    if (action === 'merge') {
      if (!isMergeablePath(file.path)) {
        throw new Error(
          `Merge is not supported for "${file.path}". ` +
            'Supported paths: .cursor/mcp.json, .mcp.json, .claude/settings.json, AGENTS.md, .gitignore.',
        );
      }

      if (!options.dryRun) {
        const existingContent = fs.readFileSync(destination, 'utf8');
        const merged = mergeFile(file.path, existingContent, file.content);

        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, merged, 'utf8');
      }

      result.merged.push(file.path);

      return;
    }

    if (action === 'overwrite') {
      if (!options.dryRun) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, file.content, 'utf8');
      }

      result.overwritten.push(file.path);

      return;
    }

    result.skipped.push(file.path);

    return;
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.content, 'utf8');
  }

  result.created.push(file.path);
}

export function generateSetup(options: GenerateOptions): GenerateResult {
  const files =
    options.files ??
    getGeneratedFiles(options.assistants, Boolean(options.figmaMcpInclude), Boolean(options.qaAiRulesInclude));

  if (!options.dryRun) {
    fs.mkdirSync(options.targetDir, { recursive: true });
  }

  const result: GenerateResult = {
    created: [],
    skipped: [],
    overwritten: [],
    merged: [],
    migratedLegacy: [],
    removedLegacy: [],
  };

  const metadataFile = files.find((file) => normalizeSetupPath(file.path) === SETUP_METADATA_PATH);
  const setupFiles = files.filter((file) => normalizeSetupPath(file.path) !== SETUP_METADATA_PATH);
  const desiredPaths = new Set(setupFiles.map((file) => normalizeSetupPath(file.path)));
  const loadedMetadata = loadSetupMetadata(options.targetDir);
  const previousRecords = loadedMetadata.kind === 'current' ? loadedMetadata.metadata.files : {};
  const cleanupOptions = { force: options.force, dryRun: options.dryRun };

  migrateLegacyFiles(options.targetDir, cleanupOptions, result);
  removeObsoleteSetupFiles(options.targetDir, options.assistants, previousRecords, cleanupOptions, result);

  const keptOrphanRecords = removeTrackedOrphans(
    options.targetDir,
    previousRecords,
    desiredPaths,
    cleanupOptions,
    result,
  );

  for (const file of setupFiles) {
    writeOneFile(
      options.targetDir,
      file,
      {
        force: options.force,
        dryRun: options.dryRun,
        existingFileActions: options.existingFileActions,
      },
      result,
    );
  }

  if (metadataFile) {
    const installedContent = new Map<string, string>();

    for (const file of setupFiles) {
      const normalizedPath = normalizeSetupPath(file.path);
      const destination = path.join(options.targetDir, file.path);
      const content =
        !options.dryRun && fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8') : file.content;

      installedContent.set(normalizedPath, content);
    }

    const metadata = createSetupMetadata(
      {
        assistants: options.assistants,
        // A plain re-run does not clean structured files, so the marker for a Playwright server
        // an older release wrote has to survive it; only `update` removes the server and resets it.
        playwrightMcp: loadedMetadata.kind === 'current' ? loadedMetadata.metadata.playwrightMcp : undefined,
        figmaMcp: resolveFigmaMcpTargets(options.assistants, Boolean(options.figmaMcpInclude)),
        qaAiRulesEnabled: Boolean(options.qaAiRulesInclude),
      },
      setupFiles,
      installedContent,
    );

    for (const mergedPath of result.merged) {
      const record = metadata.files[normalizeSetupPath(mergedPath)];

      if (record) {
        record.baseline = 'merged';
      }
    }

    Object.assign(metadata.files, keptOrphanRecords);

    writeOneFile(
      options.targetDir,
      {
        path: SETUP_METADATA_PATH,
        content: serializeSetupMetadata(metadata),
      },
      {
        // Metadata must describe the files installed during this run.
        force: true,
        dryRun: options.dryRun,
        existingFileActions: options.existingFileActions,
      },
      result,
    );
  }

  return result;
}
