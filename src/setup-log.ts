import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_PREFIX = '[ca-ai-tools-setup]';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Enable verbose diagnostics (`setupLog`, spawn traces). */
export function isSetupDebugEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const dedicated = env.CA_AI_TOOLS_SETUP_DEBUG?.trim().toLowerCase();

  if (dedicated) {
    if (TRUTHY.has(dedicated)) {
      return true;
    }

    if (dedicated === '0' || dedicated === 'false' || dedicated === 'off') {
      return false;
    }
  }

  const debug = env.DEBUG?.trim();

  if (!debug) {
    return false;
  }

  if (debug === '*' || TRUTHY.has(debug.toLowerCase())) {
    return true;
  }

  return debug.split(/[,\s]+/).some((part) => {
    const token = part.trim();

    return token === 'ca-ai-tools-setup' || token === '*';
  });
}

/** Diagnostic lines on stderr (only when {@link isSetupDebugEnabled}). */
export function setupLog(message: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isSetupDebugEnabled(env)) {
    return;
  }

  console.warn(`${LOG_PREFIX} ${message}`);
}

export function createSetupDebugLogger(env: NodeJS.ProcessEnv = process.env): ((message: string) => void) | undefined {
  if (!isSetupDebugEnabled(env)) {
    return undefined;
  }

  return (message) => setupLog(message, env);
}

let cachedVersion: string | undefined;
let cachedProvenance: CliPackageProvenance | undefined;

export type CliPackageProvenance = {
  package: string;
  version: string;
  releaseCommit: string;
  templateRevision: string;
};

type PackageMetadata = {
  name?: string;
  version?: string;
  gitHead?: string;
};

type ReleaseMetadata = {
  releaseCommit?: string;
};

function readPackageMetadata(): PackageMetadata {
  const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');

  return JSON.parse(readFileSync(packagePath, 'utf8')) as PackageMetadata;
}

/** Best-effort CLI version from package.json next to dist/. */
export function getCliPackageVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  try {
    const pkg = readPackageMetadata();

    cachedVersion = pkg.version ?? 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }

  return cachedVersion;
}

/** Stable package and release identity recorded in generated setup metadata. */
export function getCliPackageProvenance(): CliPackageProvenance {
  if (cachedProvenance !== undefined) {
    return cachedProvenance;
  }

  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = readPackageMetadata();
    let release: ReleaseMetadata = {};

    try {
      release = JSON.parse(readFileSync(path.join(moduleDir, 'release-info.json'), 'utf8')) as ReleaseMetadata;
    } catch {
      // Source builds do not have release-info.json; package metadata remains a deterministic fallback.
    }

    const packageName = pkg.name ?? '@metricinsights/ca-ai-tools-setup';
    const version = pkg.version ?? 'unknown';
    const releaseCommit = release.releaseCommit ?? pkg.gitHead ?? 'unknown';

    cachedProvenance = {
      package: packageName,
      version,
      releaseCommit,
      templateRevision: releaseCommit === 'unknown' ? `${packageName}@${version}` : releaseCommit,
    };
  } catch {
    cachedProvenance = {
      package: '@metricinsights/ca-ai-tools-setup',
      version: 'unknown',
      releaseCommit: 'unknown',
      templateRevision: '@metricinsights/ca-ai-tools-setup@unknown',
    };
  }

  return cachedProvenance;
}
