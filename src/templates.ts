import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Assistant } from './constants.js';

/** One level up from compiled `dist/*.js` or source `src/*.ts` → repo root, then `templates/`. */
const templateRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)));

export function readTemplate(relativePath: string): string {
  const fullPath = path.join(templateRoot, relativePath);

  return fs.readFileSync(fullPath, 'utf8');
}

/** Every file under a template directory, as template-relative paths with forward slashes, sorted. */
export function listTemplateFiles(relativeDir: string): string[] {
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(path.join(templateRoot, dir), { withFileTypes: true })
      .flatMap((entry) => (entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]));

  return walk(relativeDir).sort();
}

const BLOCK_CONDITIONS = new Set(['cursor', 'claude', 'cursor-only']);

/**
 * Keep or drop the assistant-specific blocks of a shared template:
 *
 *     <!-- only:cursor -->
 *     …lines kept when Cursor is selected…
 *     <!-- /only -->
 *
 * Conditions: `cursor`, `claude`, and `cursor-only` (Cursor selected, Claude not). The marker lines
 * never reach the output. One template with blocks replaces a hand-maintained copy per assistant.
 */
export function renderAssistantBlocks(template: string, assistants: readonly Assistant[]): string {
  const applies = (condition: string): boolean => {
    if (!BLOCK_CONDITIONS.has(condition)) {
      throw new Error(`Unknown template block condition "${condition}".`);
    }

    return condition === 'cursor-only'
      ? assistants.includes('cursor') && !assistants.includes('claude')
      : assistants.includes(condition as Assistant);
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
