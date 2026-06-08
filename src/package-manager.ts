import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { QA_AI_RULES_CLI } from './constants.js';

/** Tools we know how to invoke for one-shot package runs (`dlx` / `npx`-style). */
export type PackageRunnerId = 'npm' | 'pnpm' | 'yarn-dlx' | 'bun';

export type PackageRunInvocation = {
  runner: PackageRunnerId;
  /** argv for spawnPackageArgv (e.g. `npx`, `--yes`, package name, forwarded args) */
  argv: string[];
  /** Short label for logs, e.g. `pnpm dlx` */
  label: string;
};

/** Quote one argument for `cmd.exe /d /s /c` (`@` is special in cmd — breaks scoped package names). */
export function quoteWindowsCmdArgument(arg: string): string {
  if (/[\s"&|<>^()%]/.test(arg) || arg.startsWith('@')) {
    return `"${arg.replace(/"/g, '""')}"`;
  }

  return arg;
}

export function buildWindowsCmdCommandLine(argv: readonly string[]): string {
  return argv.map(quoteWindowsCmdArgument).join(' ');
}

/** Wrap the full line for `cmd.exe /d /s /c` (outer quotes stripped by `/s`). */
export function buildWindowsCmdSpawnArgument(argv: readonly string[]): string {
  const line = buildWindowsCmdCommandLine(argv);

  return `"${line.replace(/"/g, '""')}"`;
}

/** True when an argv element is a scoped package name (`@scope/pkg`) — unsafe for cmd unless quoted in a flag value. */
export function hasBareScopedPackageArg(argv: readonly string[]): boolean {
  return argv.some((arg) => arg.startsWith('@'));
}

/** argv safe for `shell: true` / cmd (no bare `@scope` tokens; use `npm exec --package=` instead of `npx @scope`). */
export function isCmdSafeArgv(argv: readonly string[]): boolean {
  return !hasBareScopedPackageArg(argv);
}

/**
 * Resolve `npm` / `npx` / … to a concrete `.cmd` on Windows for `spawn` with `shell: false`.
 * Node does not always apply PATHEXT when the command has no extension (ENOENT).
 */
export function resolveWindowsExecutable(command: string, env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform !== 'win32') {
    return command;
  }

  if (path.isAbsolute(command) || path.extname(command)) {
    return command;
  }

  const pathVar = env.PATH ?? env.Path ?? '';
  const pathExt = (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD;').split(';').filter((ext) => ext.length > 0);

  for (const dir of pathVar.split(path.delimiter)) {
    if (!dir) {
      continue;
    }

    const base = path.join(dir, command);

    if (fs.existsSync(base)) {
      return base;
    }

    for (const ext of pathExt) {
      const candidate = base + ext;

      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return command;
}

export type SpawnPackageArgvPlan = {
  platform: NodeJS.Platform;
  method: 'win32-shell-safe' | 'win32-direct' | 'posix-spawn';
  argv: readonly string[];
  cwd: string;
  /** Present when method is win32-shell-safe. */
  shellCommandLine?: string;
};

export function describeSpawnPackageArgv(argv: readonly string[], cwd: string): SpawnPackageArgvPlan {
  if (process.platform === 'win32' && isCmdSafeArgv(argv)) {
    return {
      platform: process.platform,
      method: 'win32-shell-safe',
      argv,
      cwd,
      shellCommandLine: buildWindowsCmdCommandLine(argv),
    };
  }

  return {
    platform: process.platform,
    method: process.platform === 'win32' ? 'win32-direct' : 'posix-spawn',
    argv,
    cwd,
  };
}

function isWindowsSpawnEinval(error: Error | undefined): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'EINVAL';
}

function isWindowsSpawnEnoent(error: Error | undefined): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

export function isNpmExecArgv(argv: readonly string[]): boolean {
  return argv[0] === 'npm' && argv[1] === 'exec';
}

/**
 * When Node refuses to spawn `.cmd` shims directly (EINVAL), run via `npm exec` with
 * `--package=` so `@scope` never appears as a bare cmd token.
 */
/** argv for `npm exec --package=<name> -- <cli> …` — avoids bare `@scope/pkg` tokens (cmd on Windows, sh on macOS). */
export function buildNpmExecArgv(packageName: string, forwardArgs: string[]): string[] {
  return ['npm', 'exec', '--yes', `--package=${packageName}`, '--', QA_AI_RULES_CLI, ...forwardArgs];
}

/** @deprecated Use {@link buildNpmExecArgv}. */
export const buildWindowsNpmExecArgv = buildNpmExecArgv;

/** Convert `npx --yes <pkg> …` argv into `npm exec --package=<pkg> -- qa-ai-rules …`. */
export function npxArgvToNpmExecArgv(argv: readonly string[]): string[] | null {
  if (argv[0] !== 'npx' || argv[1] !== '--yes' || typeof argv[2] !== 'string') {
    return null;
  }

  return buildNpmExecArgv(argv[2], argv.slice(3));
}

export type SpawnPackageArgvOptions = {
  cwd: string;
  stdio: 'inherit';
  env: NodeJS.ProcessEnv;
  /** When set, logs spawn plan and result via setupLog (used by QA AI rules setup). */
  log?: (message: string) => void;
};

function logSpawnError(
  log: ((message: string) => void) | undefined,
  result: SpawnSyncReturns<Buffer | string>,
): void {
  if (!log) {
    return;
  }

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;

    log(
      `spawn error: ${err.message}` +
        (err.code ? ` (code=${err.code})` : '') +
        (err.errno !== undefined ? ` errno=${err.errno}` : '') +
        (err.syscall ? ` syscall=${err.syscall}` : '') +
        (err.path ? ` path=${err.path}` : ''),
    );
  } else if (result.status !== 0) {
    log(`spawn exit status=${result.status ?? 'unknown'}${result.signal ? ` signal=${result.signal}` : ''}`);
  }
}

function spawnWindowsShellSafe(
  argv: readonly string[],
  options: SpawnPackageArgvOptions,
): SpawnSyncReturns<Buffer | string> {
  const line = buildWindowsCmdCommandLine(argv);

  return spawnSync(line, {
    cwd: options.cwd,
    stdio: options.stdio,
    env: options.env,
    shell: true,
    windowsHide: true,
  });
}

function spawnWindowsDirect(
  argv: readonly string[],
  options: SpawnPackageArgvOptions,
): SpawnSyncReturns<Buffer | string> {
  const command = resolveWindowsExecutable(argv[0], options.env);

  return spawnSync(command, argv.slice(1), {
    cwd: options.cwd,
    stdio: options.stdio,
    env: options.env,
    shell: false,
    windowsHide: true,
  });
}

/**
 * Run a one-shot package-manager command (`npx`, `pnpm dlx`, …).
 * On Windows: `npm exec --package=` uses shell (cmd-safe, finds `npm` in PATH); bare `@scope` uses direct spawn with resolved `.cmd`.
 */
export function spawnPackageArgv(
  argv: readonly string[],
  options: SpawnPackageArgvOptions,
): SpawnSyncReturns<Buffer | string> {
  const plan = describeSpawnPackageArgv(argv, options.cwd);
  const log = options.log;

  log?.(
    `spawn ${plan.method} platform=${plan.platform} cwd=${plan.cwd}` +
      (plan.shellCommandLine ? ` line=${plan.shellCommandLine}` : ` argv=${JSON.stringify([...argv])}`),
  );

  if (process.platform !== 'win32') {
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd: options.cwd,
      stdio: options.stdio,
      env: options.env,
      shell: false,
    });

    logSpawnError(log, result);

    return result;
  }

  let result: SpawnSyncReturns<Buffer | string>;

  if (isCmdSafeArgv(argv)) {
    result = spawnWindowsShellSafe(argv, options);

    if (!isWindowsSpawnEnoent(result.error) && !isWindowsSpawnEinval(result.error)) {
      logSpawnError(log, result);

      return result;
    }

    log?.('spawn win32-shell-safe failed; retry win32-direct with resolved .cmd');
    result = spawnWindowsDirect(argv, options);
  } else {
    result = spawnWindowsDirect(argv, options);

    if (isWindowsSpawnEinval(result.error) || isWindowsSpawnEnoent(result.error)) {
      const npmExecArgv = npxArgvToNpmExecArgv(argv);

      if (npmExecArgv) {
        log?.(`spawn win32-direct failed; retry win32-shell-safe npm exec`);
        result = spawnWindowsShellSafe(npmExecArgv, options);
      }
    }
  }

  logSpawnError(log, result);

  return result;
}

