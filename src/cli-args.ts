import minimist from 'minimist';

export type CliArgs = {
  _: string[];
  target?: string;
  assistants?: string;
  yes?: boolean;
  'dry-run'?: boolean;
  dryRun?: boolean;
  force?: boolean;
  'mcp-playwright'?: string;
  'mcp-figma'?: string;
  'qa-ai-rules'?: string;
};

export function parseCliArgs(argv = process.argv.slice(2)): CliArgs {
  return minimist(argv, {
    string: ['target', 'assistants', 'mcp-playwright', 'mcp-figma', 'qa-ai-rules', '_'],
    boolean: ['yes', 'dry-run', 'dryRun', 'force'],
    alias: {
      y: 'yes',
      dryRun: 'dry-run',
    },
  }) as CliArgs;
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

  const positional = args._[0];

  if (positional === undefined || positional === null) {
    return undefined;
  }

  const s = String(positional).trim();

  return s || undefined;
}
