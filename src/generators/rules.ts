import type { Assistant } from '../constants.js';
import { readTemplate } from '../templates.js';
import type { GeneratedFile } from './types.js';

/**
 * Rules have one source each under `templates/rules/`. Cursor and Claude Code load rules from
 * different folders and scope them with different frontmatter, so each selected assistant gets the
 * same body rendered in its own format — never a second hand-maintained copy.
 *
 * Only what must hold on every request (`apply: always`) or belongs to a set of files (`paths`) is
 * a rule. Guidance needed now and then is a skill: both assistants load a skill on demand, while
 * Claude Code loads every rule without `paths` at launch.
 */
export const RULE_NAMES = [
  'assistant-setup-health',
  'linear-task-gates',
  'code-style',
  'frontend-architecture',
] as const;

export type RuleSource = {
  description: string;
  /** Glob patterns the rule is limited to; empty for a rule that always applies. */
  paths: string[];
  body: string;
};

export function parseRuleSource(name: string, raw: string): RuleSource {
  const text = raw.replace(/\r\n/g, '\n');
  const frontmatter = /^---\n([\s\S]*?)\n---\n+/.exec(text);

  if (!frontmatter) {
    throw new Error(`Rule template "${name}" has no frontmatter.`);
  }

  let description = '';
  let always = false;
  const paths: string[] = [];

  for (const line of frontmatter[1].split('\n')) {
    const listItem = /^\s+-\s+(.+)$/.exec(line);

    if (listItem) {
      paths.push(listItem[1].trim());
      continue;
    }

    const pair = /^([a-z]+):\s*(.*)$/.exec(line);

    if (pair?.[1] === 'description') {
      description = pair[2].trim();
    } else if (pair?.[1] === 'apply') {
      always = pair[2].trim() === 'always';
    }
  }

  if (!description || always === paths.length > 0) {
    throw new Error(`Rule template "${name}" needs a description and either "apply: always" or a "paths" list.`);
  }

  return { description, paths, body: text.slice(frontmatter[0].length) };
}

/** Cursor: `.mdc` with `alwaysApply` for an always-on rule, `globs` for one attached by file. */
export function renderCursorRule(rule: RuleSource): string {
  const always = rule.paths.length === 0;

  return [
    '---',
    `description: ${rule.description}`,
    always ? 'globs:' : `globs: ${rule.paths.join(',')}`,
    `alwaysApply: ${always}`,
    '---',
    '',
    rule.body,
  ].join('\n');
}

/** Claude Code: plain markdown loads at launch; a `paths` list limits the rule to matching files. */
export function renderClaudeRule(rule: RuleSource): string {
  if (rule.paths.length === 0) {
    return rule.body;
  }

  return ['---', 'paths:', ...rule.paths.map((pattern) => `  - "${pattern}"`), '---', '', rule.body].join('\n');
}

export function buildRuleFiles(assistants: readonly Assistant[]): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  for (const name of RULE_NAMES) {
    const rule = parseRuleSource(name, readTemplate(`rules/${name}.md`));

    if (assistants.includes('cursor')) {
      files.push({ path: `.cursor/rules/${name}.mdc`, content: renderCursorRule(rule) });
    }

    if (assistants.includes('claude')) {
      files.push({ path: `.claude/rules/${name}.md`, content: renderClaudeRule(rule) });
    }
  }

  return files;
}
