import fs from 'node:fs';
import path from 'node:path';
import type { Assistant } from './constants.js';
import type { GeneratedFile } from './generators/types.js';
import { generatedMcpServerDefinitions } from './generators/mcp.js';
import {
  hasNoMcpServers,
  isMcpConfigPath,
  isMergeablePath,
  mcpServerNames,
  mergeFile,
  pruneRetiredClaudeSettings,
  pruneRetiredMcpServers,
} from './mcp-json-merge.js';
import {
  createSetupMetadata,
  hashContent,
  isSafeSetupPath,
  type FileOwnership,
  type LoadedSetupMetadata,
  normalizeSetupPath,
  ownershipForPath,
  serializeSetupMetadata,
  SETUP_METADATA_PATH,
  type SetupFileRecord,
  type SetupMetadata,
} from './setup-metadata.js';
import { getCliPackageProvenance } from './setup-log.js';
import {
  REMOVABLE_LEGACY_SETUP_PATHS,
  removeEmptyParentDirs,
  resolveFigmaMcpTargets,
  resolvePlaywrightMcpTargets,
} from './generator.js';

/**
 * Repository-owned files that are merged into, never replaced — not by --force either. Mirrors
 * ALWAYS_MERGED_PATHS in generator.ts: AGENTS.md carries repository-authored rows, .gitignore
 * carries the team's own ignore rules, and overwriting either would be a real regression.
 */
const ALWAYS_MERGED_PATHS = new Set(['AGENTS.md', '.gitignore']);

export type ReconcileState = 'clean' | 'missing' | 'outdated' | 'modified' | 'conflict' | 'preserved' | 'orphaned';

export type ReconcileAction = 'none' | 'create' | 'overwrite' | 'merge' | 'remove';

export type ReconcileFilePlan = {
  path: string;
  ownership: FileOwnership;
  state: ReconcileState;
  action: ReconcileAction;
  reason?: string;
  desiredContent?: string;
  currentContent?: string;
  /**
   * Exact content the file holds once `action` is applied — set for every create, overwrite and
   * merge. It differs from `desiredContent` whenever repository content survives: a merge, or a
   * structured file that only loses its generated entries.
   */
  resultContent?: string;
  previous?: SetupFileRecord;
};

export type ReconcilePlan = {
  files: ReconcileFilePlan[];
  metadataMigrationRequired: boolean;
  metadataOutdated: boolean;
  hasChanges: boolean;
  hasConflicts: boolean;
};

export type ReconcileConfiguration = {
  assistants: Assistant[];
  playwrightMcpInclude: boolean;
  figmaMcpInclude: boolean;
  qaAiRulesInclude: boolean;
};

export type ReconcileOptions = ReconcileConfiguration & {
  targetDir: string;
  files: GeneratedFile[];
  metadata: LoadedSetupMetadata;
  force: boolean;
  dryRun: boolean;
};

export type ReconcileResult = {
  mode: 'check' | 'update';
  applied: boolean;
  metadataMigrationRequired: boolean;
  metadataUpdated: boolean;
  previousVersion: string;
  desiredVersion: string;
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
  plan: ReconcilePlan;
};

function readCurrentFile(targetDir: string, filePath: string): string | undefined {
  const destination = path.join(targetDir, filePath);

  return fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8') : undefined;
}

function desiredSetupFiles(files: GeneratedFile[]): GeneratedFile[] {
  const desiredFiles = files
    .filter((file) => normalizeSetupPath(file.path) !== SETUP_METADATA_PATH)
    .map((file) => ({ ...file, path: normalizeSetupPath(file.path) }))
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const file of desiredFiles) {
    if (!isSafeSetupPath(file.path)) {
      throw new Error(`Generated setup path is unsafe: ${file.path}`);
    }
  }

  return desiredFiles;
}

const CURSOR_MCP_PATH = '.cursor/mcp.json';
const ROOT_MCP_PATH = '.mcp.json';
const CLAUDE_SETTINGS_PATH = '.claude/settings.json';

/** Drops from a structured file what the generator wrote earlier and no longer generates. */
type RetiredEntryPruner = (filePath: string, content: string) => string;

/**
 * A semantic merge only ever adds, so a server the generator stops writing would stay in
 * `.mcp.json`, `.cursor/mcp.json` and `.claude/settings.json` forever. The recorded configuration
 * says which servers the previous setup wrote into each file; whatever is on that list and not in
 * the new output is retired and removed before the merge. An entry the repository changed — or a
 * server of its own that merely shares the name — is left alone.
 */
