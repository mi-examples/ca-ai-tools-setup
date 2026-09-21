import type { Assistant } from './constants.js';
import { QA_AI_RULES_PACKAGE } from './constants.js';
import {
  resolveFigmaMcpTargets,
  resolvePlaywrightMcpTargets,
  type GenerateResult,
  type FigmaMcpTargets,
  type PlaywrightMcpTargets,
} from './generator.js';
import type { CliMode } from './cli-args.js';
import type { ReconcileAction, ReconcileResult, ReconcileState } from './reconcile.js';
import { getCliPackageProvenance, type CliPackageProvenance } from './setup-log.js';
import type { FileOwnership } from './setup-metadata.js';
import type { QaAiRulesSummaryHook } from './cli-summary.js';

/**
 * Version of the `--json` payload shape. Bump on any breaking change: automated consumers pin
 * against it rather than parsing the human summary, which is free to change at any time. The
 * org-wide rollout in `mi-pp/repo-standards` (PP-4239) is the first such consumer — it reads the
 * arrays below to decide whether to open a pull request and to write that PR's body.
 */
export const CLI_JSON_SCHEMA_VERSION = 1;

/**
 * One file from a reconcile plan, without its content. `ReconcilePlan` carries the full desired
 * and current text of every file; that is megabytes of duplication in a payload whose consumers
 * already have the working tree in front of them, so only the classification crosses the boundary.
 */
export type CliJsonFilePlan = {
  path: string;
  ownership: FileOwnership;
  state: ReconcileState;
  action: ReconcileAction;
  reason?: string;
};

export type CliJsonReconcilePayload = {
  schemaVersion: typeof CLI_JSON_SCHEMA_VERSION;
  ok: true;
  mode: 'check' | 'update';
  targetDir: string;
  cli: CliPackageProvenance;
  dryRun: boolean;
  applied: boolean;
  previousVersion: string;
  desiredVersion: string;
  metadataMigrationRequired: boolean;
  metadataUpdated: boolean;
  hasChanges: boolean;
  hasConflicts: boolean;
  counts: Record<string, number>;
  created: string[];
  updated: string[];
  merged: string[];
  removed: string[];
  preserved: string[];
  unchanged: string[];
  conflicts: string[];
  missing: string[];
  outdated: string[];
  orphaned: string[];
  plan: CliJsonFilePlan[];
  exitCode: 0 | 2;
};

export type CliJsonGeneratePayload = {
  schemaVersion: typeof CLI_JSON_SCHEMA_VERSION;
  ok: true;
  mode: 'generate';
  targetDir: string;
  cli: CliPackageProvenance;
  dryRun: boolean;
  assistants: Assistant[];
  playwrightMcp: PlaywrightMcpTargets;
  figmaMcp: FigmaMcpTargets;
  qaAiRules: {
    enabled: boolean;
    package: typeof QA_AI_RULES_PACKAGE;
    hook: QaAiRulesSummaryHook;
    runner?: string;
  };
  counts: Record<string, number>;
  created: string[];
  skipped: string[];
  overwritten: string[];
  merged: string[];
  migratedLegacy: string[];
  removedLegacy: string[];
  exitCode: 0;
};

/**
 * Stable identifiers for the failures a caller is expected to branch on. `setup-metadata-missing`
 * in particular is not an error condition for an automated rollout — it means "install, do not
 * update" — and distinguishing it from a genuine failure must not require matching on prose.
 */
export type CliJsonErrorCode = 'setup-metadata-missing' | 'setup-metadata-invalid' | 'unknown';

export class CliError extends Error {
  readonly code: CliJsonErrorCode;

  constructor(code: CliJsonErrorCode, message: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
  }
}

export type CliJsonErrorPayload = {
  schemaVersion: typeof CLI_JSON_SCHEMA_VERSION;
  ok: false;
  mode: CliMode;
  error: { code: CliJsonErrorCode; message: string };
  exitCode: 1;
};

