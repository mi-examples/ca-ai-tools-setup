export type McpSelection = {
  includePlaywrightMcp: boolean;
  includeFigmaMcp: boolean;
};

function playwrightServer(): Record<string, unknown> {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  };
}

function figmaServer(): Record<string, unknown> {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'figma-developer-mcp', '--stdio'],
    env: {
      FIGMA_API_KEY: '${FIGMA_API_KEY}',
    },
  };
}

export function buildMcpServers(selection: McpSelection): Record<string, unknown> {
  const servers: Record<string, unknown> = {};

  if (selection.includePlaywrightMcp) {
    servers.playwright = playwrightServer();
  }

  if (selection.includeFigmaMcp) {
    servers.figma = figmaServer();
  }

  return servers;
}

export function buildMcpJson(selection: McpSelection): string {
  return `${JSON.stringify({ mcpServers: buildMcpServers(selection) }, null, 2)}\n`;
}
