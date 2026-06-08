import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';
import { buildPortalPageSkillFiles } from './portal-page-ai.js';

const CLAUDE_WORKFLOW_TEMPLATES = [
  'claude/workflows/linear-workflow.md',
  'claude/workflows/testing-with-linear.md',
  'claude/workflows/testing-flow.md',
  'claude/workflows/ui-check-simple.md',
  'claude/workflows/linear-qa-report.md',
  'claude/workflows/playwright-mcp.md',
  'claude/workflows/test-documentation.md',
] as const;

const CLAUDE_COMMAND_TEMPLATES = [
  'claude/commands/testing-with-linear.md',
  'claude/commands/testing-flow.md',
  'claude/commands/ui-check.md',
  'claude/commands/linear-report.md',
  'claude/commands/start-working-with-task.md',
  'claude/commands/test-documentation.md',
] as const;

const CLAUDE_AGENT_TEMPLATES = [
  'claude/agents/qa-tester.md',
  'claude/agents/ui-verifier.md',
  'claude/agents/linear-reporter.md',
] as const;

function claudeSubpath(templateRel: string): string {
  return templateRel.replace(/^claude\//, '.claude/');
}

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
    '- Confirm **`.claude/settings.json`** enables those servers (`enableAllProjectMcpServers`, ' +
      '`enabledMcpjsonServers`, `permissions.allow`); re-run the installer with **`--force`** if you replaced ' +
      '`.mcp.json` without refreshing settings.',
    '- If the file was removed, recreate it and merge with any existing `mcpServers` keys.',
    '- For **Figma MCP**, export **`FIGMA_API_KEY`** before server start, then reload MCP in Claude Code.',
    '- If Figma MCP is enabled, use **`.claude/agents/figma-mcp.md`**, ' +
      '**`.claude/skills/figma-code-connect/SKILL.md`**, and **`.cursor/rules/figma-mcp.mdc`**.',
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
    ...buildPortalPageSkillFiles('claude', options.includeFigmaMcp),
    ...CLAUDE_WORKFLOW_TEMPLATES.map((rel) => ({
      path: claudeSubpath(rel),
      content: readTemplate(rel),
    })),
    ...CLAUDE_COMMAND_TEMPLATES.map((rel) => ({
      path: claudeSubpath(rel),
      content: readTemplate(rel),
    })),
    ...CLAUDE_AGENT_TEMPLATES.map((rel) => ({
      path: claudeSubpath(rel),
      content: readTemplate(rel),
    })),
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
