import { FIGMA_MCP_PACKAGE, FIGMA_MCP_VERSION } from '../constants.js';

/** Which MCP file the config is for: `.cursor/mcp.json` or the project-root `.mcp.json`. */
export type McpTarget = 'cursor' | 'claude';

export type McpSelection = {
  includeFigmaMcp: boolean;
  target: McpTarget;
};

/**
 * No longer generated (PP-4531): browser automation runs through the Playwright CLI. The definition
 * stays so `update` can recognise the entry older releases wrote and remove it.
 */
function playwrightServer(): Record<string, unknown> {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  };
}

/** What releases before PP-4661 wrote: unpinned, and with a placeholder only Claude Code expands. */
function legacyFigmaServer(): Record<string, unknown> {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', FIGMA_MCP_PACKAGE, '--stdio'],
    env: {
      FIGMA_API_KEY: '${FIGMA_API_KEY}',
    },
  };
}

/**
 * Framelink Figma MCP, signed in with a personal access token — no OAuth. The server loads
 * `FIGMA_API_KEY` from a `.env` file itself (overriding its environment), so the token a repository
 * already keeps in `.env` works with no export and no restart of the shell. An environment variable
 * works too. The two clients need different spelling for the same thing:
 *
 * - Claude Code expands `${VAR:-default}`. Without the empty default an unset variable reaches the
 *   server as the literal text `${FIGMA_API_KEY}`, and Figma answers 403 instead of the server
 *   saying that the token is missing. It starts stdio servers in the project root, which is where
 *   the server looks for `.env` and saves images by default.
 * - Cursor expands `${env:NAME}` and `${workspaceFolder}`, and does not promise a working directory,
 *   so the `.env` file and the image folder are passed explicitly.
 *
 * The version is pinned: the tool names the skill relies on have changed between releases, and an
 * unpinned `npx -y` would run whatever was published last with the developer's Figma token.
 */
function figmaServer(target: McpTarget): Record<string, unknown> {
  const packageSpec = `${FIGMA_MCP_PACKAGE}@${FIGMA_MCP_VERSION}`;

  if (target === 'cursor') {
    return {
      type: 'stdio',
      command: 'npx',
      args: ['-y', packageSpec, '--stdio', '--env', '${workspaceFolder}/.env', '--image-dir', '${workspaceFolder}'],
      env: {
        FIGMA_API_KEY: '${env:FIGMA_API_KEY}',
        FRAMELINK_TELEMETRY: 'off',
      },
    };
  }

  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', packageSpec, '--stdio'],
    env: {
      FIGMA_API_KEY: '${FIGMA_API_KEY:-}',
      FRAMELINK_TELEMETRY: 'off',
    },
  };
}

/**
 * Every MCP server this tool writes or used to write, by its `mcpServers` name, in every form it
 * was written. `update` compares an existing entry with the definitions here to tell "the generator
 * wrote this and it is unchanged" from "the repository owns or edited this" before it removes a
 * server that is no longer generated. Keep a definition here after the generator stops writing it
 * or changes it, or old setups cannot be cleaned up.
 */
export function generatedMcpServerDefinitions(): Record<string, Record<string, unknown>[]> {
  return {
    playwright: [playwrightServer()],
    figma: [figmaServer('claude'), figmaServer('cursor'), legacyFigmaServer()],
  };
}

export function buildMcpServers(selection: McpSelection): Record<string, unknown> {
  const servers: Record<string, unknown> = {};

  if (selection.includeFigmaMcp) {
    servers.figma = figmaServer(selection.target);
  }

  return servers;
}

export function buildMcpJson(selection: McpSelection): string {
  return `${JSON.stringify({ mcpServers: buildMcpServers(selection) }, null, 2)}\n`;
}
