import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildPackageRunInvocation, detectPackageRunner } from './package-manager.js';
import { QA_AI_RULES_PACKAGE, type Assistant } from './constants.js';

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
  spawnSync: (
    command: string,
    args?: readonly string[],
    options?: { cwd?: string; stdio?: 'inherit'; shell?: true; env?: NodeJS.ProcessEnv },
  ) => { error?: Error; status?: number | null };
  env: NodeJS.ProcessEnv;
};

const DEFAULT_DEPS: QaAiRulesSetupDeps = {
  existsSync: fs.existsSync,
  detectPackageRunner,
  buildPackageRunInvocation,
  spawnSync,
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

  const result = deps.spawnSync(argv[0], argv.slice(1), {
    cwd: targetDir,
    stdio: 'inherit',
    shell: true,
    env: { ...deps.env },
  });

  if (result.error) {
    return {
      ok: false,
      reason: 'run-failed',
      runnerLabel: label,
      detail: result.error.message,
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      reason: 'run-failed',
      runnerLabel: label,
      detail: `exit code ${result.status ?? 'unknown'}`,
    };
  }

  return { ok: true, runnerLabel: label };
}
