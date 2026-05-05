/* eslint-disable no-console */
import * as p from '@clack/prompts';
import { QA_AI_RULES_PACKAGE, SETUP_ASSISTANT_FILES, type Assistant } from './constants.js';
import { resolveFigmaMcpTargets, resolvePlaywrightMcpTargets, type GenerateResult } from './generator.js';

export type QaAiRulesSummaryHook = 'inactive' | 'dry-run' | 'success' | 'skipped-no-package-json';

export function printSummary(
  targetDir: string,
  assistants: Assistant[],
  playwrightMcpInclude: boolean,
  figmaMcpInclude: boolean,
  qaAiRulesInclude: boolean,
  qaAiRulesHook: QaAiRulesSummaryHook,
  qaAiRulesRunnerLabel: string | undefined,
  result: GenerateResult,
  dryRun: boolean,
): void {
  const modeLabel = dryRun ? 'Dry run completed.' : 'Setup generation completed.';

  p.outro(modeLabel);

  const pageContextPath = '.assistant-setup/page-workflow-context.md';
  const devEnvironmentPath = '.dev-environment.md';

  const mcpTargets = resolvePlaywrightMcpTargets(assistants, playwrightMcpInclude);
  const figmaTargets = resolveFigmaMcpTargets(assistants, figmaMcpInclude);

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

  if (figmaTargets.cursorFile || figmaTargets.projectRootFile) {
    const parts: string[] = [];

    if (figmaTargets.cursorFile) {
      parts.push('.cursor/mcp.json');
    }

    if (figmaTargets.projectRootFile) {
      parts.push('.mcp.json (repo root)');
    }

    console.log(`Figma MCP: yes — ${parts.join(', ')}`);
  } else {
    console.log('Figma MCP: no');
  }

  if (!qaAiRulesInclude) {
    console.log(`QA AI rules (${QA_AI_RULES_PACKAGE}): no`);
  } else if (qaAiRulesHook === 'dry-run') {
    console.log(
      `QA AI rules (${QA_AI_RULES_PACKAGE}): skipped — dry run (no one-shot package runner, e.g. npx / pnpm dlx)`,
    );
  } else if (qaAiRulesHook === 'success') {
    const via = qaAiRulesRunnerLabel ? ` (${qaAiRulesRunnerLabel})` : '';

    console.log(`QA AI rules (${QA_AI_RULES_PACKAGE}): init completed in target repo${via}`);
  } else if (qaAiRulesHook === 'skipped-no-package-json') {
    console.log(`QA AI rules (${QA_AI_RULES_PACKAGE}): skipped — no package.json in target`);
  }

  console.log('');
  console.log(`Created: ${result.created.length}`);
  console.log(`Merged: ${result.merged.length}`);
  console.log(`Overwritten: ${result.overwritten.length}`);
  console.log(`Skipped: ${result.skipped.length}`);

  if (result.migratedLegacy.length > 0) {
    console.log(`Migrated legacy files: ${result.migratedLegacy.length}`);
  }

  if (result.removedLegacy.length > 0) {
    console.log(`Removed legacy files: ${result.removedLegacy.length}`);
  }

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
    console.log('Setup assistant files were replaced with the latest generated templates:');

    for (const file of autoReplacedSetupFiles) {
      console.log(`  - ${file}`);
    }
  }

  const pageContextState = result.created.includes(pageContextPath)
    ? 'created'
    : result.overwritten.includes(pageContextPath)
      ? 'overwritten'
      : result.skipped.includes(pageContextPath)
        ? 'skipped'
        : result.merged.includes(pageContextPath)
          ? 'merged'
          : null;

  if (pageContextState) {
    console.log('');
    console.log('Page workflow context file:');
    console.log(`  - ${pageContextPath} (${pageContextState})`);
  }

  const devEnvironmentState = result.created.includes(devEnvironmentPath)
    ? 'created'
    : result.overwritten.includes(devEnvironmentPath)
      ? 'overwritten'
      : result.skipped.includes(devEnvironmentPath)
        ? 'skipped'
        : result.merged.includes(devEnvironmentPath)
          ? 'merged'
          : null;

  if (devEnvironmentState) {
    console.log('');
    console.log('Developer environment file:');
    console.log(`  - ${devEnvironmentPath} (${devEnvironmentState})`);
  }

  if (result.skipped.length > 0) {
    console.log('');
    console.log('Skipped existing files:');
    console.log(
      '  - Mergeable files (.cursor/mcp.json, .mcp.json, .claude/settings.json, AGENTS.md): ' +
        'run without --yes to choose skip/merge/overwrite',
    );
    console.log('  - Any existing generated file: use --force to overwrite');

    for (const file of result.skipped) {
      console.log(`  - ${file}`);
    }
  }

  if (result.migratedLegacy.length > 0) {
    console.log('');
    console.log('Migrated legacy files:');

    for (const file of result.migratedLegacy) {
      console.log(`  - ${file}`);
    }
  }

  if (result.removedLegacy.length > 0) {
    console.log('');
    console.log('Removed legacy files (--force):');

    for (const file of result.removedLegacy) {
      console.log(`  - ${file}`);
    }
  }
}