function createRetiredEntryPruner(
  targetDir: string,
  previousMetadata: SetupMetadata | undefined,
  desiredFiles: readonly GeneratedFile[],
): RetiredEntryPruner {
  if (!previousMetadata) {
    return (_filePath, content) => content;
  }

  const definitions = generatedMcpServerDefinitions();
  const desiredServers = (filePath: string): Set<string> =>
    new Set(mcpServerNames(desiredFiles.find((file) => file.path === filePath)?.content ?? ''));
  const generatedBefore = { playwright: previousMetadata.playwrightMcp, figma: previousMetadata.figmaMcp };
  const retiredServers = (filePath: string): string[] => {
    const target = filePath === CURSOR_MCP_PATH ? 'cursorFile' : 'projectRootFile';
    const stillGenerated = desiredServers(filePath === CLAUDE_SETTINGS_PATH ? ROOT_MCP_PATH : filePath);

    return Object.entries(generatedBefore)
      .filter(([name, targets]) => targets[target] && !stillGenerated.has(name))
      .map(([name]) => name);
  };
  const pruneMcp = (filePath: string, content: string): string =>
    pruneRetiredMcpServers(
      content,
      Object.fromEntries(retiredServers(filePath).map((name) => [name, definitions[name]])),
    );

  return (filePath, content) => {
    if (isMcpConfigPath(filePath)) {
      return pruneMcp(filePath, content);
    }

    if (filePath !== CLAUDE_SETTINGS_PATH) {
      return content;
    }

    // Settings only lose a server that is really gone from `.mcp.json`: a repository-owned entry
    // under the same name survives the pruning there and still needs to be enabled here.
    const remaining = new Set([
      ...mcpServerNames(pruneMcp(ROOT_MCP_PATH, readCurrentFile(targetDir, ROOT_MCP_PATH) ?? '')),
      ...desiredServers(ROOT_MCP_PATH),
    ]);

    return pruneRetiredClaudeSettings(
      content,
      retiredServers(filePath).filter((name) => !remaining.has(name)),
    );
  };
}

/** A tracked file that is still exactly what the generator wrote, with no repository content in it. */
function isUntouchedGeneratedFile(content: string, record: SetupFileRecord): boolean {
  return record.baseline === 'generated' && hashContent(content) === record.contentHash;
}

/** Plan for a tracked file that this release no longer generates. */
function orphanPlan(
  filePath: string,
  currentContent: string,
  previous: SetupFileRecord,
  force: boolean,
  prune: RetiredEntryPruner,
): ReconcileFilePlan {
  const base = {
    path: filePath,
    ownership: previous.ownership,
    state: 'orphaned' as const,
    currentContent,
    previous,
  };

  // Repository-owned by definition: it is never removed, it only stops being tracked.
  if (previous.ownership === 'protected') {
    return {
      ...base,
      action: 'none',
      reason: 'Protected file is no longer generated; it stays as a repository-owned file.',
    };
  }

  if (isUntouchedGeneratedFile(currentContent, previous)) {
    return { ...base, action: 'remove', reason: 'File is no longer produced by this release.' };
  }

  const unchanged = hashContent(currentContent) === previous.contentHash;

  if (previous.ownership === 'structured') {
    // Unchanged since the generator last wrote it, so the generated entries are still the ones it
    // put there and can go without asking; the repository's own entries stay.
    if (!unchanged && !force) {
      return {
        ...base,
        state: 'conflict',
        action: 'none',
        reason: 'Obsolete file has local changes; remove it or rerun with --force to drop only the generated entries.',
      };
    }

    const pruned = prune(filePath, currentContent);

    if (isMcpConfigPath(filePath) && hasNoMcpServers(pruned)) {
      return { ...base, action: 'remove', reason: 'Only generated entries were left in this file.' };
    }

    return pruned === currentContent
      ? { ...base, action: 'none', reason: 'File is no longer generated; it stays as a repository-owned file.' }
      : {
          ...base,
          action: 'overwrite',
          resultContent: pruned,
          reason: 'Generated entries removed; the rest stays as a repository-owned file.',
        };
  }

  if (force) {
    return { ...base, action: 'remove', reason: 'Obsolete managed file removed with --force.' };
  }

  return {
    ...base,
    state: 'conflict',
    action: 'none',
    reason: unchanged
      ? 'Obsolete file holds content adopted from the repository; remove it or rerun with --force.'
      : 'Obsolete file has local changes; remove it or rerun with --force.',
  };
}

