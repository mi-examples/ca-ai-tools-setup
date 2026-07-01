import { readTemplate } from '../templates.js';
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
  'cursor/rules/code-style.mdc',
  'cursor/rules/linear-cli.mdc',
  'cursor/rules/linear-task-gates.mdc',
  'cursor/rules/portal-env-credentials.mdc',
  'cursor/rules/test-case-rules.mdc',
  'cursor/rules/test-suite-template.mdc',
  'cursor/rules/README.md',
] as const;

/** Shared skills mirrored under `.cursor/skills/` and `.claude/skills/`. */
const SHARED_PORTAL_SKILLS = [
  'skills/ai-development/SKILL.md',
  'skills/ai-development/DOD-FULL.md',
] as const;

/** Cursor-only skills (Claude Code uses `.claude/workflows/` for QA orchestration). */
const CURSOR_ONLY_SKILLS = [
  'skills/testing-flow/SKILL.md',
  'skills/testing-with-linear/SKILL.md',
  'skills/ui-check-simple/SKILL.md',
  'skills/linear-report/SKILL.md',
  'skills/playwright-mcp/SKILL.md',
  'skills/linear-workflow/SKILL.md',
  'skills/test-documentation/SKILL.md',
  'skills/figma-implementation/SKILL.md',
  'skills/form-builder/SKILL.md',
] as const;

function skillTemplateToOutputPath(templateRel: string): string {
  const parts = templateRel.split('/');

  return `${parts[1]}/${parts[2]}`;
}

function buildSkillFilesForAssistant(
  assistant: 'cursor' | 'claude',
  includeFigmaMcp: boolean,
): GeneratedFile[] {
  const skillsRoot = assistant === 'cursor' ? '.cursor/skills' : '.claude/skills';

  const files: GeneratedFile[] = SHARED_PORTAL_SKILLS.map((rel) => ({
    path: `${skillsRoot}/${skillTemplateToOutputPath(rel)}`,
    content: readTemplate(rel),
  }));

  if (assistant === 'claude') {
    files.unshift({
      path: `${skillsRoot}/README.md`,
      content: readTemplate('claude/skills/README.md'),
    });
  }

  if (assistant === 'cursor') {
    for (const rel of CURSOR_ONLY_SKILLS) {
      files.push({
        path: `${skillsRoot}/${skillTemplateToOutputPath(rel)}`,
        content: readTemplate(rel),
      });
    }
  }

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

/** Shared Portal Page skills for Cursor (`.cursor/skills/`) or Claude (`.claude/skills/`). */
export function buildPortalPageSkillFiles(
  assistant: 'cursor' | 'claude',
  includeFigmaMcp: boolean,
): GeneratedFile[] {
  return buildSkillFilesForAssistant(assistant, includeFigmaMcp);
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
