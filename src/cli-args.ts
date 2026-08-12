import minimist from 'minimist';

export type CliArgs = {
  _: string[];
  target?: string;
  assistants?: string;
  yes?: boolean;
  'dry-run'?: boolean;
  dryRun?: boolean;
  force?: boolean;
  version?: boolean;
  'mcp-playwright'?: string;
  'mcp-figma'?: string;
  'qa-ai-rules'?: string;
};

export type CliMode = 'generate' | 'check' | 'update';

export function parseCliArgs(argv = process.argv.slice(2)): CliArgs {
  return minimist(argv, {
    string: ['target', 'assistants', 'mcp-playwright', 'mcp-figma', 'qa-ai-rules', '_'],
    boolean: ['yes', 'dry-run', 'dryRun', 'force', 'version'],
    alias: {
      y: 'yes',
      dryRun: 'dry-run',
      v: 'version',
    },
  }) as CliArgs;
}

export function cliMode(args: CliArgs): CliMode {
  const command = args._[0];

  return command === 'check' || command === 'update' ? command : 'generate';
}

export function validateCliArgs(args: CliArgs): void {
  const mode = cliMode(args);
  const maximumPositionals = mode === 'generate' ? 1 : 2;

  if (args._.length <= maximumPositionals) {
    return;
  }

  if (mode === 'generate') {
    throw new Error(
      `Unknown command or too many positional arguments: ${args._.join(' ')}. ` +
        'Supported commands are check and update.',
    );
  }

  throw new Error(`Too many positional arguments for ${mode}: ${args._.slice(1).join(' ')}`);
}

export function mcpPlaywrightCliRaw(args: CliArgs): string | undefined {
  const v = args['mcp-playwright'];

  return typeof v === 'string' ? v : undefined;
}

export function mcpFigmaCliRaw(args: CliArgs): string | undefined {
  const v = args['mcp-figma'];

  return typeof v === 'string' ? v : undefined;
}

export function qaAiRulesCliRaw(args: CliArgs): string | undefined {
  const v = args['qa-ai-rules'];

  return typeof v === 'string' ? v : undefined;
}

export function firstNonEmptyTarget(args: CliArgs): string | undefined {
  const fromFlag = args.target?.trim();

  if (fromFlag) {
    return fromFlag;
  }

  const positional = args._[cliMode(args) === 'generate' ? 0 : 1];

  if (positional === undefined || positional === null) {
    return undefined;
  }

  const s = String(positional).trim();

  return s || undefined;
}