function collisionPlan(
  file: GeneratedFile,
  currentContent: string,
  previous: SetupFileRecord | undefined,
  force: boolean,
  metadataIsLegacy: boolean,
  prune: RetiredEntryPruner,
): ReconcileFilePlan {
  const ownership = ownershipForPath(file.path);
  const currentHash = hashContent(currentContent);
  const desiredHash = hashContent(file.content);
  const mergePlan = (reason: string): ReconcileFilePlan => ({
    path: file.path,
    ownership,
    state: 'modified',
    action: 'merge',
    reason,
    desiredContent: file.content,
    currentContent,
    previous,
  });

  if (!previous) {
    if (currentHash === desiredHash) {
      return {
        path: file.path,
        ownership,
        state: 'clean',
        action: 'none',
        desiredContent: file.content,
        currentContent,
      };
    }

    if (ALWAYS_MERGED_PATHS.has(file.path)) {
      return mergePlan(`Existing ${file.path} will be preserved while missing generated entries are added.`);
    }

    if (ownership === 'protected') {
      return {
        path: file.path,
        ownership,
        state: 'preserved',
        action: 'none',
        reason: metadataIsLegacy
          ? 'Protected file adopted while migrating schema 5 metadata.'
          : 'Existing protected file was adopted without replacement.',
        desiredContent: file.content,
        currentContent,
      };
    }

    return {
      path: file.path,
      ownership,
      state: force ? 'modified' : 'conflict',
      action: force ? 'overwrite' : 'none',
      reason: metadataIsLegacy
        ? 'Existing content cannot be verified against schema 5 metadata.'
        : 'Existing content has no generated baseline.',
      desiredContent: file.content,
      currentContent,
    };
  }

  if (currentHash !== previous.contentHash) {
    if (ALWAYS_MERGED_PATHS.has(file.path)) {
      return mergePlan(`Repository changes in ${file.path} will be preserved during the generated merge.`);
    }

    if (ownership === 'protected') {
      return {
        path: file.path,
        ownership,
        state: 'modified',
        action: 'none',
        reason: 'Protected file contains repository-owned changes.',
        desiredContent: file.content,
        currentContent,
        previous,
      };
    }

    return {
      path: file.path,
      ownership,
      state: force ? 'modified' : 'conflict',
      action: force ? 'overwrite' : 'none',
      reason: 'File differs from its recorded generated baseline.',
      desiredContent: file.content,
      currentContent,
      previous,
    };
  }

  if (previous.baseline !== 'adopted' && previous.sourceHash === desiredHash) {
    return {
      path: file.path,
      ownership,
      state: 'clean',
      action: 'none',
      desiredContent: file.content,
      currentContent,
      previous,
    };
  }

  if (ALWAYS_MERGED_PATHS.has(file.path) && previous.baseline === 'adopted' && currentHash !== desiredHash) {
    return mergePlan(`Adopted ${file.path} content will be preserved during the generated merge.`);
  }

  if (previous.baseline === 'adopted' && currentHash !== desiredHash && ownership !== 'protected') {
    return {
      path: file.path,
      ownership,
      state: force ? 'modified' : 'conflict',
      action: force ? 'overwrite' : 'none',
      reason: 'Adopted content has no verified generated baseline.',
      desiredContent: file.content,
      currentContent,
      previous,
    };
  }

  if (currentHash === desiredHash) {
    return {
      path: file.path,
      ownership,
      state: 'clean',
      action: 'none',
      desiredContent: file.content,
      currentContent,
      previous,
    };
  }

  if (ownership === 'protected') {
    return {
      path: file.path,
      ownership,
      state: 'preserved',
      action: 'none',
      reason: 'Protected file is preserved; review the new template separately.',
      desiredContent: file.content,
      currentContent,
      previous,
    };
  }

  if (ownership === 'structured' && isMergeablePath(file.path)) {
    return {
      path: file.path,
      ownership,
      state: 'outdated',
      action: 'merge',
      desiredContent: file.content,
      currentContent,
      resultContent: mergeFile(file.path, prune(file.path, currentContent), file.content),
      previous,
    };
  }

  return {
    path: file.path,
    ownership,
    state: 'outdated',
    action: 'overwrite',
    desiredContent: file.content,
    currentContent,
    previous,
  };
}

