import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_PREFIX = '[ca-ai-tools-setup]';

/** Diagnostic lines on stderr so they stay visible alongside @clack/prompts UI. */
export function setupLog(message: string): void {
  console.warn(`${LOG_PREFIX} ${message}`);
}

export function setupLogError(message: string): void {
  console.error(`${LOG_PREFIX} ${message}`);
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
