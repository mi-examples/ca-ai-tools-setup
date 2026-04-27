import path from 'node:path';

/**
 * CLI repo root: current working directory, or an explicit `--target` resolved from cwd.
 * Relative targets are resolved against `cwd`; absolute targets override as per `path.resolve`.
 */
export function resolveCliRepoRoot(rawTarget: string | undefined, cwd: string): string {
  const resolvedCwd = path.resolve(cwd);
  const trimmed = rawTarget?.trim();
  if (!trimmed) {
    return resolvedCwd;
  }
  return path.resolve(resolvedCwd, trimmed);
}
