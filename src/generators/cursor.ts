import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';

export type GenerateCursorOptions = {
  includePlaywrightMcp: boolean;
};

export function generateCursorFiles(options: GenerateCursorOptions): GeneratedFile[] {
  const mcpInstructions = options.includePlaywrightMcp
    ? readTemplate('cursor/setup-assistant-mcp-included.md')
    : readTemplate('cursor/setup-assistant-mcp-skipped.md');

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
      path: '.cursor/rules/linear-cli.mdc',
      content: readTemplate('cursor/rules/linear-cli.mdc'),
    },
    {
      path: '.cursor/rules/README.md',
      content: readTemplate('cursor/rules/README.md'),
    },
    {
      path: '.cursor/linear-cli-setup.json',
      content: readTemplate('cursor/linear-cli-setup.json'),
    },
  ];

  if (options.includePlaywrightMcp) {
    files.push({
      path: '.cursor/mcp.json',
      content: readTemplate('cursor/mcp.json'),
    });
  }

  return files;
}
