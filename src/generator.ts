import fs from 'node:fs';
import path from 'node:path';
import { METADATA_VERSION, type Assistant } from './constants.js';
import { generateCursorFiles } from './generators/cursor.js';
import { generateClaudeFiles } from './generators/claude.js';
import { isMcpConfigPath, mergeMcpJson } from './mcp-json-merge.js';
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
   * When a file already exists and `force` is false, per-path action.
   * Only `.cursor/mcp.json` and `.mcp.json` support `merge` (JSON `mcpServers` union).
   */
  existingFileActions?: Partial<Record<string, ExistingFileAction>>;
};

export type GenerateResult = {
  created: string[];
  skipped: string[];
  overwritten: string[];
  merged: string[];
};

export type PlaywrightMcpTargets = {
  cursorFile: boolean;
  projectRootFile: boolean;
};

const SETUP_ASSISTANT_FILES = new Set(['setup-cursor-assistant.md', 'setup-claude-assistant.md']);

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

export function getGeneratedFiles(assistants: Assistant[], playwrightMcpInclude: boolean): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const mcpTargets = resolvePlaywrightMcpTargets(assistants, playwrightMcpInclude);

  if (assistants.includes('cursor')) {
    files.push(...generateCursorFiles({ includePlaywrightMcp: mcpTargets.cursorFile }));
  }

  if (assistants.includes('claude')) {
    files.push(...generateClaudeFiles({ includePlaywrightMcp: mcpTargets.projectRootFile }));
  }

  const sharedMetadata = {
    version: METADATA_VERSION,
    assistants,
    playwrightMcp: mcpTargets,
    pageWorkflowContext: {
      file: '.assistant-setup/page-workflow-context.md',
      generated: true,
    },
    generatedAt: new Date().toISOString(),
  };

  files.push({
    path: '.assistant-setup/page-workflow-context.md',
    content: readTemplate('assistant-setup/page-workflow-context.md'),
  });

  files.push({
    path: '.assistant-setup/linear-cli-setup.json',
    content: JSON.stringify(sharedMetadata, null, 2) + '\n',
  });

  return files;
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

    if (action === 'merge' && isMcpConfigPath(file.path)) {
      if (!options.dryRun) {
        const existingContent = fs.readFileSync(destination, 'utf8');
        const merged = mergeMcpJson(existingContent, file.content);
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
  const files = getGeneratedFiles(options.assistants, options.playwrightMcpInclude);

  if (!options.dryRun) {
    fs.mkdirSync(options.targetDir, { recursive: true });
  }

  const result: GenerateResult = {
    created: [],
    skipped: [],
    overwritten: [],
    merged: [],
  };

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
