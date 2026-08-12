#!/usr/bin/env node
import * as p from '@clack/prompts';
import { QA_AI_RULES_PACKAGE } from './constants.js';
import { generateSetup, getGeneratedFiles } from './generator.js';
import { runQaAiRulesSetup } from './qa-ai-rules-setup.js';
import { loadPreviousInteractiveDefaults, type InteractiveDefaults } from './previous-setup.js';
import {
  cliMode,
  mcpFigmaCliRaw,
  mcpPlaywrightCliRaw,
  parseCliArgs,
  qaAiRulesCliRaw,
  type CliArgs,
  validateCliArgs,
} from './cli-args.js';
import {
  pickAssistants,
  pickFigmaMcpInclude,
  pickPlaywrightMcpInclude,
  pickQaAiRulesInclude,
  pickTargetDir,
  promptExistingMcpActions,
} from './cli-prompts.js';
import { printReconcileSummary, printSummary, type QaAiRulesSummaryHook } from './cli-summary.js';
import { parseAssistantsArg } from './assistants.js';
import { parsePlaywrightMcpArg } from './playwright-mcp-choice.js';
import { parseFigmaMcpArg } from './figma-mcp-choice.js';
import { parseQaAiRulesArg } from './qa-ai-rules-choice.js';
import { checkSetup, updateSetup, type ReconcileConfiguration } from './reconcile.js';
import { loadSetupMetadata } from './setup-metadata.js';
import { getCliPackageVersion } from './setup-log.js';

async function runGenerate(args: CliArgs): Promise<void> {
  p.intro('Create Linear Assistant Setup');

  const targetDir = await pickTargetDir(args);
  const previousDefaults = args.yes ? null : loadPreviousInteractiveDefaults(targetDir);
  const assistants = await pickAssistants(args, previousDefaults);
  const playwrightMcpInclude = await pickPlaywrightMcpInclude(args, previousDefaults);
  const figmaMcpInclude = await pickFigmaMcpInclude(args, previousDefaults);
  const qaAiRulesInclude = await pickQaAiRulesInclude(args, previousDefaults);
  const files = getGeneratedFiles(assistants, playwrightMcpInclude, figmaMcpInclude, qaAiRulesInclude);
  const existingFileActions = await promptExistingMcpActions(args, targetDir, files);

  const result = generateSetup({
    targetDir,
    assistants,
    force: Boolean(args.force),
    dryRun: Boolean(args.dryRun),
    playwrightMcpInclude,
    figmaMcpInclude,
    qaAiRulesInclude,
    existingFileActions,
    files,
  });

  let qaAiRulesHook: QaAiRulesSummaryHook = 'inactive';
  let qaAiRulesRunnerLabel: string | undefined;

  if (qaAiRulesInclude) {
    if (args.dryRun) {
      qaAiRulesHook = 'dry-run';
    } else {
      const qaResult = runQaAiRulesSetup(targetDir, assistants);

      if (qaResult.ok) {
        qaAiRulesHook = 'success';
        qaAiRulesRunnerLabel = qaResult.runnerLabel;
      } else if (qaResult.reason === 'no-package-json') {
        qaAiRulesHook = 'skipped-no-package-json';
        console.warn(
          `[ca-ai-tools-setup] Skipped ${QA_AI_RULES_PACKAGE}: add package.json to the target repo, then e.g.:\n` +
            `  npm exec --yes --package=${QA_AI_RULES_PACKAGE} -- qa-ai-rules init\n` +
            `  pnpm dlx ${QA_AI_RULES_PACKAGE} init\n` +
            `  yarn dlx ${QA_AI_RULES_PACKAGE} init\n` +
            `  bunx ${QA_AI_RULES_PACKAGE} init`,
        );
      } else {
        const msg =
          qaResult.reason === 'run-failed'
            ? `${QA_AI_RULES_PACKAGE} init failed (${qaResult.runnerLabel ?? 'runner'})${
                qaResult.detail ? `: ${qaResult.detail}` : ''
              }`
            : 'QA AI rules setup failed';

        throw new Error(msg);
      }
    }
  }

  printSummary(
    targetDir,
    assistants,
    playwrightMcpInclude,
    figmaMcpInclude,
    qaAiRulesInclude,
    qaAiRulesHook,
    qaAiRulesRunnerLabel,
    result,
    Boolean(args.dryRun),
  );
}

