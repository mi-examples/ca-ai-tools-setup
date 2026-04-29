import fs from 'node:fs';
import path from 'node:path';
import { ASSISTANTS, DEFAULT_ASSISTANTS, type Assistant } from './constants.js';

export type InteractiveDefaults = {
  assistants: Assistant[];
  playwrightMcpInclude: boolean;
  figmaMcpInclude: boolean;
};

const METADATA_PATH = '.assistant-setup/ca-ai-tools-setup.json';

function isAssistant(value: unknown): value is Assistant {
  return typeof value === 'string' && (ASSISTANTS as readonly string[]).includes(value);
}

function parseAssistants(meta: Record<string, unknown>): Assistant[] | null {
  if (Array.isArray(meta.assistants)) {
    const filtered = meta.assistants.filter(isAssistant);

    return filtered.length > 0 ? filtered : null;
  }

  if (isAssistant(meta.assistant)) {
    return [meta.assistant];
  }

  return null;
}

function parseMcpInclude(
  meta: Record<string, unknown>,
  key: 'playwrightMcp' | 'figmaMcp',
): boolean | null {
  const block = meta[key];

  if (!block || typeof block !== 'object') {
    return null;
  }

  const o = block as Record<string, unknown>;

  return Boolean(o.cursorFile === true || o.projectRootFile === true);
}

/**
 * Reads the last generated `.assistant-setup/ca-ai-tools-setup.json` so interactive CLI prompts
 * can default to the previous run's choices.
 */
export function loadPreviousInteractiveDefaults(targetDir: string): InteractiveDefaults | null {
  const fullPath = path.join(targetDir, METADATA_PATH);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  let raw: unknown;

  try {
    raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const meta = raw as Record<string, unknown>;
  const assistants = parseAssistants(meta) ?? DEFAULT_ASSISTANTS;

  const playwright = parseMcpInclude(meta, 'playwrightMcp');
  const figma = parseMcpInclude(meta, 'figmaMcp');

  return {
    assistants,
    playwrightMcpInclude: playwright ?? true,
    figmaMcpInclude: figma ?? false,
  };
}