export type CliJsonPayload = CliJsonReconcilePayload | CliJsonGeneratePayload | CliJsonErrorPayload;

function countsOf(buckets: Record<string, string[]>): Record<string, number> {
  return Object.fromEntries(Object.entries(buckets).map(([name, paths]) => [name, paths.length]));
}

export function buildReconcileJson(
  targetDir: string,
  result: ReconcileResult,
  dryRun: boolean,
): CliJsonReconcilePayload {
  const buckets = {
    created: result.created,
    updated: result.updated,
    merged: result.merged,
    removed: result.removed,
    preserved: result.preserved,
    unchanged: result.unchanged,
    conflicts: result.conflicts,
    missing: result.missing,
    outdated: result.outdated,
    orphaned: result.orphaned,
  };

  // Mirrors runReconcile()'s exit-code rule exactly — a consumer that reads the payload and one
  // that reads `$?` must never disagree about whether the repository still needs work.
  const pending = (result.mode === 'check' || (result.mode === 'update' && dryRun)) && result.plan.hasChanges;
  const exitCode: 0 | 2 = pending || result.conflicts.length > 0 ? 2 : 0;

  return {
    schemaVersion: CLI_JSON_SCHEMA_VERSION,
    ok: true,
    mode: result.mode,
    targetDir,
    cli: getCliPackageProvenance(),
    dryRun,
    applied: result.applied,
    previousVersion: result.previousVersion,
    desiredVersion: result.desiredVersion,
    metadataMigrationRequired: result.metadataMigrationRequired,
    metadataUpdated: result.metadataUpdated,
    hasChanges: result.plan.hasChanges,
    hasConflicts: result.plan.hasConflicts,
    counts: countsOf(buckets),
    ...buckets,
    plan: result.plan.files.map((file) => ({
      path: file.path,
      ownership: file.ownership,
      state: file.state,
      action: file.action,
      ...(file.reason === undefined ? {} : { reason: file.reason }),
    })),
    exitCode,
  };
}

export function buildGenerateJson(
  targetDir: string,
  assistants: Assistant[],
  playwrightMcpInclude: boolean,
  figmaMcpInclude: boolean,
  qaAiRulesInclude: boolean,
  qaAiRulesHook: QaAiRulesSummaryHook,
  qaAiRulesRunnerLabel: string | undefined,
  result: GenerateResult,
  dryRun: boolean,
): CliJsonGeneratePayload {
  const buckets = {
    created: result.created,
    skipped: result.skipped,
    overwritten: result.overwritten,
    merged: result.merged,
    migratedLegacy: result.migratedLegacy,
    removedLegacy: result.removedLegacy,
  };

  return {
    schemaVersion: CLI_JSON_SCHEMA_VERSION,
    ok: true,
    mode: 'generate',
    targetDir,
    cli: getCliPackageProvenance(),
    dryRun,
    assistants,
    playwrightMcp: resolvePlaywrightMcpTargets(assistants, playwrightMcpInclude),
    figmaMcp: resolveFigmaMcpTargets(assistants, figmaMcpInclude),
    qaAiRules: {
      enabled: qaAiRulesInclude,
      package: QA_AI_RULES_PACKAGE,
      hook: qaAiRulesHook,
      ...(qaAiRulesRunnerLabel === undefined ? {} : { runner: qaAiRulesRunnerLabel }),
    },
    counts: countsOf(buckets),
    ...buckets,
    exitCode: 0,
  };
}

export function buildErrorJson(mode: CliMode, error: unknown): CliJsonErrorPayload {
  return {
    schemaVersion: CLI_JSON_SCHEMA_VERSION,
    ok: false,
    mode,
    error: {
      code: error instanceof CliError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : String(error),
    },
    exitCode: 1,
  };
}

/**
 * The single line of stdout a `--json` run produces. Everything else the CLI would say — clack
 * banners, the prose summary, QA-hook warnings — is suppressed or already on stderr, so stdout
 * stays parseable as one JSON document even when the run fails.
 */
export function writeCliJson(payload: CliJsonPayload): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
