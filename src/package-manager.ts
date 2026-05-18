import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

export type SpawnPackageArgvOptions = {
  cwd: string;
  stdio: 'inherit';
  env: NodeJS.ProcessEnv;
};

/**
 * Run a one-shot package-manager command (`npx`, `pnpm dlx`, …).
 * On Windows uses `cmd.exe` with a quoted command line so scoped packages are not parsed as `@cmd`.
 */
export function spawnPackageArgv(
  argv: readonly string[],
  options: SpawnPackageArgvOptions,
): SpawnSyncReturns<Buffer | string> {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', buildWindowsCmdCommandLine(argv)], {
      cwd: options.cwd,
      stdio: options.stdio,
      env: options.env,
      windowsVerbatimArguments: true,
    });
  }

  return spawnSync(argv[0], argv.slice(1), {
    cwd: options.cwd,
    stdio: options.stdio,
    env: options.env,
    shell: false,
  });
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
    argv: ['npx', '--yes', packageName, ...forwardArgs],
    label: 'npx',
  };
}
