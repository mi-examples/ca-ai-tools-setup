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

export function createSetupDebugLogger(
  env: NodeJS.ProcessEnv = process.env,
): ((message: string) => void) | undefined {
  if (!isSetupDebugEnabled(env)) {
    return undefined;
  }

  return (message) => setupLog(message, env);
}

let cachedVersion: string | undefined;

/** Best-effort CLI version from package.json next to dist/. */
export function getCliPackageVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  try {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };

    cachedVersion = pkg.version ?? 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }

  return cachedVersion;
}
