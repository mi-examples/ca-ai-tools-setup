/**
 * Whether to generate Figma MCP config files for the assistants selected in this run.
 * Cursor -> `.cursor/mcp.json`; Claude -> `.mcp.json` in the repository root.
 */
export function parseFigmaMcpArg(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const v = value.trim().toLowerCase();

  if (v === 'yes' || v === 'true' || v === '1' || v === 'figma' || v === 'on') {
    return true;
  }

  if (v === 'none' || v === 'no' || v === 'false' || v === '0' || v === 'off') {
    return false;
  }

  throw new Error(
    `Invalid --mcp-figma value "${value}". Use "yes" (or yes/true/1/figma/on) to ` +
      `add MCP files for selected assistants, or "no" (or none/false/0/off) to skip.`,
  );
}