function readPackageJsonPackageManager(targetDir: string): string | null {
  const pkgPath = path.join(targetDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { packageManager?: string };
    const pm = raw.packageManager?.trim();

    return pm && pm.length > 0 ? pm : null;
  } catch {
    return null;
  }
}

/** Yarn 2+ uses `yarn dlx`; Yarn 1 should fall back to `npx`. */
function yarnMajorFromPackageManagerField(field: string): number | null {
  if (!field.startsWith('yarn@')) {
    return null;
  }

  const rest = field.slice('yarn@'.length);
  const major = parseInt(rest.split(/[.-]/)[0] ?? '', 10);

  return Number.isNaN(major) ? null : major;
}

function isYarnBerryLayout(targetDir: string): boolean {
  return (
    fs.existsSync(path.join(targetDir, '.yarnrc.yml')) ||
    fs.existsSync(path.join(targetDir, '.yarn', 'releases'))
  );
}

/**
 * Best-effort detection for how to run a published CLI in `targetDir`.
 * Priority: **package.json** `packageManager` (Corepack), then lockfiles / Yarn layout.
 */
export function detectPackageRunner(targetDir: string): PackageRunnerId {
  const pmField = readPackageJsonPackageManager(targetDir);

  if (pmField) {
    const name = pmField.split('@')[0]?.toLowerCase();

    if (name === 'pnpm') {
      return 'pnpm';
    }

    if (name === 'bun') {
      return 'bun';
    }

    if (name === 'npm') {
      return 'npm';
    }

    if (name === 'yarn') {
      const major = yarnMajorFromPackageManagerField(pmField);

      if (major !== null && major >= 2) {
        return 'yarn-dlx';
      }

      if (major === 1) {
        return 'npm';
      }

      return isYarnBerryLayout(targetDir) ? 'yarn-dlx' : 'npm';
    }
  }

  if (fs.existsSync(path.join(targetDir, 'bun.lockb')) || fs.existsSync(path.join(targetDir, 'bun.lock'))) {
    return 'bun';
  }

  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(targetDir, 'pnpm-workspace.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
    return isYarnBerryLayout(targetDir) ? 'yarn-dlx' : 'npm';
  }

  return 'npm';
}

/**
 * Builds argv to run `packageName` with forwarded args (e.g. `init`, `--cursor`).
 * Uses the same convention as `npx pkg ...`: **npm/pnpm/yarn/bun** all receive `packageName` as the package to fetch.
 */
export function buildPackageRunInvocation(
  runner: PackageRunnerId,
  packageName: string,
  forwardArgs: string[],
): PackageRunInvocation {
  if (runner === 'pnpm') {
    return {
      runner,
      argv: ['pnpm', 'dlx', packageName, ...forwardArgs],
      label: 'pnpm dlx',
    };
  }

  if (runner === 'yarn-dlx') {
    return {
      runner,
      argv: ['yarn', 'dlx', packageName, ...forwardArgs],
      label: 'yarn dlx',
    };
  }

  if (runner === 'bun') {
    return {
      runner,
      argv: ['bunx', packageName, ...forwardArgs],
      label: 'bunx',
    };
  }

  return {
    runner,
    argv: buildNpmExecArgv(packageName, forwardArgs),
    label: 'npm exec',
  };
}
