#!/usr/bin/env node
import * as p from '@clack/prompts';
import { QA_AI_RULES_PACKAGE } from './constants.js';
import { generateSetup, getGeneratedFiles } from './generator.js';
import { runQaAiRulesSetup } from './qa-ai-rules-setup.js';
import { loadPreviousInteractiveDefaults } from './previous-setup.js';
import { parseCliArgs } from './cli-args.js';
import {
  pickAssistants,
  pickFigmaMcpInclude,
  pickPlaywrightMcpInclude,
  pickQaAiRulesInclude,
  pickTargetDir,
  promptExistingMcpActions,
} from './cli-prompts.js';
import { printSummary, type QaAiRulesSummaryHook } from './cli-summary.js';

async function run(): Promise<void> {
  const args = parseCliArgs();

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
            `  npx ${QA_AI_RULES_PACKAGE} init\n` +
            `  pnpm dlx ${QA_AI_RULES_PACKAGE} init\n` +
            `  yarn dlx ${QA_AI_RULES_PACKAGE} init\n` +
            `  bunx ${QA_AI_RULES_PACKAGE} init`,
        );
      } else {
        throw new Error(
          qaResult.reason === 'run-failed'
            ? `${QA_AI_RULES_PACKAGE} init failed (${qaResult.runnerLabel ?? 'runner'})${
                qaResult.detail ? `: ${qaResult.detail}` : ''
              }`
            : 'QA AI rules setup failed',
        );
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

run().catch((error: unknown) => {
  p.cancel('Operation failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