export function buildReconcilePlan(options: ReconcileOptions): ReconcilePlan {
  if (options.metadata.kind === 'missing') {
    throw new Error(`Setup metadata not found: ${SETUP_METADATA_PATH}. Run the initial setup first.`);
  }

  if (options.metadata.kind === 'invalid') {
    throw new Error(`Invalid setup metadata: ${options.metadata.detail}`);
  }

  const metadataIsLegacy = options.metadata.kind === 'legacy';
  const previousMetadata = options.metadata.kind === 'current' ? options.metadata.metadata : undefined;
  const desiredFiles = desiredSetupFiles(options.files);
  const desiredPaths = new Set(desiredFiles.map((file) => file.path));
  const prune = createRetiredEntryPruner(options.targetDir, previousMetadata, desiredFiles);
  const plans: ReconcileFilePlan[] = [];

  for (const file of desiredFiles) {
    const currentContent = readCurrentFile(options.targetDir, file.path);
    const previous = previousMetadata?.files[file.path];

    if (currentContent === undefined) {
      plans.push({
        path: file.path,
        ownership: ownershipForPath(file.path),
        state: 'missing',
        action: 'create',
        desiredContent: file.content,
        previous,
      });
      continue;
    }

    plans.push(collisionPlan(file, currentContent, previous, options.force, metadataIsLegacy, prune));
  }

  if (previousMetadata) {
    for (const [filePath, previous] of Object.entries(previousMetadata.files)) {
      if (desiredPaths.has(filePath)) {
        continue;
      }

      const currentContent = readCurrentFile(options.targetDir, filePath);

      if (currentContent === undefined) {
        continue;
      }

      plans.push(orphanPlan(filePath, currentContent, previous, options.force, prune));
    }
  }

  // Every write carries the exact content it produces, so the write and the metadata that records
  // it can never disagree about what ended up on disk.
  for (const filePlan of plans) {
    if (filePlan.resultContent !== undefined) {
      continue;
    }

    if (filePlan.action === 'create' || filePlan.action === 'overwrite') {
      filePlan.resultContent = filePlan.desiredContent ?? '';
    } else if (filePlan.action === 'merge') {
      filePlan.resultContent = mergeFile(filePlan.path, filePlan.currentContent ?? '', filePlan.desiredContent ?? '');
    }
  }

  if (metadataIsLegacy) {
    const plannedPaths = new Set(plans.map((file) => file.path));

    for (const legacyPath of REMOVABLE_LEGACY_SETUP_PATHS) {
      if (plannedPaths.has(legacyPath) || !fs.existsSync(path.join(options.targetDir, legacyPath))) {
        continue;
      }

      plans.push({
        path: legacyPath,
        ownership: 'managed',
        state: options.force ? 'orphaned' : 'conflict',
        action: options.force ? 'remove' : 'none',
        reason: 'Legacy generated file has no schema 6 hash baseline.',
        currentContent: readCurrentFile(options.targetDir, legacyPath),
      });
    }
  }

  plans.sort((left, right) => left.path.localeCompare(right.path));

  const provenance = getCliPackageProvenance();
  const metadataOutdated =
    previousMetadata !== undefined &&
    (previousMetadata.provenance.version !== provenance.version ||
      previousMetadata.provenance.templateRevision !== provenance.templateRevision);
  const metadataMigrationRequired = metadataIsLegacy;
  const hasConflicts = plans.some((file) => file.state === 'conflict');
  const hasChanges =
    metadataMigrationRequired ||
    metadataOutdated ||
    plans.some((file) => file.action !== 'none' || file.state === 'conflict' || file.state === 'orphaned');

  return {
    files: plans,
    metadataMigrationRequired,
    metadataOutdated,
    hasChanges,
    hasConflicts,
  };
}

function resultFromPlan(
  mode: 'check' | 'update',
  plan: ReconcilePlan,
  options: ReconcileOptions,
  applied: boolean,
  metadataUpdated: boolean,
): ReconcileResult {
  const previousVersion =
    options.metadata.kind === 'current'
      ? options.metadata.metadata.provenance.version
      : options.metadata.kind === 'legacy'
        ? 'schema-5'
        : 'unknown';
  const desiredVersion = getCliPackageProvenance().version;
  const byAction = (action: ReconcileAction): string[] =>
    plan.files.filter((file) => file.action === action).map((file) => file.path);
  const byState = (state: ReconcileState): string[] =>
    plan.files.filter((file) => file.state === state).map((file) => file.path);

  return {
    mode,
    applied,
    metadataMigrationRequired: plan.metadataMigrationRequired,
    metadataUpdated,
    previousVersion,
    desiredVersion,
    created: byAction('create'),
    updated: byAction('overwrite'),
    merged: byAction('merge'),
    removed: byAction('remove'),
    // A file belongs here only if its repository-owned content actually survives the run. Under
    // --force a modified managed file is planned as state 'modified' + action 'overwrite', so
    // filtering on state alone reported a file as preserved in the same run that replaced it —
    // and the human summary printed it under "repository-owned files preserved". 'merge' stays:
    // AGENTS.md keeps its repository content and only gains the missing generated rows.
    preserved: plan.files
      .filter(
        (file) =>
          (file.state === 'preserved' || file.state === 'modified') &&
          file.action !== 'overwrite' &&
          file.action !== 'remove',
      )
      .map((file) => file.path),
    unchanged: byState('clean'),
    conflicts: byState('conflict'),
    missing: byState('missing'),
    outdated: byState('outdated'),
    orphaned: byState('orphaned'),
    plan,
  };
}

