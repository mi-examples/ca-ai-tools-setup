const MCP_CONFIG_PATHS = new Set<string>(['.cursor/mcp.json', '.mcp.json']);

export function isMcpConfigPath(relativePath: string): boolean {
  return MCP_CONFIG_PATHS.has(relativePath.replace(/\\/g, '/'));
}

function asServerMap(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Deep-merge `mcpServers`: existing keys stay; incoming keys override on collision.
 * Other top-level keys: incoming wins where defined, then `mcpServers` is the merged map.
 */
export function mergeMcpJson(existingContent: string, incomingContent: string): string {
  let existing: Record<string, unknown>;
  let incoming: Record<string, unknown>;

  try {
    existing = JSON.parse(existingContent) as Record<string, unknown>;
  } catch {
    throw new Error('Existing MCP file is not valid JSON; fix it or choose Overwrite.');
  }

  try {
    incoming = JSON.parse(incomingContent) as Record<string, unknown>;
  } catch {
    throw new Error('Template MCP JSON is invalid (internal error).');
  }

  const mergedServers = {
    ...asServerMap(existing.mcpServers),
    ...asServerMap(incoming.mcpServers),
  };

  const out: Record<string, unknown> = {
    ...existing,
    ...incoming,
    mcpServers: mergedServers,
  };

  return `${JSON.stringify(out, null, 2)}\n`;
}
