import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPackageRunInvocation,
  describeSpawnPackageArgv,
  detectPackageRunner,
  spawnPackageArgv,
  type SpawnPackageArgvOptions,
} from './package-manager.js';
import { QA_AI_RULES_PACKAGE, type Assistant } from './constants.js';
import { getCliPackageVersion, setupLog, setupLogError } from './setup-log.js';

export type QaAiRulesSetupResult =
  | { ok: true; runnerLabel: string }
  | {
      ok: false;
      reason: 'no-package-json' | 'no-assistant-for-rules' | 'run-failed';
      detail?: string;
      runnerLabel?: string;
    };

type QaAiRulesSetupDeps = {
  existsSync: typeof fs.existsSync;
  detectPackageRunner: typeof detectPackageRunner;
  buildPackageRunInvocation: typeof buildPackageRunInvocation;
  spawnPackageArgv: (
    argv: readonly string[],
    options: SpawnPackageArgvOptions,
  ) => { error?: Error; status?: number | null };
  env: NodeJS.ProcessEnv;
};

const DEFAULT_DEPS: QaAiRulesSetupDeps = {
  existsSync: fs.existsSync,
  detectPackageRunner,
  buildPackageRunInvocation,
  spawnPackageArgv: (argv, options) => {
    const result = spawnPackageArgv(argv, { ...options, log: setupLog });

    return { error: result.error, status: result.status };
  },
  env: process.env,
};

/** Flags passed to `qa-ai-rules init` (must match selected assistants). */
export function buildQaAiRulesInitArgs(assistants: Assistant[]): string[] {
  const args: string[] = [];

  if (assistants.includes('cursor')) {
    args.push('--cursor');
  }

  if (assistants.includes('claude')) {
    args.push('--claude');
  }

  return args;
}

/**
 * Runs `qa-ai-rules init` in `targetDir` using the detected package manager
 * (`npx` / `pnpm dlx` / `yarn dlx` / `bunx`) so it matches pnpm, Yarn Berry, Bun, or npm projects.
 */
export function runQaAiRulesSetup(targetDir: string, assistants: Assistant[]): QaAiRulesSetupResult {
  return runQaAiRulesSetupWithDeps(targetDir, assistants, DEFAULT_DEPS);
}

export function runQaAiRulesSetupWithDeps(
  targetDir: string,
  assistants: Assistant[],
  deps: QaAiRulesSetupDeps,
): QaAiRulesSetupResult {
  const pkgPath = path.join(targetDir, 'package.json');

  if (!deps.existsSync(pkgPath)) {
    return { ok: false, reason: 'no-package-json' };
  }

  const toolFlags = buildQaAiRulesInitArgs(assistants);

  if (toolFlags.length === 0) {
    return { ok: false, reason: 'no-assistant-for-rules' };
  }

  const runnerId = deps.detectPackageRunner(targetDir);
  const { argv, label } = deps.buildPackageRunInvocation(runnerId, QA_AI_RULES_PACKAGE, ['init', ...toolFlags]);
  const targetAbs = path.resolve(targetDir);
  const spawnPlan = describeSpawnPackageArgv(argv, targetAbs);

  setupLog(
    `QA AI rules: v${getCliPackageVersion()} node=${process.version} module=${fileURLToPath(import.meta.url)}`,
  );
  setupLog(`QA AI rules: target=${targetAbs} runner=${runnerId} (${label}) package=${QA_AI_RULES_PACKAGE}`);
  setupLog(`QA AI rules: init flags=${toolFlags.join(' ') || '(none)'}`);
  setupLog(`QA AI rules: argv=${JSON.stringify(argv)} spawn=${spawnPlan.method}`);

  const result = deps.spawnPackageArgv(argv, {
    cwd: targetAbs,
    stdio: 'inherit',
    env: { ...deps.env },
  });

  if (result.error) {
    setupLogError(`QA AI rules: failed to start ${label} — ${result.error.message}`);
    setupLogError(
      'QA AI rules: if the error mentions "metricinsights", Windows parsed @scope incorrectly — use npm exec --package=…',
    );

    return {
      ok: false,
      reason: 'run-failed',
      runnerLabel: label,
      detail: result.error.message,
    };
  }

  if (result.status !== 0) {
    setupLogError(`QA AI rules: ${label} exited with code ${result.status ?? 'unknown'}`);
    setupLogError(`QA AI rules: re-run manually in the target repo: ${argv.join(' ')}`);

    return {
      ok: false,
      reason: 'run-failed',
      runnerLabel: label,
      detail: `exit code ${result.status ?? 'unknown'}`,
    };
  }

  setupLog(`QA AI rules: ${label} completed successfully`);

  return { ok: true, runnerLabel: label };
}
