export const ASSISTANTS = ['cursor', 'claude'] as const;

export type Assistant = (typeof ASSISTANTS)[number];

export const DEFAULT_ASSISTANTS: Assistant[] = ['cursor', 'claude'];

export const METADATA_VERSION = 6;

/** Stable prebuilt CLI tarball attached to GitHub Releases. */
export const RELEASE_TGZ_LATEST =
  'https://github.com/mi-examples/ca-ai-tools-setup/releases/latest/download/ca-ai-tools-setup.tgz';

/** npm package installed/configured when `--qa-ai-rules` is enabled. */
export const QA_AI_RULES_PACKAGE = '@metricinsights/qa-ai-rules';

/** CLI binary from {@link QA_AI_RULES_PACKAGE} (used with `npm exec --`). */
export const QA_AI_RULES_CLI = 'qa-ai-rules';

export const SETUP_ASSISTANT_FILES = new Set(['setup-cursor-assistant.md', 'setup-claude-assistant.md']);

/**
 * Versions the generated instructions name. Templates carry `{{PLAYWRIGHT_CLI_VERSION}}` and
 * `{{MIN_NODE_MAJOR}}`, and readTemplate() fills them in — so a bump is this file and nothing else.
 */

/** `@playwright/cli` version target repositories pin as a devDependency. */
export const PLAYWRIGHT_CLI_VERSION = '0.1.24';

/** Lowest Node.js major `@metricinsights/pp-dev` ≥ 1.0 runs on (its `engines.node`). */
export const MIN_NODE_MAJOR = 24;
