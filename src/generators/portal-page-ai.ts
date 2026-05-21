import { readTemplate, readUiCheckSkillTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';

const FIGMA_CODE_CONNECT_TEMPLATES = [
  { rel: 'skills/figma-code-connect/SKILL.md', out: 'figma-code-connect/SKILL.md' },
  { rel: 'skills/figma-code-connect/references/api.md', out: 'figma-code-connect/references/api.md' },
  {
    rel: 'skills/figma-code-connect/references/advanced-patterns.md',
    out: 'figma-code-connect/references/advanced-patterns.md',
  },
] as const;

const PORTAL_PAGE_RULES = [
  'cursor/rules/linear-cli.mdc',
  'cursor/rules/linear-task-gates.mdc',
  'cursor/rules/portal-env-credentials.mdc',
  'cursor/rules/test-case-rules.mdc',
  'cursor/rules/test-suite-template.mdc',
  'cursor/rules/README.md',
] as const;

/** Shared Portal Page skills for Cursor (`.cursor/skills/`) or Claude (`.claude/skills/`). */
export function buildPortalPageSkillFiles(
  assistant: 'cursor' | 'claude',
  includeFigmaMcp: boolean,
): GeneratedFile[] {
  const skillsRoot = assistant === 'cursor' ? '.cursor/skills' : '.claude/skills';
  const readmeTemplate = assistant === 'cursor' ? 'cursor/skills/README.md' : 'claude/skills/README.md';

  const files: GeneratedFile[] = [
    { path: `${skillsRoot}/README.md`, content: readTemplate(readmeTemplate) },
    { path: `${skillsRoot}/ai-testing/SKILL.md`, content: readTemplate('skills/ai-testing/SKILL.md') },
    { path: `${skillsRoot}/ai-development/SKILL.md`, content: readTemplate('skills/ai-development/SKILL.md') },
    {
      path: `${skillsRoot}/ai-development/DOD-FULL.md`,
      content: readTemplate('skills/ai-development/DOD-FULL.md'),
    },
    { path: `${skillsRoot}/ui-check/SKILL.md`, content: readUiCheckSkillTemplate(assistant) },
  ];

  if (includeFigmaMcp) {
    for (const { rel, out } of FIGMA_CODE_CONNECT_TEMPLATES) {
      files.push({
        path: `${skillsRoot}/${out}`,
        content: readTemplate(rel),
      });
    }
  }

  return files;
}

/** Cursor rules (`.cursor/rules/*.mdc`) — shared with Claude Code per project convention. */
export function buildCursorRuleFiles(includeFigmaMcp: boolean): GeneratedFile[] {
  const files: GeneratedFile[] = PORTAL_PAGE_RULES.map((templatePath) => ({
    path: `.cursor/rules/${templatePath.replace('cursor/rules/', '')}`,
    content: readTemplate(templatePath),
  }));

  if (includeFigmaMcp) {
    files.push({
      path: '.cursor/rules/figma-mcp.mdc',
      content: readTemplate('cursor/rules/figma-mcp.mdc'),
    });
  }

  return files;
}
