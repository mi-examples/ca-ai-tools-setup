import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One level up from compiled `dist/*.js` or source `src/*.ts` → repo root, then `templates/`. */
const templateRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)));

export function readTemplate(relativePath: string): string {
  const fullPath = path.join(templateRoot, relativePath);

  return fs.readFileSync(fullPath, 'utf8');
}

const UI_CHECK_SKILL_PLACEHOLDERS: Record<'cursor' | 'claude', { bootstrapNote: string; linearWorkflowPath: string }> =
  {
    cursor: {
      bootstrapNote: 'when **Cursor** is included in the installer run.',
      linearWorkflowPath: '`.cursor/skills/linear-workflow/SKILL.md`',
    },
    claude: {
      bootstrapNote: 'when **Claude Code** is included in the installer run.',
      linearWorkflowPath: '`.claude/skills/linear-workflow/SKILL.md`',
    },
  };

/** Renders `templates/skills/ui-check/SKILL.md` for Cursor vs Claude Code paths. */
export function readUiCheckSkillTemplate(forAssistant: 'cursor' | 'claude'): string {
  const { bootstrapNote, linearWorkflowPath } = UI_CHECK_SKILL_PLACEHOLDERS[forAssistant];

  return readTemplate('skills/ui-check/SKILL.md')
    .replaceAll('__BOOTSTRAP_NOTE__', bootstrapNote)
    .replaceAll('__LINEAR_WORKFLOW_SKILL_PATH__', linearWorkflowPath);
}
