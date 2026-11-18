import { readTemplate, renderAssistantBlocks } from '../templates.js';
import type { GeneratedFile } from './types.js';
import { buildMcpJson } from './mcp.js';

export type GenerateCursorOptions = {
  includeFigmaMcp: boolean;
};

function renderCursorMcpSection(options: GenerateCursorOptions): string {
  if (!options.includeFigmaMcp) {
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

  return [
    '**2.4. MCP servers (Cursor)**',
    '',
    'This repository was bootstrapped **with** **`.cursor/mcp.json`** — the following MCP server(s) were added: ' +
      '**figma**.',
    '',
    '**What you need to do**',
    '',
    '- Confirm **`.cursor/mcp.json`** exists and contains the expected `mcpServers` entries.',
    '- If someone removed the file, recreate it and merge with any existing `mcpServers` keys.',
    '- For **Figma MCP**, export **`FIGMA_API_KEY`** before starting the server, then reload MCP in Cursor.',
    '- For Figma work, use the **`figma-implementation`** and **`figma-code-connect`** skills.',
    '- **Enable servers manually** in Cursor (**Settings → Features → MCP**): project MCP from ' +
      '`.cursor/mcp.json` is not auto-enabled — toggle each server on, then refresh MCP ' +
      '(see **Enable project MCP in Cursor** below).',
    '- After any edit to `mcp.json`, reload MCP in Cursor and confirm selected tools are available.',
    '',
    '```json',
    buildMcpJson({ includeFigmaMcp: true }).trimEnd(),
    '```',
  ].join('\n');
}

/**
 * Files only Cursor reads. Rules and skills are shared and built by their own generators. There is
 * no `.cursorrules`: Cursor deprecated it in favor of `.cursor/rules/` and `AGENTS.md`.
 */
export function generateCursorFiles(options: GenerateCursorOptions): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: 'setup-cursor-assistant.md',
      content: renderAssistantBlocks(readTemplate('setup-assistant.md'), ['cursor']).replace(
        /\*\*MCP_SERVERS_BLOCK\*\*/,
        `${renderCursorMcpSection(options).trimEnd()}\n`,
      ),
    },
    {
      path: '.cursorignore',
      content: readTemplate('cursor/cursorignore'),
    },
  ];

  if (options.includeFigmaMcp) {
    files.push({
      path: '.cursor/mcp.json',
      content: buildMcpJson({ includeFigmaMcp: true }),
    });
  }

  return files;
}
