import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIN_NODE_MAJOR, PLAYWRIGHT_CLI_VERSION, type Assistant } from './constants.js';

/** One level up from compiled `dist/*.js` or source `src/*.ts` → repo root, then `templates/`. */
const templateRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)));

/** What a `{{NAME}}` placeholder in a template stands for. */
const TEMPLATE_VALUES: Readonly<Record<string, string>> = {
  PLAYWRIGHT_CLI_VERSION,
  MIN_NODE_MAJOR: String(MIN_NODE_MAJOR),
};

/**
 * Fill in the `{{NAME}}` placeholders of a template. Only upper-case names are placeholders, so
 * text such as `{{page}}` passes through. An unknown name is a typo in a template and throws:
 * left alone, it would reach a repository as a literal `{{…}}` inside a command.
 */
export function renderTemplateValues(template: string, extra: Readonly<Record<string, string>> = {}): string {
  return template.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (placeholder, name: string) => {
    const value = extra[name] ?? TEMPLATE_VALUES[name];

    if (value === undefined) {
      throw new Error(`Unknown template placeholder "${placeholder}".`);
    }

    return value;
  });
}

/**
 * `extra` carries the values that depend on where the template is generated, such as
 * `SKILLS_ROOT` for a skill file. A template that uses one must be read with it.
 */
export function readTemplate(relativePath: string, extra: Readonly<Record<string, string>> = {}): string {
  const fullPath = path.join(templateRoot, relativePath);

  return renderTemplateValues(fs.readFileSync(fullPath, 'utf8'), extra);
}

/** Every file under a template directory, as template-relative paths with forward slashes, sorted. */
export function listTemplateFiles(relativeDir: string): string[] {
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(path.join(templateRoot, dir), { withFileTypes: true })
      .flatMap((entry) => (entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]));

  return walk(relativeDir).sort();
}

const BLOCK_CONDITIONS = new Set(['cursor', 'claude', 'cursor-only', 'figma', 'no-figma']);

/** What the setup includes besides the assistants; decides the `figma` / `no-figma` blocks. */
export type TemplateFeatures = {
  figma?: boolean;
};

/**
 * Keep or drop the assistant-specific blocks of a shared template:
 *
 *     <!-- only:cursor -->
 *     …lines kept when Cursor is selected…
 *     <!-- /only -->
 *
 * Conditions: `cursor`, `claude`, `cursor-only` (Cursor selected, Claude not), and `figma` /
 * `no-figma` (Figma MCP and its skills are generated, or not). The marker lines never reach the
 * output. One template with blocks replaces a hand-maintained copy per assistant, and keeps a file
 * from pointing at a skill or a document this setup does not generate.
 */
export function renderAssistantBlocks(
  template: string,
  assistants: readonly Assistant[],
  features: TemplateFeatures = {},
): string {
  const applies = (condition: string): boolean => {
    if (!BLOCK_CONDITIONS.has(condition)) {
      throw new Error(`Unknown template block condition "${condition}".`);
    }

    switch (condition) {
      case 'cursor-only':
        return assistants.includes('cursor') && !assistants.includes('claude');
      case 'figma':
        return features.figma === true;
      case 'no-figma':
        return features.figma !== true;
      default:
        return assistants.includes(condition as Assistant);
    }
  };

  const rendered = template.replace(
    /<!-- only:([a-z-]+) -->\r?\n([\s\S]*?)<!-- \/only -->\r?\n/g,
    (_match, condition: string, body: string) => (applies(condition) ? body : ''),
  );

  if (/<!-- \/?only/.test(rendered)) {
    throw new Error('Template has an unbalanced or misplaced "only" block.');
  }

  return rendered;
}
