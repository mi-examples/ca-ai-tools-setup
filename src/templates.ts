import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One level up from compiled `dist/*.js` or source `src/*.ts` → repo root, then `templates/`. */
const templateRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)));

export function readTemplate(relativePath: string): string {
  const fullPath = path.join(templateRoot, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}
