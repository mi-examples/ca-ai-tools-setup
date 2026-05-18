export const ASSISTANTS = ['cursor', 'claude'] as const;

export type Assistant = (typeof ASSISTANTS)[number];

export const DEFAULT_ASSISTANTS: Assistant[] = ['cursor', 'claude'];

export const METADATA_VERSION = 5;

/** npm package installed/configured when `--qa-ai-rules` is enabled. */
export const QA_AI_RULES_PACKAGE = '@metricinsights/qa-ai-rules';

/** CLI binary from {@link QA_AI_RULES_PACKAGE} (used with `npm exec --`). */
export const QA_AI_RULES_CLI = 'qa-ai-rules';

export const SETUP_ASSISTANT_FILES = new Set(['setup-cursor-assistant.md', 'setup-claude-assistant.md']);
