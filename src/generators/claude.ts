import { readTemplate, renderAssistantBlocks } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';

/** Real subagents only: each runs in its own context. Rules live in `.claude/rules/`. */
const CLAUDE_AGENT_TEMPLATES = [
  'claude/agents/qa-tester.md',
  'claude/agents/ui-verifier.md',
  'claude/agents/linear-reporter.md',
] as const;

/**
 * Thin wrappers that keep two established command names working. Every other former command has a
 * skill of the same name, and a skill already runs as `/<name>`.
 */
const CLAUDE_COMMAND_TEMPLATES = ['claude/commands/ui-check.md', 'claude/commands/customer-docs.md'] as const;

function claudeSubpath(templateRel: string): string {
  return templateRel.replace(/^claude\//, '.claude/');
}

export type GenerateClaudeOptions = {
  includeFigmaMcp: boolean;
};

/** JSON for `.claude/settings.json` — includes MCP enablement when `.mcp.json` is generated. */
export function buildClaudeSettingsJson(options: GenerateClaudeOptions): string {
  const doc: Record<string, unknown> = {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
  };

  const enabledNames: string[] = [];

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
  if (!options.includeFigmaMcp) {
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

  return [
    '**2.4. MCP servers (Claude Code)**',
    '',
    'This repository was bootstrapped **with** **`.mcp.json`** — the following MCP server(s) were added: **figma**.',
    '',
    '**What you need to do**',
    '',
    '- Confirm **`.mcp.json`** exists in the repository root and contains expected `mcpServers` entries.',
    '- Confirm **`.claude/settings.json`** enables those servers (`enableAllProjectMcpServers`, ' +
      '`enabledMcpjsonServers`, `permissions.allow`); re-run the installer with **`--force`** if you replaced ' +
      '`.mcp.json` without refreshing settings.',
    '- If the file was removed, recreate it and merge with any existing `mcpServers` keys.',
    '- For **Figma MCP**, export **`FIGMA_API_KEY`** before server start, then reload MCP in Claude Code.',
    '- For Figma work, use the **`figma-implementation`** and **`figma-code-connect`** skills.',
    '- After changes in `.mcp.json`, reload MCP and verify selected tools are available.',
    '',
    '```json',
    buildMcpJson({ includeFigmaMcp: true }).trimEnd(),
    '```',
  ].join('\n');
}

/** Files only Claude Code reads. Rules and skills are shared and built by their own generators. */
export function generateClaudeFiles(options: GenerateClaudeOptions): GeneratedFile[] {
  const render = (templateRel: string): string =>
    renderAssistantBlocks(readTemplate(templateRel), ['claude'], { figma: options.includeFigmaMcp });
  const files: GeneratedFile[] = [
    {
      path: 'setup-claude-assistant.md',
      content: renderAssistantBlocks(readTemplate('setup-assistant.md'), ['claude']).replace(
        /\*\*MCP_SERVERS_BLOCK\*\*/,
        `${renderClaudeMcpSection(options).trimEnd()}\n`,
      ),
    },
    {
      path: 'CLAUDE.md',
      content: render('claude/CLAUDE.md'),
    },
    {
      path: '.claude/settings.json',
      content: buildClaudeSettingsJson(options),
    },
    ...[...CLAUDE_AGENT_TEMPLATES, ...CLAUDE_COMMAND_TEMPLATES].map((rel) => ({
      path: claudeSubpath(rel),
      content: render(rel),
    })),
  ];

  if (options.includeFigmaMcp) {
    files.push({
      path: '.mcp.json',
      content: buildMcpJson({ includeFigmaMcp: true }),
    });
  }

  return files;
}
