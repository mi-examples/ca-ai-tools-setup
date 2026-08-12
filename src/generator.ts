import fs from 'node:fs';
import path from 'node:path';
import { SETUP_ASSISTANT_FILES, type Assistant } from './constants.js';
import { generateCursorFiles } from './generators/cursor.js';
import { generateClaudeFiles } from './generators/claude.js';
import { buildCursorRuleFiles } from './generators/portal-page-ai.js';
import { isMergeablePath, mergeFile } from './mcp-json-merge.js';
import type { GeneratedFile } from './generators/types.js';
import { readTemplate } from './templates.js';
import {
  createSetupMetadata,
  createSetupStatusContent,
  normalizeSetupPath,
  serializeSetupMetadata,
  SETUP_METADATA_PATH,
  SETUP_STATUS_PATH,
} from './setup-metadata.js';

export type ExistingFileAction = 'skip' | 'merge' | 'overwrite';

export type GenerateOptions = {
  targetDir: string;
  assistants: Assistant[];
  force: boolean;
  dryRun: boolean;
  /**
   * When true, writes Playwright MCP config for each selected assistant:
   * Cursor → `.cursor/mcp.json`, Claude → `.mcp.json` at repo root.
   */
  playwrightMcpInclude: boolean;
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

export type PlaywrightMcpTargets = {
  cursorFile: boolean;
  projectRootFile: boolean;
};

export type FigmaMcpTargets = {
  cursorFile: boolean;
  projectRootFile: boolean;
};

const LEGACY_FILE_MAPPINGS = [
  {
    legacyPath: '.cursor/linear-cli-setup.json',
    currentPath: '.cursor/ca-ai-tools-setup.json',
  },
  {
    legacyPath: '.assistant-setup/linear-cli-setup.json',
    currentPath: '.assistant-setup/ca-ai-tools-setup.json',
  },
] as const;

/** Obsolete setup artifacts removed on every re-run (PP-3640 legacy AI QA flow). */
export const REMOVABLE_LEGACY_SETUP_PATHS = [
  '.cursor/skills/ai-testing/SKILL.md',
  '.cursor/skills/ui-check/SKILL.md',
  '.claude/skills/ai-testing/SKILL.md',
  '.claude/skills/ui-check/SKILL.md',
  '.claude/workflows/ui-check.md',
  '.cursor/skills/README.md',
] as const;

function shouldAlwaysOverwrite(filePath: string): boolean {
  return SETUP_ASSISTANT_FILES.has(filePath);
}

export function resolvePlaywrightMcpTargets(assistants: Assistant[], include: boolean): PlaywrightMcpTargets {
  if (!include) {
    return { cursorFile: false, projectRootFile: false };
  }

  return {
    cursorFile: assistants.includes('cursor'),
    projectRootFile: assistants.includes('claude'),
  };
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
  playwrightMcpInclude: boolean,
  figmaMcpInclude = false,
  qaAiRulesInclude = false,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const mcpTargets = resolvePlaywrightMcpTargets(assistants, playwrightMcpInclude);
  const figmaTargets = resolveFigmaMcpTargets(assistants, figmaMcpInclude);

  if (assistants.includes('cursor')) {
    files.push(
      ...generateCursorFiles({
        includePlaywrightMcp: mcpTargets.cursorFile,
        includeFigmaMcp: figmaTargets.cursorFile,
      }),
    );
  }

  if (assistants.includes('claude')) {
    files.push(
      ...generateClaudeFiles({
        includePlaywrightMcp: mcpTargets.projectRootFile,
        includeFigmaMcp: figmaTargets.projectRootFile,
      }),
    );
  }

  // Claude Code reads `.cursor/rules/*.mdc` per project convention — emit rules even for Claude-only runs.
  if (assistants.includes('claude') && !assistants.includes('cursor')) {
    files.push(...buildCursorRuleFiles(figmaTargets.projectRootFile));
  }

  files.push({
    path: '.assistant-setup/page-workflow-context.md',
    content: readTemplate('assistant-setup/page-workflow-context.md'),
  });

  files.push({
    path: '.dev-environment.md',
    content: readTemplate('assistant-setup/dev-environment.md'),
  });

  files.push({
    path: 'LINEAR_CLI.md',
    content: readTemplate('LINEAR_CLI.md'),
  });

  files.push({
    path: 'AGENTS.md',
    content: readTemplate('AGENTS.md'),
  });

  const metadataConfiguration = {
    assistants,
    playwrightMcp: mcpTargets,
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

function removeEmptyParentDirs(targetDir: string, filePath: string, result: GenerateResult): void {
  const targetRoot = path.resolve(targetDir);
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

    const relDir = rel.split(path.sep).join('/');

    fs.rmdirSync(dir);
    result.removedLegacy.push(relDir);
    dir = path.dirname(dir);
  }
}

function removeObsoleteSetupFiles(
  targetDir: string,
  options: Pick<GenerateOptions, 'dryRun'>,
  result: GenerateResult,
): void {
  for (const relativePath of REMOVABLE_LEGACY_SETUP_PATHS) {
    const destination = path.join(targetDir, relativePath);

    if (!fs.existsSync(destination)) {
      continue;
    }

    if (!options.dryRun) {
      fs.rmSync(destination);
      removeEmptyParentDirs(targetDir, destination, result);
    }

    result.removedLegacy.push(relativePath);
  }
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

  if (exists && normalizeSetupPath(file.path) === 'AGENTS.md') {
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
            'Supported paths: .cursor/mcp.json, .mcp.json, .claude/settings.json, AGENTS.md.',
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
    getGeneratedFiles(
      options.assistants,
      options.playwrightMcpInclude,
      Boolean(options.figmaMcpInclude),
      Boolean(options.qaAiRulesInclude),
    );

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

  migrateLegacyFiles(options.targetDir, { force: options.force, dryRun: options.dryRun }, result);
  removeObsoleteSetupFiles(options.targetDir, { dryRun: options.dryRun }, result);

  const metadataFile = files.find((file) => normalizeSetupPath(file.path) === SETUP_METADATA_PATH);
  const setupFiles = files.filter((file) => normalizeSetupPath(file.path) !== SETUP_METADATA_PATH);

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
        playwrightMcp: resolvePlaywrightMcpTargets(options.assistants, options.playwrightMcpInclude),
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
