import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One level up from compiled `dist/*.js` or source `src/*.ts` → repo root, then `templates/`. */
const templateRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)));

export function readTemplate(relativePath: string): string {
  const fullPath = path.join(templateRoot, relativePath);

  return fs.readFileSync(fullPath, 'utf8');
}

/** Renders `templates/skills/ui-check/SKILL.{cursor,claude}.md` for the target assistant. */
export function readUiCheckSkillTemplate(forAssistant: 'cursor' | 'claude'): string {
  const variant = forAssistant === 'cursor' ? 'cursor' : 'claude';

  return readTemplate(`skills/ui-check/SKILL.${variant}.md`);
}