function resolveReconcileConfiguration(args: CliArgs, previous: InteractiveDefaults): ReconcileConfiguration {
  return {
    assistants: parseAssistantsArg(args.assistants) ?? previous.assistants,
    playwrightMcpInclude: parsePlaywrightMcpArg(mcpPlaywrightCliRaw(args)) ?? previous.playwrightMcpInclude,
    figmaMcpInclude: parseFigmaMcpArg(mcpFigmaCliRaw(args)) ?? previous.figmaMcpInclude,
    qaAiRulesInclude: parseQaAiRulesArg(qaAiRulesCliRaw(args)) ?? previous.qaAiRulesInclude,
  };
}

function runExplicitQaSetup(targetDir: string, configuration: ReconcileConfiguration, args: CliArgs): void {
  const explicitlyEnabled = parseQaAiRulesArg(qaAiRulesCliRaw(args)) === true;

  if (!explicitlyEnabled || args.dryRun) {
    return;
  }

  const qaResult = runQaAiRulesSetup(targetDir, configuration.assistants);

  if (qaResult.ok) {
    return;
  }

  if (qaResult.reason === 'no-package-json') {
    console.warn(`[ca-ai-tools-setup] Skipped ${QA_AI_RULES_PACKAGE}: target repository has no package.json.`);

    return;
  }

  throw new Error(
    qaResult.reason === 'run-failed'
      ? `${QA_AI_RULES_PACKAGE} init failed (${qaResult.runnerLabel ?? 'runner'})${
          qaResult.detail ? `: ${qaResult.detail}` : ''
        }`
      : 'QA AI rules setup failed',
  );
}

async function runReconcile(args: CliArgs, mode: 'check' | 'update'): Promise<void> {
  p.intro(mode === 'check' ? 'Check Linear Assistant Setup' : 'Update Linear Assistant Setup');

  const targetDir = await pickTargetDir({ ...args, yes: true });
  const metadata = loadSetupMetadata(targetDir);
  const previous = loadPreviousInteractiveDefaults(targetDir);

  if (!previous) {
    if (metadata.kind === 'invalid') {
      throw new Error(`Invalid setup metadata: ${metadata.detail}`);
    }

    throw new Error(
      `Setup metadata not found or unsupported: .assistant-setup/ca-ai-tools-setup.json. ` +
        'Run the initial setup first.',
    );
  }

  const configuration = resolveReconcileConfiguration(args, previous);
  const files = getGeneratedFiles(
    configuration.assistants,
    configuration.playwrightMcpInclude,
    configuration.figmaMcpInclude,
    configuration.qaAiRulesInclude,
  );
  const commonOptions = {
    targetDir,
    files,
    metadata,
    force: Boolean(args.force),
    ...configuration,
  };
  const result =
    mode === 'check'
      ? checkSetup(commonOptions)
      : updateSetup({
          ...commonOptions,
          dryRun: Boolean(args.dryRun),
        });

  if (mode === 'update' && result.applied) {
    runExplicitQaSetup(targetDir, configuration, args);
  }

  printReconcileSummary(targetDir, result, Boolean(args.dryRun));

  if ((mode === 'check' && result.plan.hasChanges) || result.conflicts.length > 0) {
    process.exitCode = 2;
  }
}

async function run(): Promise<void> {
  const args = parseCliArgs();

  validateCliArgs(args);

  if (args.version) {
    process.stdout.write(`${getCliPackageVersion()}\n`);

    return;
  }

  const mode = cliMode(args);

  if (mode === 'generate') {
    await runGenerate(args);

    return;
  }

  await runReconcile(args, mode);
}

run().catch((error: unknown) => {
  p.cancel('Operation failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
