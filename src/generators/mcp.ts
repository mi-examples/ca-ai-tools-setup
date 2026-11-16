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

/**
 * Every MCP server this tool writes or used to write, by its `mcpServers` name. `update` compares
 * an existing entry with the definition here to tell "the generator wrote this and it is unchanged"
 * from "the repository owns or edited this" before it removes a server that is no longer generated.
 * Keep a definition here after the generator stops writing it, or old setups cannot be cleaned up.
 */
export function generatedMcpServerDefinitions(): Record<string, Record<string, unknown>> {
  return {
    playwright: playwrightServer(),
    figma: figmaServer(),
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
