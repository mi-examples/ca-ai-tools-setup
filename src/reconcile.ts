import fs from 'node:fs';
import path from 'node:path';
import type { Assistant } from './constants.js';
import type { GeneratedFile } from './generators/types.js';
import { isMergeablePath, mergeFile } from './mcp-json-merge.js';
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
} from './setup-metadata.js';
import { getCliPackageProvenance } from './setup-log.js';
import { REMOVABLE_LEGACY_SETUP_PATHS, resolveFigmaMcpTargets, resolvePlaywrightMcpTargets } from './generator.js';

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

function collisionPlan(
  file: GeneratedFile,
  currentContent: string,
  previous: SetupFileRecord | undefined,
  force: boolean,
  metadataIsLegacy: boolean,
): ReconcileFilePlan {
  const ownership = ownershipForPath(file.path);
  const currentHash = hashContent(currentContent);
  const desiredHash = hashContent(file.content);
  const agentsMergePlan = (reason: string): ReconcileFilePlan => ({
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

    if (file.path === 'AGENTS.md') {
      return agentsMergePlan('Existing AGENTS.md will be preserved while missing generated rows are added.');
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
    if (file.path === 'AGENTS.md') {
      return agentsMergePlan('Repository changes in AGENTS.md will be preserved during the generated row merge.');
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

  if (file.path === 'AGENTS.md' && previous.baseline === 'adopted' && currentHash !== desiredHash) {
    return agentsMergePlan('Adopted AGENTS.md content will be preserved during the generated row merge.');
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

    plans.push(collisionPlan(file, currentContent, previous, options.force, metadataIsLegacy));
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

      const unchanged = hashContent(currentContent) === previous.contentHash;
      const removable = previous.ownership === 'managed' && unchanged;

      plans.push({
        path: filePath,
        ownership: previous.ownership,
        state: 'orphaned',
        action: removable ? 'remove' : 'none',
        reason: removable
          ? 'Managed file is no longer produced by this release.'
          : 'Obsolete file was preserved because it is protected or differs from its generated baseline.',
        currentContent,
        previous,
      });
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
    preserved: plan.files
      .filter((file) => file.state === 'preserved' || file.state === 'modified')
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

    let finalContent: string;

    if (filePlan.action === 'create' || filePlan.action === 'overwrite') {
      finalContent = file.content;
    } else if (filePlan.action === 'merge') {
      finalContent = mergeFile(file.path, filePlan.currentContent ?? '', file.content);
    } else {
      finalContent = filePlan.currentContent ?? file.content;
    }

    installedContent.set(file.path, finalContent);
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

  for (const filePlan of plan.files) {
    const record = metadata.files[filePlan.path];

    if (!record) {
      continue;
    }

    if (filePlan.action === 'merge') {
      record.baseline = 'merged';
    } else if (filePlan.state === 'preserved' || filePlan.state === 'modified') {
      record.baseline = 'adopted';
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
      if (filePlan.action === 'create' || filePlan.action === 'overwrite') {
        writeFile(options.targetDir, filePlan.path, filePlan.desiredContent ?? '');
      } else if (filePlan.action === 'merge') {
        writeFile(
          options.targetDir,
          filePlan.path,
          mergeFile(filePlan.path, filePlan.currentContent ?? '', filePlan.desiredContent ?? ''),
        );
      } else if (filePlan.action === 'remove') {
        fs.rmSync(path.join(options.targetDir, filePlan.path), { force: true });
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
