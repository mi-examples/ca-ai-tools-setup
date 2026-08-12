import * as p from '@clack/prompts';
import { QA_AI_RULES_PACKAGE, SETUP_ASSISTANT_FILES, type Assistant } from './constants.js';
import { resolveFigmaMcpTargets, resolvePlaywrightMcpTargets, type GenerateResult } from './generator.js';
import type { ReconcileResult } from './reconcile.js';

export type QaAiRulesSummaryHook = 'inactive' | 'dry-run' | 'success' | 'skipped-no-package-json';

function printLine(line = ''): void {
  process.stdout.write(`${line}\n`);
}

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

  printLine();
  printLine(`Target repository: ${targetDir}`);
  printLine(`Assistants: ${assistants.join(', ')}`);

  if (mcpTargets.cursorFile || mcpTargets.projectRootFile) {
    const parts: string[] = [];

    if (mcpTargets.cursorFile) {
      parts.push('.cursor/mcp.json');
    }

    if (mcpTargets.projectRootFile) {
      parts.push('.mcp.json (repo root)');
    }

    printLine(`Playwright MCP: yes — ${parts.join(', ')}`);
  } else {
    printLine('Playwright MCP: no (instructions only; no MCP files from this run)');
  }

  if (figmaTargets.cursorFile || figmaTargets.projectRootFile) {
    const parts: string[] = [];

    if (figmaTargets.cursorFile) {
      parts.push('.cursor/mcp.json');
    }

    if (figmaTargets.projectRootFile) {
      parts.push('.mcp.json (repo root)');
    }

    printLine(`Figma MCP: yes — ${parts.join(', ')}`);
  } else {
    printLine('Figma MCP: no');
  }

  if (!qaAiRulesInclude) {
    printLine(`QA AI rules (${QA_AI_RULES_PACKAGE}): no`);
  } else if (qaAiRulesHook === 'dry-run') {
    printLine(
      `QA AI rules (${QA_AI_RULES_PACKAGE}): skipped — dry run (no one-shot package runner, e.g. npx / pnpm dlx)`,
    );
  } else if (qaAiRulesHook === 'success') {
    const via = qaAiRulesRunnerLabel ? ` (${qaAiRulesRunnerLabel})` : '';

    printLine(`QA AI rules (${QA_AI_RULES_PACKAGE}): init completed in target repo${via}`);
  } else if (qaAiRulesHook === 'skipped-no-package-json') {
    printLine(`QA AI rules (${QA_AI_RULES_PACKAGE}): skipped — no package.json in target`);
  }

  printLine();
  printLine(`Created: ${result.created.length}`);
  printLine(`Merged: ${result.merged.length}`);
  printLine(`Overwritten: ${result.overwritten.length}`);
  printLine(`Skipped: ${result.skipped.length}`);

  if (result.migratedLegacy.length > 0) {
    printLine(`Migrated legacy files: ${result.migratedLegacy.length}`);
  }

  if (result.removedLegacy.length > 0) {
    printLine(`Removed legacy files: ${result.removedLegacy.length}`);
  }

  const allTouched = [...result.created, ...result.merged, ...result.overwritten];

  if (allTouched.length > 0) {
    printLine();
    printLine('Updated files:');

    for (const file of result.created) {
      printLine(`  - ${file} (created)`);
    }

    for (const file of result.merged) {
      printLine(`  - ${file} (merged)`);
    }

    for (const file of result.overwritten) {
      printLine(`  - ${file} (overwritten)`);
    }
  }

  const autoReplacedSetupFiles = result.overwritten.filter((file) => SETUP_ASSISTANT_FILES.has(file));

  if (autoReplacedSetupFiles.length > 0) {
    printLine();
    printLine('Setup assistant files were replaced with the latest generated templates:');

    for (const file of autoReplacedSetupFiles) {
      printLine(`  - ${file}`);
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
    printLine();
    printLine('Page workflow context file:');
    printLine(`  - ${pageContextPath} (${pageContextState})`);
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
    printLine();
    printLine('Developer environment file:');
    printLine(`  - ${devEnvironmentPath} (${devEnvironmentState})`);
  }

  if (result.skipped.length > 0) {
    printLine();
    printLine('Skipped existing files:');
    printLine(
      '  - Mergeable files (.cursor/mcp.json, .mcp.json, .claude/settings.json): ' +
        'run without --yes to choose skip/merge/overwrite',
    );
    printLine('  - AGENTS.md is always merged conservatively and is never replaced');
    printLine('  - Any existing generated file: use --force to overwrite');

    for (const file of result.skipped) {
      printLine(`  - ${file}`);
    }
  }

  if (result.migratedLegacy.length > 0) {
    printLine();
    printLine('Migrated legacy files:');

    for (const file of result.migratedLegacy) {
      printLine(`  - ${file}`);
    }
  }

  if (result.removedLegacy.length > 0) {
    printLine();
    printLine('Removed legacy files:');

    for (const file of result.removedLegacy) {
      printLine(`  - ${file}`);
    }
  }
}

