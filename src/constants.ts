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

/**
 * Framelink Figma MCP: the server the generated MCP files register. It signs in with a personal
 * access token (`FIGMA_API_KEY`), so it needs no OAuth. Pinned, because the tools below are what
 * the `figma-implementation` skill calls and they have been renamed between releases.
 */
export const FIGMA_MCP_PACKAGE = 'figma-developer-mcp';

export const FIGMA_MCP_VERSION = '0.13.2';

/** The tools `FIGMA_MCP_VERSION` has. Every Figma tool a template names must be one of these. */
export const FIGMA_MCP_TOOLS = ['get_figma_data', 'download_figma_images'] as const;

/** Lowest Node.js major `@metricinsights/pp-dev` ≥ 1.0 runs on (its `engines.node`). */
export const MIN_NODE_MAJOR = 24;
