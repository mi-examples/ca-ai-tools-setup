import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';

export type GenerateClaudeOptions = {
  includePlaywrightMcp: boolean;
  includeFigmaMcp: boolean;
};

/** JSON for `.claude/settings.json` — includes MCP enablement when `.mcp.json` is generated. */
export function buildClaudeSettingsJson(options: GenerateClaudeOptions): string {
  const doc: Record<string, unknown> = {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
  };

  const enabledNames: string[] = [];

  if (options.includePlaywrightMcp) {
    enabledNames.push('playwright');
  }

  if (options.includeFigmaMcp) {
    enabledNames.push('figma');
  }

  if (enabledNames.length > 0) {
    doc.enableAllProjectMcpServers = true;
    doc.enabledMcpjsonServers = enabledNames;
    doc.permissions = {
      allow: enabledNames.map((name) => `mcp__${name}__*`),
    };
  }

  doc.enabledPlugins = {
    'claude-code-setup@claude-plugins-official': true,
  };

  return `${JSON.stringify(doc, null, 2)}\n`;
}

function renderClaudeMcpSection(options: GenerateClaudeOptions): string {
  const selected: string[] = [];

  if (options.includePlaywrightMcp) {
    selected.push('playwright');
  }

  if (options.includeFigmaMcp) {
    selected.push('figma');
  }

  if (selected.length === 0) {
    return [
      '**2.4. MCP servers (Claude Code — optional)**',
      '',
      'This repository was bootstrapped **without** **`.mcp.json`** in the project root — ' +
        'the installer **chose not to** add MCP servers for this run.',
      '',
      'If needed later, create **`.mcp.json`** at the repository root and merge into existing `mcpServers` keys.',
      '',
      'For **Figma MCP**, use **`figma-developer-mcp`**, set **`FIGMA_API_KEY`**, then reload MCP in Claude Code.',
    ].join('\n');
  }

  const selectedServersLabel = selected.join(', ');
  const mcpJson = buildMcpJson({
    includePlaywrightMcp: options.includePlaywrightMcp,
    includeFigmaMcp: options.includeFigmaMcp,
  });

  return [
    '**2.4. MCP servers (Claude Code)**',
    '',
    `This repository was bootstrapped **with** **\`.mcp.json\`** — ` +
      `the following MCP server(s) were added: **${selectedServersLabel}**.`,
    '',
    '**What you need to do**',
    '',
    '- Confirm **`.mcp.json`** exists in the repository root and contains expected `mcpServers` entries.',
    '- Confirm **`.claude/settings.json`** enables those servers (`enableAllProjectMcpServers`, `enabledMcpjsonServers`, `permissions.allow`); re-run the installer with **`--force`** if you replaced `.mcp.json` without refreshing settings.',
    '- If the file was removed, recreate it and merge with any existing `mcpServers` keys.',
    '- For **Figma MCP**, export **`FIGMA_API_KEY`** before server start, then reload MCP in Claude Code.',
    '- If Figma MCP is enabled, use the **`.claude/agents/figma-mcp.md`** agent rules for implementation.',
    '- After changes in `.mcp.json`, reload MCP and verify selected tools are available.',
    '',
    '```json',
    mcpJson.trimEnd(),
    '```',
  ].join('\n');
}

export function generateClaudeFiles(options: GenerateClaudeOptions): GeneratedFile[] {
  const mcpInstructions = renderClaudeMcpSection(options);

  const setupClaudeContent = readTemplate('setup-claude-assistant.md').replace(
    /\*\*PLAYWRIGHT_MCP_BLOCK\*\*|__PLAYWRIGHT_MCP_BLOCK__/,
    `${mcpInstructions.trimEnd()}\n`,
  );

  const files: GeneratedFile[] = [
    {
      path: 'setup-claude-assistant.md',
      content: setupClaudeContent,
    },
    {
      path: 'CLAUDE.md',
      content: readTemplate('claude/CLAUDE.md'),
    },
    {
      path: '.claude/settings.json',
      content: buildClaudeSettingsJson(options),
    },
  ];

  if (options.includePlaywrightMcp || options.includeFigmaMcp) {
    files.push({
      path: '.mcp.json',
      content: buildMcpJson({
        includePlaywrightMcp: options.includePlaywrightMcp,
        includeFigmaMcp: options.includeFigmaMcp,
      }),
    });
  }

  if (options.includeFigmaMcp) {
    files.push({
      path: '.claude/agents/figma-mcp.md',
      content: readTemplate('claude/agents/figma-mcp.md'),
    });
  }

  return files;
}
