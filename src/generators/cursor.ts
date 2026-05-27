import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';
import { buildCursorRuleFiles, buildPortalPageSkillFiles } from './portal-page-ai.js';

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
    '- If Figma MCP is enabled, follow **`.cursor/rules/figma-mcp.mdc`** and **`.cursor/skills/figma-code-connect/SKILL.md`** when applicable.',
    '- **Enable servers manually** in Cursor (**Settings → Features → MCP**): project MCP from `.cursor/mcp.json` is not auto-enabled — toggle each server on, then refresh MCP (see **Step 2.5** in this setup doc).',
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
      path: '.cursorignore',
      content: readTemplate('cursor/cursorignore'),
    },
    {
      path: '.cursor/ca-ai-tools-setup.json',
      content: readTemplate('cursor/ca-ai-tools-setup.json'),
    },
    {
      path: '.cursor/prompts/react-component-unit.md',
      content: readTemplate('cursor/prompts/react-component-unit.md'),
    },
    {
      path: '.cursor/prompts/form-prompt.md',
      content: readTemplate('cursor/prompts/form-prompt.md'),
    },
    ...buildCursorRuleFiles(options.includeFigmaMcp),
    ...buildPortalPageSkillFiles('cursor', options.includeFigmaMcp),
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

  return files;
}
