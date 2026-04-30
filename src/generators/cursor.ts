import { readTemplate, readUiCheckSkillTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';

export type GenerateCursorOptions = {
  includePlaywrightMcp: boolean;
  includeFigmaMcp: boolean;
};

function renderCursorMcpSection(options: GenerateCursorOptions): string {
  const selected: string[] = [];

  if (options.includePlaywrightMcp) {
    selected.push('playwright');
  }

  if (options.includeFigmaMcp) {
    selected.push('figma');
  }

  if (selected.length === 0) {
    return [
      '**2.4. MCP servers (Cursor — optional)**',
      '',
      'This repository was bootstrapped **without** **`.cursor/mcp.json`** — ' +
        'the installer **chose not to** add MCP servers for this run.',
      '',
      'If needed later, add **`.cursor/mcp.json`** and merge into existing `mcpServers` keys ' +
        '(do not remove unrelated servers).',
      '',
      'For **Figma MCP**, use **`figma-developer-mcp`** and set **`FIGMA_API_KEY`** in your ' +
        'environment before reloading MCP in Cursor.',
    ].join('\n');
  }

  const selectedServersLabel = selected.join(', ');
  const mcpJson = buildMcpJson({
    includePlaywrightMcp: options.includePlaywrightMcp,
    includeFigmaMcp: options.includeFigmaMcp,
  });

  return [
    '**2.4. MCP servers (Cursor)**',
    '',
    `This repository was bootstrapped **with** **\`.cursor/mcp.json\`** — ` +
      `the following MCP server(s) were added: **${selectedServersLabel}**.`,
    '',
    '**What you need to do**',
    '',
    '- Confirm **`.cursor/mcp.json`** exists and contains the expected `mcpServers` entries.',
    '- If someone removed the file, recreate it and merge with any existing `mcpServers` keys.',
    '- For **Figma MCP**, export **`FIGMA_API_KEY`** before starting the server, then reload MCP in Cursor.',
    '- After any edit to `mcp.json`, reload MCP in Cursor and confirm selected tools are available.',
    '',
    '```json',
    mcpJson.trimEnd(),
    '```',
  ].join('\n');
}

export function generateCursorFiles(options: GenerateCursorOptions): GeneratedFile[] {
  const mcpInstructions = renderCursorMcpSection(options);

  const setupCursorContent = readTemplate('setup-cursor-assistant.md').replace(
    /\*\*PLAYWRIGHT_MCP_BLOCK\*\*|__PLAYWRIGHT_MCP_BLOCK__/,
    `${mcpInstructions.trimEnd()}\n`,
  );

  const files: GeneratedFile[] = [
    {
      path: 'setup-cursor-assistant.md',
      content: setupCursorContent,
    },
    {
      path: '.cursorrules',
      content: readTemplate('cursor/cursorrules'),
    },
    {
      path: '.cursor/rules/linear-cli.mdc',
      content: readTemplate('cursor/rules/linear-cli.mdc'),
    },
    {
      path: '.cursor/rules/README.md',
      content: readTemplate('cursor/rules/README.md'),
    },
    {
      path: '.cursor/ca-ai-tools-setup.json',
      content: readTemplate('cursor/ca-ai-tools-setup.json'),
    },
    {
      path: '.cursor/skills/ui-check/SKILL.md',
      content: readUiCheckSkillTemplate('cursor'),
    },
  ];

  if (options.includePlaywrightMcp || options.includeFigmaMcp) {
    files.push({
      path: '.cursor/mcp.json',
      content: buildMcpJson({
        includePlaywrightMcp: options.includePlaywrightMcp,
        includeFigmaMcp: options.includeFigmaMcp,
      }),
    });
  }

  if (options.includeFigmaMcp) {
    files.push({
      path: '.cursor/rules/figma-mcp.mdc',
      content: readTemplate('cursor/rules/figma-mcp.mdc'),
    });
  }

  return files;
}
