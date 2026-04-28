import { ASSISTANTS, type Assistant } from './constants.js';

export function isAssistant(value: string): value is Assistant {
  return ASSISTANTS.includes(value as Assistant);
}

export function parseAssistantsArg(value: string | undefined): Assistant[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length === 0) {
    throw new Error('The --assistants option must include at least one assistant.');
  }

  const invalid = parsed.filter((item) => !isAssistant(item));

  if (invalid.length > 0) {
    throw new Error(`Unknown assistant(s): ${invalid.join(', ')}. Supported values: ${ASSISTANTS.join(', ')}`);
  }

  return Array.from(new Set(parsed)) as Assistant[];
}
