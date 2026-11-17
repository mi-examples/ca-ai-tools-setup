import type { Assistant } from '../constants.js';
import { listTemplateFiles, readTemplate, renderAssistantBlocks } from '../templates.js';
import type { GeneratedFile } from './types.js';

/** Skills every setup gets. Each is a folder under `templates/skills/`, generated as it is. */
export const BASE_SKILLS = [
  'ai-development',
  'commit-convention',
  'customer-app-docs',
  'linear-merge-notification',
  'linear-report',
  'linear-workflow',
  'playwright-cli',
  'portal-env-credentials',
  'start-working-with-task',
  'test-documentation',
  'testing-flow',
  'testing-with-linear',
  'ui-check-simple',
] as const;

/** Skills that need the Figma MCP server, so they are generated only together with it. */
export const FIGMA_SKILLS = ['figma-implementation'] as const;

/**
 * One skills folder per repository. Cursor also loads skills from `.claude/skills/`, so when Claude
 * Code is selected that folder serves both assistants; a second copy under `.cursor/skills/` would
 * show every skill to Cursor twice and give the two copies a chance to drift.
 */
export function skillsRoot(assistants: readonly Assistant[]): string {
  return assistants.includes('claude') ? '.claude/skills' : '.cursor/skills';
}

export function buildSkillFiles(assistants: readonly Assistant[], includeFigmaMcp: boolean): GeneratedFile[] {
  const root = skillsRoot(assistants);
  const skills = includeFigmaMcp ? [...BASE_SKILLS, ...FIGMA_SKILLS] : [...BASE_SKILLS];

  // A skill names its own files by full path (a subagent it prompts has no other way to find
  // them), and that path depends on the selection — hence SKILLS_ROOT. The blocks keep a skill from
  // sending the assistant to a Figma skill or a setup document that this setup does not have.
  const render = (template: string): string => {
    const content = readTemplate(template, { SKILLS_ROOT: root });

    return template.endsWith('.md') ? renderAssistantBlocks(content, assistants, { figma: includeFigmaMcp }) : content;
  };

  return skills.flatMap((skill) =>
    listTemplateFiles(`skills/${skill}`).map((template) => ({
      path: `${root}/${template.replace(/^skills\//, '')}`,
      content: render(template),
    })),
  );
}
