import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import { DEFAULT_ASSISTANTS, QA_AI_RULES_PACKAGE, type Assistant } from './constants.js';
import { parseAssistantsArg } from './assistants.js';
import { parsePlaywrightMcpArg } from './playwright-mcp-choice.js';
import { parseFigmaMcpArg } from './figma-mcp-choice.js';
import { parseQaAiRulesArg } from './qa-ai-rules-choice.js';
import { isMergeablePath } from './mcp-json-merge.js';
import { resolveCliRepoRoot } from './path-policy.js';
import { type InteractiveDefaults } from './previous-setup.js';
import { type ExistingFileAction } from './generator.js';
import { type GeneratedFile } from './generators/types.js';
import {
  firstNonEmptyTarget,
  mcpFigmaCliRaw,
  mcpPlaywrightCliRaw,
  qaAiRulesCliRaw,
  type CliArgs,
} from './cli-args.js';

export async function pickTargetDir(args: CliArgs): Promise<string> {
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

export async function pickAssistants(args: CliArgs, previous: InteractiveDefaults | null): Promise<Assistant[]> {
  const fromArg = parseAssistantsArg(args.assistants);

  if (fromArg) {
    return fromArg;
  }

  if (args.yes) {
    return DEFAULT_ASSISTANTS;
  }

  const initialAssistants = previous?.assistants ?? DEFAULT_ASSISTANTS;

  const selected = await p.multiselect({
    message: 'Select assistants to configure:',
    required: true,
    initialValues: initialAssistants,
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

export async function pickPlaywrightMcpInclude(args: CliArgs, previous: InteractiveDefaults | null): Promise<boolean> {
  const fromFlag = parsePlaywrightMcpArg(mcpPlaywrightCliRaw(args));

  if (fromFlag !== undefined) {
    return fromFlag;
  }

  if (args.yes) {
    return true;
  }

  const answer = await p.confirm({
    message:
      'Add Playwright MCP? (writes .cursor/mcp.json if Cursor is selected, and' +
      ' .mcp.json in the project root if Claude is selected)',
    initialValue: previous?.playwrightMcpInclude ?? true,
  });

  if (p.isCancel(answer)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return answer;
}

export async function pickFigmaMcpInclude(args: CliArgs, previous: InteractiveDefaults | null): Promise<boolean> {
  const fromFlag = parseFigmaMcpArg(mcpFigmaCliRaw(args));

  if (fromFlag !== undefined) {
    return fromFlag;
  }

  if (args.yes) {
    return false;
  }

  const answer = await p.confirm({
    message:
      'Add Figma MCP? (writes .cursor/mcp.json if Cursor is selected, and' +
      ' .mcp.json in the project root if Claude is selected; requires FIGMA_API_KEY)',
    initialValue: previous?.figmaMcpInclude ?? false,
  });

  if (p.isCancel(answer)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return answer;
}

export async function pickQaAiRulesInclude(args: CliArgs, previous: InteractiveDefaults | null): Promise<boolean> {
  const fromFlag = parseQaAiRulesArg(qaAiRulesCliRaw(args));

  if (fromFlag !== undefined) {
    return fromFlag;
  }

  if (args.yes) {
    return false;
  }

  const answer = await p.confirm({
    message:
      `Install QA AI rules (${QA_AI_RULES_PACKAGE})? ` +
      'Adds the package, qa-ai-rules.config.json, and test rule files for the selected IDE(s)',
    initialValue: previous?.qaAiRulesInclude ?? false,
  });

  if (p.isCancel(answer)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return answer;
}

export async function promptExistingMcpActions(
  args: CliArgs,
  targetDir: string,
  files: GeneratedFile[],
): Promise<Partial<Record<string, ExistingFileAction>>> {
  if (args.force || args.dryRun || args.yes) {
    return {};
  }

  const actions: Partial<Record<string, ExistingFileAction>> = {};

  for (const file of files) {
    if (!isMergeablePath(file.path)) {
      continue;
    }

    const dest = path.join(targetDir, file.path);

    if (!fs.existsSync(dest)) {
      continue;
    }

    const mergeLabel =
      file.path === '.cursor/mcp.json' || file.path === '.mcp.json'
        ? 'Merge — union mcpServers (generated keys override on name collision)'
        : file.path === '.claude/settings.json'
          ? 'Merge — union MCP server lists; $schema and other keys preserved'
          : 'Merge — append new agent table rows not already listed';

    const choice = await p.select({
      message: `File already exists: ${file.path}`,
      options: [
        { value: 'skip', label: 'Skip — keep the current file' },
        { value: 'merge', label: mergeLabel },
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
