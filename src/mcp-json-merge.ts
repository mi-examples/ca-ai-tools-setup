const MCP_CONFIG_PATHS = new Set<string>(['.cursor/mcp.json', '.mcp.json']);
const MERGEABLE_PATHS = new Set<string>([...MCP_CONFIG_PATHS, '.claude/settings.json', 'AGENTS.md']);

export function isMcpConfigPath(relativePath: string): boolean {
  return MCP_CONFIG_PATHS.has(relativePath.replace(/\\/g, '/'));
}

export function isMergeablePath(relativePath: string): boolean {
  return MERGEABLE_PATHS.has(relativePath.replace(/\\/g, '/'));
}

function asServerMap(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isPlaceholderToken(value: unknown): value is string {
  return typeof value === 'string' && /^\$\{[A-Z0-9_]+\}$/.test(value);
}

function mergeServerConfig(existingServer: unknown, incomingServer: unknown): Record<string, unknown> {
  const existing = asServerMap(existingServer);
  const incoming = asServerMap(incomingServer);
  const out: Record<string, unknown> = { ...existing, ...incoming };

  const existingEnv = asServerMap(existing.env);
  const incomingEnv = asServerMap(incoming.env);
  const mergedEnv: Record<string, unknown> = { ...existingEnv, ...incomingEnv };

  for (const [envKey, incomingValue] of Object.entries(incomingEnv)) {
    const existingValue = existingEnv[envKey];
    const preserveExisting =
      isPlaceholderToken(incomingValue) &&
      typeof existingValue === 'string' &&
      existingValue.length > 0 &&
      !isPlaceholderToken(existingValue);

    if (preserveExisting) {
      mergedEnv[envKey] = existingValue;
    }
  }

  if (Object.keys(mergedEnv).length > 0) {
    out.env = mergedEnv;
  }

  return out;
}

/**
 * Deep-merge `mcpServers`: existing keys stay; incoming keys override on collision.
 * Other top-level keys: incoming wins where defined, then `mcpServers` is the merged map.
 *
 * Token safety rule:
 * - if incoming `env` value is a placeholder (for example `${FIGMA_API_KEY}`)
 *   and existing value is a non-placeholder string token, preserve the existing token.
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

  const existingServers = asServerMap(existing.mcpServers);
  const incomingServers = asServerMap(incoming.mcpServers);
  const mergedServers: Record<string, unknown> = { ...existingServers };

  for (const [name, incomingServer] of Object.entries(incomingServers)) {
    const existingServer = existingServers[name];

    if (existingServer === undefined) {
      mergedServers[name] = incomingServer;
      continue;
    }

    mergedServers[name] = mergeServerConfig(existingServer, incomingServer);
  }

  const out: Record<string, unknown> = {
    ...existing,
    ...incoming,
    mcpServers: mergedServers,
  };

  return `${JSON.stringify(out, null, 2)}\n`;
}

/**
 * Merge `.claude/settings.json`:
 * - $schema: existing wins
 * - enableAllProjectMcpServers: true if either side enables it
 * - enabledMcpjsonServers: union of both arrays
 * - enabledPlugins: object spread (existing entries kept; incoming overrides on same key)
 * - permissions.allow: union of both arrays; other permission keys: incoming wins
 * - Other top-level keys: incoming wins
 */
export function mergeClaudeSettingsJson(existingContent: string, incomingContent: string): string {
  let existing: Record<string, unknown>;
  let incoming: Record<string, unknown>;

  try {
    existing = JSON.parse(existingContent) as Record<string, unknown>;
  } catch {
    throw new Error('Existing .claude/settings.json is not valid JSON; fix it or choose Overwrite.');
  }

  try {
    incoming = JSON.parse(incomingContent) as Record<string, unknown>;
  } catch {
    throw new Error('Template .claude/settings.json is invalid (internal error).');
  }

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : [];

  const unionArr = (a: unknown, b: unknown): string[] => [...new Set([...toStringArray(a), ...toStringArray(b)])];

  const toObjMap = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

  const existingPerms = (existing.permissions ?? {}) as Record<string, unknown>;
  const incomingPerms = (incoming.permissions ?? {}) as Record<string, unknown>;
  const mergedAllow = unionArr(existingPerms.allow, incomingPerms.allow);
  const mergedServers = unionArr(existing.enabledMcpjsonServers, incoming.enabledMcpjsonServers);
  const mergedPlugins = { ...toObjMap(existing.enabledPlugins), ...toObjMap(incoming.enabledPlugins) };

  const out: Record<string, unknown> = { ...existing, ...incoming };

  // $schema: existing wins
  if (existing.$schema !== undefined) {
    out.$schema = existing.$schema;
  }

  // enableAllProjectMcpServers: true if either side enables it
  if (existing.enableAllProjectMcpServers === true || incoming.enableAllProjectMcpServers === true) {
    out.enableAllProjectMcpServers = true;
  } else {
    delete out.enableAllProjectMcpServers;
  }

  // enabledMcpjsonServers: union
  if (mergedServers.length > 0) {
    out.enabledMcpjsonServers = mergedServers;
  } else {
    delete out.enabledMcpjsonServers;
  }

  // enabledPlugins: spread merge (existing entries preserved; incoming overrides on same key)
  if (Object.keys(mergedPlugins).length > 0) {
    out.enabledPlugins = mergedPlugins;
  } else {
    delete out.enabledPlugins;
  }

  // permissions: merge with union allow; other permission keys: incoming wins
  const mergedPerms = { ...existingPerms, ...incomingPerms };

  if (mergedAllow.length > 0) {
    mergedPerms.allow = mergedAllow;
  } else {
    delete mergedPerms.allow;
  }

  if (Object.keys(mergedPerms).length > 0) {
    out.permissions = mergedPerms;
  } else {
    delete out.permissions;
  }

  return `${JSON.stringify(out, null, 2)}\n`;
}

/**
 * Merge `AGENTS.md`: append table rows from incoming for agent files not already listed in existing.
 * Identifies data rows by the pattern `| \`filename\` |` and inserts new ones after the last existing row.
 */
export function mergeAgentsMd(existingContent: string, incomingContent: string): string {
  const dataRowPattern = /^\| `([^`]+)` \|/;

  const existingLines = existingContent.split('\n');
  const incomingLines = incomingContent.split('\n');

  const existingFiles = new Set(
    existingLines.flatMap((line) => {
      const m = dataRowPattern.exec(line);

      return m ? [m[1]] : [];
    }),
  );

  const newRows = incomingLines.filter((line) => {
    const m = dataRowPattern.exec(line);

    return m !== null && !existingFiles.has(m[1]);
  });

  if (newRows.length === 0) {
    return existingContent;
  }

  // Insert after the last existing data row
  let insertAt = -1;

  for (let i = existingLines.length - 1; i >= 0; i--) {
    if (dataRowPattern.test(existingLines[i])) {
      insertAt = i + 1;
      break;
    }
  }

  if (insertAt === -1) {
    return existingContent.trimEnd() + '\n' + newRows.join('\n') + '\n';
  }

  const result = [...existingLines];

  result.splice(insertAt, 0, ...newRows);

  return result.join('\n');
}

/**
 * Dispatch a merge by file path. Throws for paths that do not support merging.
 */
export function mergeFile(relativePath: string, existingContent: string, incomingContent: string): string {
  const normalPath = relativePath.replace(/\\/g, '/');

  if (MCP_CONFIG_PATHS.has(normalPath)) {
    return mergeMcpJson(existingContent, incomingContent);
  }

  if (normalPath === '.claude/settings.json') {
    return mergeClaudeSettingsJson(existingContent, incomingContent);
  }

  if (normalPath === 'AGENTS.md') {
    return mergeAgentsMd(existingContent, incomingContent);
  }

  throw new Error(
    `Merge is not supported for "${relativePath}". ` +
      'Supported paths: .cursor/mcp.json, .mcp.json, .claude/settings.json, AGENTS.md.',
  );
}
