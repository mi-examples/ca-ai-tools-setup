import { ASSISTANTS, DEFAULT_ASSISTANTS, type Assistant } from './constants.js';
import { loadSetupMetadata } from './setup-metadata.js';

export type InteractiveDefaults = {
  assistants: Assistant[];
  figmaMcpInclude: boolean;
  qaAiRulesInclude: boolean;
};

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

function parseQaAiRulesInclude(meta: Record<string, unknown>): boolean | null {
  const block = meta.qaAiRules;

  if (!block || typeof block !== 'object') {
    return null;
  }

  const enabled = (block as Record<string, unknown>).enabled;

  return typeof enabled === 'boolean' ? enabled : null;
}

function parseFigmaMcpInclude(meta: Record<string, unknown>): boolean | null {
  const block = meta.figmaMcp;

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
  const loaded = loadSetupMetadata(targetDir);

  if (loaded.kind === 'missing' || loaded.kind === 'invalid') {
    return null;
  }

  if (loaded.kind === 'current') {
    return {
      assistants: loaded.metadata.assistants,
      figmaMcpInclude: loaded.metadata.figmaMcp.cursorFile || loaded.metadata.figmaMcp.projectRootFile,
      qaAiRulesInclude: loaded.metadata.qaAiRules.enabled,
    };
  }

  const meta = loaded.raw;
  const assistants = parseAssistants(meta) ?? DEFAULT_ASSISTANTS;

  const figma = parseFigmaMcpInclude(meta);
  const qa = parseQaAiRulesInclude(meta);

  return {
    assistants,
    figmaMcpInclude: figma ?? false,
    qaAiRulesInclude: qa ?? false,
  };
}
