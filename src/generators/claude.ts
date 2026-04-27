import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';

export type GenerateClaudeOptions = {
  includePlaywrightMcp: boolean;
};

export function generateClaudeFiles(options: GenerateClaudeOptions): GeneratedFile[] {
  const mcpInstructions = options.includePlaywrightMcp
    ? readTemplate('claude/setup-assistant-mcp-included.md')
    : readTemplate('claude/setup-assistant-mcp-skipped.md');

  const setupClaudeContent = readTemplate('setup-claude-assistant.md').replace(
    '__PLAYWRIGHT_MCP_BLOCK__',
    `${mcpInstructions.trimEnd()}\n`,
  );

  const files: GeneratedFile[] = [
    {
      path: 'setup-claude-assistant.md',
      content: setupClaudeContent,
    },
  ];

  if (options.includePlaywrightMcp) {
    files.push({
      path: '.mcp.json',
      content: readTemplate('claude/mcp.json'),
    });
  }

  return files;
}