export function printReconcileSummary(targetDir: string, result: ReconcileResult, dryRun: boolean): void {
  const label =
    result.mode === 'check'
      ? 'Setup check completed.'
      : !result.applied && result.conflicts.length > 0
        ? 'Setup update blocked by conflicts.'
        : dryRun
          ? 'Setup update preview completed.'
          : 'Setup update completed.';

  p.outro(label);
  printLine();
  printLine(`Target repository: ${targetDir}`);
  printLine(`Package version: ${result.previousVersion} -> ${result.desiredVersion}`);

  if (result.metadataMigrationRequired) {
    printLine(result.applied && !dryRun ? 'Metadata: migrated to schema 6' : 'Metadata: schema 5 migration required');
  } else if (result.metadataUpdated) {
    printLine('Metadata: updated');
  }

  printLine();
  printLine(`Created: ${result.created.length}`);
  printLine(`Updated: ${result.updated.length}`);
  printLine(`Merged: ${result.merged.length}`);
  printLine(`Removed: ${result.removed.length}`);
  printLine(`Preserved: ${result.preserved.length}`);
  printLine(`Orphaned: ${result.orphaned.length}`);
  printLine(`Conflicts: ${result.conflicts.length}`);
  printLine(`Unchanged: ${result.unchanged.length}`);

  const changedPaths = [
    ...result.created.map((file) => `${file} (create)`),
    ...result.updated.map((file) => `${file} (update)`),
    ...result.merged.map((file) => `${file} (merge)`),
    ...result.removed.map((file) => `${file} (remove)`),
  ].sort();

  if (changedPaths.length > 0) {
    printLine();
    printLine(result.mode === 'check' || dryRun ? 'Planned changes:' : 'Updated files:');

    for (const file of changedPaths) {
      printLine(`  - ${file}`);
    }
  }

  if (result.preserved.length > 0) {
    printLine();
    printLine('Protected or repository-owned files preserved:');

    for (const file of result.preserved) {
      printLine(`  - ${file}`);
    }
  }

  const preservedOrphans = result.orphaned.filter((file) => !result.removed.includes(file));

  if (preservedOrphans.length > 0) {
    printLine();
    printLine('Obsolete files preserved for manual review:');

    for (const file of preservedOrphans) {
      printLine(`  - ${file}`);
    }
  }

  if (result.conflicts.length > 0) {
    printLine();
    printLine('Conflicts:');

    for (const file of result.plan.files.filter((entry) => entry.state === 'conflict')) {
      printLine(`  - ${file.path}${file.reason ? ` — ${file.reason}` : ''}`);
    }

    printLine('Resolve these files or rerun update with --force to replace generated baselines.');
  }

  if (result.mode === 'update' && result.applied && !dryRun) {
    printLine();
    printLine('PR summary:');
    printLine(`  - Update ca-ai-tools-setup ${result.previousVersion} -> ${result.desiredVersion}`);
    printLine(
      `  - Files: ${result.created.length} created, ${result.updated.length} updated, ` +
        `${result.merged.length} merged, ${result.removed.length} removed`,
    );
  }
}
