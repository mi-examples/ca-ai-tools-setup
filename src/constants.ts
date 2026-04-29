export const ASSISTANTS = ['cursor', 'claude'] as const;

export type Assistant = (typeof ASSISTANTS)[number];

export const DEFAULT_ASSISTANTS: Assistant[] = ['cursor', 'claude'];

export const METADATA_VERSION = 4;

export const SETUP_ASSISTANT_FILES = new Set(['setup-cursor-assistant.md', 'setup-claude-assistant.md']);