export function checkSetup(options: Omit<ReconcileOptions, 'dryRun'>): ReconcileResult {
  const reconcileOptions = { ...options, dryRun: true };
  const plan = buildReconcilePlan(reconcileOptions);

  return resultFromPlan('check', plan, reconcileOptions, false, false);
}

function writeFile(targetDir: string, filePath: string, content: string): void {
  const destination = path.join(targetDir, filePath);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, 'utf8');
}

function buildUpdatedMetadata(options: ReconcileOptions, plan: ReconcilePlan) {
  const desiredFiles = desiredSetupFiles(options.files);
  const installedContent = new Map<string, string>();
  const planByPath = new Map(plan.files.map((filePlan) => [filePlan.path, filePlan]));

  for (const file of desiredFiles) {
    const filePlan = planByPath.get(file.path);

    if (!filePlan) {
      continue;
    }

    installedContent.set(file.path, filePlan.resultContent ?? filePlan.currentContent ?? file.content);
  }

  const metadata = createSetupMetadata(
    {
      assistants: options.assistants,
      playwrightMcp: resolvePlaywrightMcpTargets(options.assistants, options.playwrightMcpInclude),
      figmaMcp: resolveFigmaMcpTargets(options.assistants, options.figmaMcpInclude),
      qaAiRulesEnabled: options.qaAiRulesInclude,
    },
    desiredFiles,
    installedContent,
  );

  // An obsolete file that stays on disk is not recorded again. By now it is either protected or a
  // structured file holding only repository entries, so it is the repository's own from here on;
  // tracking it further would keep `check` at exit code 2 for a file nobody is going to change.
  for (const filePlan of plan.files) {
    const record = metadata.files[filePlan.path];

    if (!record) {
      continue;
    }

    if (filePlan.action === 'merge') {
      record.baseline = 'merged';
    } else if (filePlan.state === 'preserved' || filePlan.state === 'modified') {
      record.baseline = 'adopted';
    } else if (filePlan.state === 'clean' && filePlan.previous?.baseline === 'merged') {
      // `merged` has to survive a run that changes nothing, or update stops being idempotent.
      // createSetupMetadata() recomputes every baseline as generated/adopted from the content
      // hashes alone, and merged content never equals the generated source — so without this a
      // clean, already-merged AGENTS.md silently downgrades to `adopted`. collisionPlan() then
      // matches its `baseline === 'adopted' && currentHash !== desiredHash` rule and plans the
      // merge again, so `check` reports pending changes on a repository nothing touched. Observed
      // as an adopted/merged oscillation on mi-pp/report-cleanup (2026-09-21), where it failed
      // the org rollout's post-update validation.
      record.baseline = 'merged';
    }
  }

  return metadata;
}

export function updateSetup(options: ReconcileOptions): ReconcileResult {
  const plan = buildReconcilePlan(options);

  if (plan.hasConflicts) {
    return resultFromPlan('update', plan, options, false, false);
  }

  if (!options.dryRun) {
    for (const filePlan of plan.files) {
      if (filePlan.action === 'create' || filePlan.action === 'overwrite' || filePlan.action === 'merge') {
        writeFile(options.targetDir, filePlan.path, filePlan.resultContent ?? '');
      } else if (filePlan.action === 'remove') {
        const destination = path.join(options.targetDir, filePlan.path);

        fs.rmSync(destination, { force: true });
        removeEmptyParentDirs(options.targetDir, destination);
      }
    }
  }

  const updatedMetadata = buildUpdatedMetadata(options, plan);
  const serializedMetadata = serializeSetupMetadata(updatedMetadata);
  const currentMetadata =
    options.metadata.kind === 'current' ? serializeSetupMetadata(options.metadata.metadata) : undefined;
  const metadataUpdated = serializedMetadata !== currentMetadata;

  if (!options.dryRun && metadataUpdated) {
    writeFile(options.targetDir, SETUP_METADATA_PATH, serializedMetadata);
  }

  return resultFromPlan('update', plan, options, !options.dryRun, metadataUpdated);
}
