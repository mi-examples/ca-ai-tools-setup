#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import minimist from 'minimist';
import * as p from '@clack/prompts';
import { DEFAULT_ASSISTANTS, type Assistant } from './constants.js';
import { parseAssistantsArg } from './assistants.js';
import { generateSetup, getGeneratedFiles, resolvePlaywrightMcpTargets, type ExistingFileAction } from './generator.js';
import { isMcpConfigPath } from './mcp-json-merge.js';
import { parsePlaywrightMcpArg } from './playwright-mcp-choice.js';
import { resolveCliRepoRoot } from './path-policy.js';

type CliArgs = {
  _: string[];
  target?: string;
  assistants?: string;
  yes?: boolean;
  dryRun?: boolean;
  force?: boolean;
  'mcp-playwright'?: string;
};

const SETUP_ASSISTANT_FILES = new Set(['setup-cursor-assistant.md', 'setup-claude-assistant.md']);

function parseArgs(): CliArgs {
  return minimist(process.argv.slice(2), {
    string: ['target', 'assistants', 'mcp-playwright', '_'],
    boolean: ['yes', 'dry-run', 'force'],
    alias: {
      y: 'yes',
    },
  }) as CliArgs;
}

function mcpPlaywrightCliRaw(args: CliArgs): string | undefined {
  const v = args['mcp-playwright'];

  return typeof v === 'string' ? v : undefined;
}

function firstNonEmptyTarget(args: CliArgs): string | undefined {
  const fromFlag = args.target?.trim();
  if (fromFlag) {
    return fromFlag;
  }
  const positional = args._[0];
  if (positional === undefined || positional === null) {
    return undefined;
  }
  const s = String(positional).trim();
  return s || undefined;
}

async function pickTargetDir(args: CliArgs): Promise<string> {
  const cwd = process.cwd();
  const candidate = firstNonEmptyTarget(args);

  if (candidate) {
    return resolveCliRepoRoot(candidate, cwd);
  }

  if (args.yes) {
    return resolveCliRepoRoot(undefined, cwd);
  }

  const answer = await p.text({
    message: 'Target repository path (Enter for current directory):',
    placeholder: cwd,
  });

  if (p.isCancel(answer)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return resolveCliRepoRoot(answer?.trim(), cwd);
}

async function pickAssistants(args: CliArgs): Promise<Assistant[]> {
  const fromArg = parseAssistantsArg(args.assistants);
  if (fromArg) {
    return fromArg;
  }

  if (args.yes) {
    return DEFAULT_ASSISTANTS;
  }

  const selected = await p.multiselect({
    message: 'Select assistants to configure:',
    required: true,
    initialValues: DEFAULT_ASSISTANTS,
    options: [
      { value: 'cursor', label: 'Cursor' },
      { value: 'claude', label: 'Claude' },
    ],
  });

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return selected as Assistant[];
}

async function pickPlaywrightMcpInclude(args: CliArgs): Promise<boolean> {
  const fromFlag = parsePlaywrightMcpArg(mcpPlaywrightCliRaw(args));
  if (fromFlag !== undefined) {
    return fromFlag;
  }

  if (args.yes) {
    return true;
  }

  const answer = await p.confirm({
    message:
      'Add Playwright MCP? (writes .cursor/mcp.json if Cursor is selected, and .mcp.json in the project root if Claude is selected)',
    initialValue: true,
  });

  if (p.isCancel(answer)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return answer;
}

async function promptExistingMcpActions(
  args: CliArgs,
  targetDir: string,
  files: ReturnType<typeof getGeneratedFiles>,
): Promise<Partial<Record<string, ExistingFileAction>>> {
  if (args.force || args.dryRun || args.yes) {
    return {};
  }

  const actions: Partial<Record<string, ExistingFileAction>> = {};

  for (const file of files) {
    if (!isMcpConfigPath(file.path)) {
      continue;
    }
    const dest = path.join(targetDir, file.path);
    if (!fs.existsSync(dest)) {
      continue;
    }

    const choice = await p.select({
      message: `File already exists: ${file.path}`,
      options: [
        { value: 'skip', label: 'Skip — keep the current file' },
        {
          value: 'merge',
          label: 'Merge — combine mcpServers (generated keys override the same name)',
        },
        { value: 'overwrite', label: 'Overwrite — replace with generated content' },
      ],
      initialValue: 'skip',
    });

    if (p.isCancel(choice)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    actions[file.path] = choice as ExistingFileAction;
  }

  return actions;
}

function printSummary(
  targetDir: string,
  assistants: Assistant[],
  playwrightMcpInclude: boolean,
  result: ReturnType<typeof generateSetup>,
  dryRun: boolean,
) {
  const modeLabel = dryRun ? 'Dry run completed.' : 'Setup generation completed.';
  p.outro(modeLabel);

  const mcpTargets = resolvePlaywrightMcpTargets(assistants, playwrightMcpInclude);

  console.log('');
  console.log(`Target repository: ${targetDir}`);
  console.log(`Assistants: ${assistants.join(', ')}`);
  if (mcpTargets.cursorFile || mcpTargets.projectRootFile) {
    const parts: string[] = [];
    if (mcpTargets.cursorFile) {
      parts.push('.cursor/mcp.json');
    }
    if (mcpTargets.projectRootFile) {
      parts.push('.mcp.json (repo root)');
    }
    console.log(`Playwright MCP: yes — ${parts.join(', ')}`);
  } else {
    console.log('Playwright MCP: no (instructions only; no MCP files from this run)');
  }
  console.log('');
  console.log(`Created: ${result.created.length}`);
  console.log(`Merged: ${result.merged.length}`);
  console.log(`Overwritten: ${result.overwritten.length}`);
  console.log(`Skipped: ${result.skipped.length}`);

  const allTouched = [...result.created, ...result.merged, ...result.overwritten];
  if (allTouched.length > 0) {
    console.log('');
    console.log('Updated files:');
    for (const file of result.created) {
      console.log(`  - ${file} (created)`);
    }
    for (const file of result.merged) {
      console.log(`  - ${file} (merged)`);
    }
    for (const file of result.overwritten) {
      console.log(`  - ${file} (overwritten)`);
    }
  }

  const autoReplacedSetupFiles = result.overwritten.filter((file) => SETUP_ASSISTANT_FILES.has(file));
  if (autoReplacedSetupFiles.length > 0) {
    console.log('');
    console.log(
      'Setup assistant files were replaced with the latest generated templates:',
    );
    for (const file of autoReplacedSetupFiles) {
      console.log(`  - ${file}`);
    }
  }

  if (result.skipped.length > 0) {
    console.log('');
    console.log('Skipped existing files (re-run without --yes to choose merge/overwrite, or use --force):');
    for (const file of result.skipped) {
      console.log(`  - ${file}`);
    }
  }
}

async function run(): Promise<void> {
  const args = parseArgs();
  p.intro('Create Linear Assistant Setup');

  const targetDir = await pickTargetDir(args);
  const assistants = await pickAssistants(args);
  const playwrightMcpInclude = await pickPlaywrightMcpInclude(args);
  const files = getGeneratedFiles(assistants, playwrightMcpInclude);
  const existingFileActions = await promptExistingMcpActions(args, targetDir, files);

  const result = generateSetup({
    targetDir,
    assistants,
    force: Boolean(args.force),
    dryRun: Boolean(args.dryRun),
    playwrightMcpInclude,
    existingFileActions,
  });

  printSummary(targetDir, assistants, playwrightMcpInclude, result, Boolean(args.dryRun));
}

run().catch((error: unknown) => {
  p.cancel('Operation failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
