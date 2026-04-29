import fs from 'node:fs';
import path from 'node:path';
import { METADATA_VERSION, SETUP_ASSISTANT_FILES, type Assistant } from './constants.js';
import { generateCursorFiles } from './generators/cursor.js';
import { generateClaudeFiles } from './generators/claude.js';
import { isMergeablePath, mergeFile } from './mcp-json-merge.js';
import type { GeneratedFile } from './generators/types.js';
import { readTemplate } from './templates.js';

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

  const sharedMetadata = {
    version: METADATA_VERSION,
    assistants,
    playwrightMcp: mcpTargets,
    figmaMcp: figmaTargets,
    devEnvironment: {
      file: '.dev-environment.md',
      generated: true,
    },
    pageWorkflowContext: {
      file: '.assistant-setup/page-workflow-context.md',
      generated: true,
    },
    linearCliReference: {
      file: 'LINEAR_CLI.md',
      generated: true,
    },
    generatedAt: new Date().toISOString(),
  };

  files.push({
    path: '.assistant-setup/page-workflow-context.md',
    content: readTemplate('assistant-setup/page-workflow-context.md'),
  });

  files.push({
    path: '.dev-environment.md',
    content: readTemplate('assistant-setup/dev-environment.md'),
  });

  files.push({
    path: '.assistant-setup/ca-ai-tools-setup.json',
    content: JSON.stringify(sharedMetadata, null, 2) + '\n',
  });

  files.push({
    path: 'LINEAR_CLI.md',
    content: readTemplate('LINEAR_CLI.md'),
  });

  files.push({
    path: 'AGENTS.md',
    content: readTemplate('AGENTS.md'),
  });

  return files;
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
          `Merge is not supported for "${file.path}". Supported paths: .cursor/mcp.json, .mcp.json, .claude/settings.json, AGENTS.md.`,
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
    options.files ?? getGeneratedFiles(options.assistants, options.playwrightMcpInclude, Boolean(options.figmaMcpInclude));

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

  for (const file of files) {
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

  return result;
}
