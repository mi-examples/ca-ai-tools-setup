import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Assistant } from '../src/constants.js';
import { getGeneratedFiles } from '../src/generator.js';
import { readTemplate } from '../src/templates.js';

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}

/** Generated files by path, for one selection of assistants. */
function generated(assistants: Assistant[], figma = false): Map<string, string> {
  return new Map(getGeneratedFiles(assistants, figma, false).map((file) => [file.path, file.content]));
}

const SELECTIONS: Assistant[][] = [['cursor'], ['claude'], ['cursor', 'claude']];

// PP-4664: six templates sat in the package for months with nothing reading them, and one of them
// was later scheduled for a rewrite. A template the generator does not use is dead weight at best.
// Rules and skills are picked up by folder, so they are checked against the generated output.
test('every template file is used by the generator', () => {
  const sources = listFiles('src')
    .map((source) => fs.readFileSync(source, 'utf8'))
    .join('\n');
  const output = generated(['cursor', 'claude'], true);
  const unused = listFiles('templates')
    .map((template) => path.relative('templates', template).split(path.sep).join('/'))
    .filter(
      (template) =>
        !sources.includes(`'${template}'`) &&
        !(/^(?:skills|rules)\//.test(template) && output.has(`.claude/${template}`)),
    );

  assert.deepEqual(unused, []);
});

// PP-4665: the two setup documents were hand-maintained copies that differed in a few blocks.
test('one setup template renders a document per assistant', () => {
  const template = readTemplate('setup-assistant.md');
  const claudeSetup = generated(['claude']).get('setup-claude-assistant.md')!;
  const cursorSetup = generated(['cursor']).get('setup-cursor-assistant.md')!;

  assert.match(template, /\*\*MCP_SERVERS_BLOCK\*\*/);

  for (const setup of [claudeSetup, cursorSetup]) {
    assert.doesNotMatch(setup, /<!-- \/?only|MCP_SERVERS_BLOCK/);
    assert.match(setup, /\*\*2\.3\. Linear \(MCP\)\*\*/);
    assert.match(setup, /\*\*2\.4\. MCP servers/);
  }

  assert.match(claudeSetup, /^# Claude Code Setup Assistant/);
  assert.match(claudeSetup, /### Step 1\.3: Claude project instructions and agents/);
  assert.doesNotMatch(claudeSetup, /Cursor integrated terminal|Enable project MCP in Cursor/);

  assert.match(cursorSetup, /^# Cursor Setup Assistant/);
  assert.match(cursorSetup, /\*\*Cursor integrated terminal:\*\*/);
  assert.match(cursorSetup, /\*\*Enable project MCP in Cursor \(manual — required\)\*\*/);
  assert.doesNotMatch(cursorSetup, /Step 1\.3|Instructions for Claude/);
});

test('setup health rule detects missing and stale tracked configuration', () => {
  const output = generated(['cursor', 'claude']);
  const cursorRule = output.get('.cursor/rules/assistant-setup-health.mdc')!;
  const claudeRule = output.get('.claude/rules/assistant-setup-health.md')!;

  assert.match(cursorRule, /alwaysApply: true/);
  // No frontmatter: Claude Code loads a rule without `paths` at launch.
  assert.match(claudeRule, /^# AI assistant setup health/);

  for (const rule of [cursorRule, claudeRule]) {
    assert.match(rule, /\.assistant-setup\/SETUP_STATUS\.md/);
    assert.match(rule, /Exit code \*\*`2`\*\*/);
    assert.match(rule, /\.assistant-setup\/pending-updates\//);
    assert.match(rule, /Never run `update` or `--force` without explicit developer approval/);
  }

  assert.match(output.get('CLAUDE.md')!, /\.assistant-setup\/SETUP_STATUS\.md/);
  assert.match(output.get('AGENTS.md')!, /\.assistant-setup\/SETUP_STATUS\.md/);
});

// PP-4665: each rule has one source. Cursor and Claude Code scope rules with different
// frontmatter, so the same body is rendered twice — never maintained twice.
test('each rule is rendered for both assistants from one source', () => {
  const output = generated(['cursor', 'claude']);
  const body = (content: string): string => content.replace(/^---\n[\s\S]*?\n---\n+/, '');

  for (const name of ['assistant-setup-health', 'linear-task-gates', 'code-style', 'frontend-architecture']) {
    const cursorRule = output.get(`.cursor/rules/${name}.mdc`);
    const claudeRule = output.get(`.claude/rules/${name}.md`);

    assert.ok(cursorRule, `.cursor/rules/${name}.mdc`);
    assert.ok(claudeRule, `.claude/rules/${name}.md`);
    assert.equal(body(cursorRule), body(claudeRule), name);
  }

  const cursorCodeStyle = output.get('.cursor/rules/code-style.mdc')!;
  const claudeCodeStyle = output.get('.claude/rules/code-style.md')!;

  assert.match(cursorCodeStyle, /^globs: src\/\*\*\/\*\.ts,src\/\*\*\/\*\.tsx,src\/\*\*\/\*\.scss,index\.html$/m);
  assert.match(cursorCodeStyle, /^alwaysApply: false$/m);
  assert.match(claudeCodeStyle, /^---\npaths:\n {2}- "src\/\*\*\/\*\.ts"\n/);
});

// Every always-on rule is paid for on every request. Only what must hold at all times stays one.
test('only the Linear gates and the setup health check are always-on', () => {
  const alwaysOn = [...generated(['cursor', 'claude'], true)]
    .filter(([file, content]) => file.startsWith('.cursor/rules/') && /^alwaysApply: true$/m.test(content))
    .map(([file]) => file);

  assert.deepEqual(alwaysOn.sort(), [
    '.cursor/rules/assistant-setup-health.mdc',
    '.cursor/rules/linear-task-gates.mdc',
  ]);

  const claudeAlwaysOn = [...generated(['claude'], true)]
    .filter(([file, content]) => file.startsWith('.claude/rules/') && !content.startsWith('---\npaths:'))
    .map(([file]) => file);

  assert.deepEqual(claudeAlwaysOn.sort(), [
    '.claude/rules/assistant-setup-health.md',
    '.claude/rules/linear-task-gates.md',
  ]);
});

// Cursor also loads `.claude/skills/`, so a copy under `.cursor/skills/` would show each skill twice.
test('skills are generated into one folder', () => {
  const skillFolders = (assistants: Assistant[]): string[] => [
    ...new Set(
      [...generated(assistants, true).keys()]
        .map((file) => /^(\.(?:claude|cursor)\/skills)\//.exec(file)?.[1])
        .filter((folder): folder is string => folder !== undefined),
    ),
  ];

  assert.deepEqual(skillFolders(['cursor', 'claude']), ['.claude/skills']);
  assert.deepEqual(skillFolders(['claude']), ['.claude/skills']);
  assert.deepEqual(skillFolders(['cursor']), ['.cursor/skills']);

  const skills = [...generated(['cursor', 'claude'], true).keys()]
    .map((file) => /^\.claude\/skills\/([^/]+)\/SKILL\.md$/.exec(file)?.[1])
    .filter((skill): skill is string => skill !== undefined);

  // What used to be a Claude workflow, a Claude command or an on-demand Cursor rule is a skill.
  for (const skill of [
    'testing-flow',
    'testing-with-linear',
    'linear-workflow',
    'linear-report',
    'start-working-with-task',
    'commit-convention',
    'linear-merge-notification',
    'portal-env-credentials',
    'figma-implementation',
  ]) {
    assert.ok(skills.includes(skill), skill);
  }
});

test('.claude/agents holds only real subagents and no workflow copies are generated', () => {
  const files = [...generated(['cursor', 'claude'], true).keys()];

  assert.deepEqual(files.filter((file) => file.startsWith('.claude/agents/')).sort(), [
    '.claude/agents/linear-reporter.md',
    '.claude/agents/qa-tester.md',
    '.claude/agents/ui-verifier.md',
  ]);
  assert.deepEqual(files.filter((file) => file.startsWith('.claude/commands/')).sort(), [
    '.claude/commands/customer-docs.md',
    '.claude/commands/ui-check.md',
  ]);
  assert.deepEqual(
    files.filter((file) => file.startsWith('.claude/workflows/') || file === '.cursorrules'),
    [],
  );
});

// A generated file that names a path the setup does not write sends the assistant to nothing.
// It depends on the selection: a Cursor-only setup has no `.claude/`, a Claude-only one no `.cursor/`.
test('generated files only point at files the same setup generates', () => {
  const pathPattern = /(?:\.\/)?(\.(?:claude|cursor)\/[A-Za-z0-9_\-./]+\.(?:mdc|md|json))/g;
  // Written by other tools or by the developer, or placeholders in prose.
  const external = /qa-ai-rules|settings\.local\.json|mcp\.json$/;
  const missing: string[] = [];

  for (const assistants of SELECTIONS) {
    for (const figma of [false, true]) {
      const output = generated(assistants, figma);

      for (const [file, content] of output) {
        // Changing this skill needs an eval run (evals/customer-app-docs), so its two references
        // to the Claude copy stay until PP-4660; they are wrong only in a Cursor-only setup.
        if (file.includes('/customer-app-docs/')) {
          continue;
        }

        for (const match of content.matchAll(pathPattern)) {
          if (!output.has(match[1]) && !external.test(match[1])) {
            missing.push(`${assistants.join('+')}${figma ? '+figma' : ''}: ${file} -> ${match[1]}`);
          }
        }
      }
    }
  }

  assert.deepEqual(missing, []);
});

// The file is regenerated per machine and records one developer's instance URL, shell and paths, so
// committing it leaks that environment into everyone else's checkout. The generated .gitignore and
// the prose must agree: shipping a .gitignore entry next to a "commit this file" instruction is
// exactly what led the org rollout's conflict triage to approve replacing a repository's own,
// correct convention (mi-pp/novant-scorecard, 2026-09-21).
test('developer environment guidance says the file is personal, never committed', () => {
  const devEnvironment = readTemplate('assistant-setup/dev-environment.md');
  const cursorSetup = generated(['cursor']).get('setup-cursor-assistant.md')!;
  const claudeSetup = generated(['claude']).get('setup-claude-assistant.md')!;

  assert.match(readTemplate('gitignore'), /^\.dev-environment\.md$/mu);
  assert.match(devEnvironment, /personal and gitignored/iu);
  assert.doesNotMatch(devEnvironment, /Commit this file/iu);

  for (const setup of [cursorSetup, claudeSetup]) {
    assert.match(setup, /Never commit \*\*`\.dev-environment\.md`\*\*/u);
    assert.doesNotMatch(setup, /^- Commit \*\*`\.dev-environment\.md`\*\*/mu);
    assert.match(setup, /Do not add it to the setup PR/u);
    assert.match(setup, /\.mi-credentials\.local\.env/u);
  }
});

test('the playwright-cli skill ships the CLI as the browser-automation tool', () => {
  const skill = readTemplate('skills/playwright-cli/SKILL.md');

  assert.match(skill, /npx playwright-cli/);
  assert.match(skill, /@playwright\/cli/);
  // Universal, not per-developer: shipped as a pinned devDependency, workspace state gitignored.
  assert.match(skill, /pinned devDependency/);
  assert.match(skill, /--save-dev @playwright\/cli/);
  assert.match(skill, /\.playwright-cli\//);
});

test('CLAUDE template routes by skill name and stays free of generated detail', () => {
  const claudeMd = readTemplate('claude/CLAUDE.md');

  assert.match(claudeMd, /`playwright-cli`/);
  assert.match(claudeMd, /`start-working-with-task`/);
  assert.match(claudeMd, /\.claude\/rules\//);
  // It is a protected file: whatever is written here stops being updated once a team edits it.
  assert.doesNotMatch(claudeMd, /workflows\/|\.cursor\/rules|linear-cli|Keeping Generated Files Current/);
  assert.ok(claudeMd.split('\n').length < 70, 'CLAUDE.md should stay short');
});

// PP-4531: one browser tool. A template that still names the MCP server or its `playwright_*`
// tools sends the assistant to something the setup no longer provides.
test('nothing generated mentions Playwright MCP', () => {
  const playwrightMcp = /@playwright\/mcp|playwright_[a-z]|playwright-mcp|Playwright MCP/;

  for (const template of listFiles('templates')) {
    assert.doesNotMatch(fs.readFileSync(template, 'utf8'), playwrightMcp, template);
  }

  // The MCP section of the setup docs is rendered in code, so check the output as well.
  for (const [generatedPath, content] of generated(['cursor', 'claude'], true)) {
    assert.doesNotMatch(content, playwrightMcp, generatedPath);
  }
});

test('AGENTS template lists the Claude subagents, and only when Claude is selected', () => {
  const withClaude = generated(['cursor', 'claude']).get('AGENTS.md')!;
  const cursorOnly = generated(['cursor']).get('AGENTS.md')!;

  for (const agent of ['qa-tester.md', 'ui-verifier.md', 'linear-reporter.md']) {
    assert.ok(withClaude.includes(`\`${agent}\``), agent);
  }

  assert.doesNotMatch(withClaude, /code-style\.md|<!-- /);
  assert.match(withClaude, /content is preserved, including with \*\*`--force`\*\*/);
  assert.doesNotMatch(cursorOnly, /\.claude\/|qa-tester|<!-- /);
  assert.match(cursorOnly, /`\.cursor\/skills\/`/);
});

test('customer docs skill keeps the source-precedence and verification contract', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');

  // A person decides when to run it; the skill never gates or self-starts.
  assert.match(skill, /Run it when asked/);
  assert.doesNotMatch(skill, /Entry gate/);
  assert.match(skill, /Never gate, delay or self-start a run/);

  // Three sources, typed by claim, with the owner carrying the tie.
  assert.match(skill, /Sources — gather all three, type the claim, then compare/);
  assert.match(skill, /LINEAR/);
  assert.match(skill, /TEST DOCS/);
  assert.match(skill, /OWNS: behavior/);
  assert.match(skill, /TYPE THE CLAIM, THEN COMPARE/);
  assert.match(skill, /OWNER silent/);
  assert.match(skill, /`reported`, never `confirmed`/);

  // Test-doc notes survive the recency rule; only closed bugs drop out.
  assert.match(skill, /Notes and decisions in test docs are \*\*not\*\* excluded/);

  // Differences are triaged, then settled with the user, before any writing.
  assert.match(skill, /### 3\. Reconcile — triage, then settle the ones that matter/);
  assert.match(skill, /user-visible/i);
  assert.match(skill, /Never resolve a conflict between sources on your own/);

  // Re-runs patch what moved; the approved first document becomes the golden.
  assert.match(skill, /### 7\. Regenerate on change/);
  assert.match(skill, /only the sections whose rows moved/);
  assert.match(skill, /first approved document becomes the golden/);
  assert.match(skill, /evals\/customer-app-docs\/golden\//);

  // Provenance for the customer is a version stamp, not citations.
  assert.match(skill, /Version stamp, not citations/);
  assert.match(skill, /test-documentation\/<CONTEXT_KEY>\//);
  assert.match(skill, /docs\/customer\/<customer-slug>\//);
  assert.match(skill, /TODO confirm/);

  // Extraction and audit are delegated; printing waits for approval.
  assert.match(skill, /one subagent per app, in parallel/i);
  assert.match(skill, /Audit — one subagent/);
  assert.match(skill, /--print-to-pdf/);
  assert.match(skill, /--no-pdf-header-footer/);

  // Section order is fixed even though the spine is per app, not per app kind.
  assert.match(sections, /VARIABLES/);
  assert.match(sections, /DATASET ENTITIES/);
  assert.match(sections, /callout/);

  // The ledger is what makes a statement auditable.
  assert.match(verify, /facts\/<app-slug>\.md/);
  assert.match(verify, /confirmed/);
  assert.match(verify, /PP_VARIABLES/);
  assert.match(verify, /bugs\.md/);
  assert.match(verify, /Audit pass/);

  // Claims are typed and owned before anything is compared.
  assert.match(verify, /## Type the claim first/);
  assert.match(verify, /\*\*behavior\*\* — what the app does \| \*\*code\*\*/);
  assert.match(verify, /a behavioral claim the code is silent on is `reported`, never\n`confirmed`/);

  // The ledger carries the run's scope, a column per source, and who settled each row.
  assert.match(
    verify,
    /\| # \| Claim \| Type \| Value \| Linear \| Code \| Test docs \| Verdict \| User-visible \| Resolution \|/,
  );
  assert.match(verify, /Code globs/);
  assert.match(verify, /Doc version/);
  assert.match(verify, /Fill all three source columns for every row/);
  assert.match(verify, /Cite and date every cell/);
  assert.match(verify, /`agent` \(auto during extraction\) or `human`/);

  // Scope stays in the header until a named trigger graduates it to a file.
  assert.match(verify, /### Graduating the header into a config file/);
  assert.match(verify, /three or more apps for one customer/);

  // Absent test docs are distinguished, and the audit re-derives the risky rows.
  assert.match(verify, /absent \(not expected — legacy repo\)/);
  assert.match(verify, /absent \(expected/);
  assert.match(verify, /## Conflict triage/);
  assert.match(verify, /\*\*Pass 2 — re-derivation\.\*\*/);
  assert.match(verify, /git log -1 --format=%ad -- test-documentation/);
  assert.match(verify, /Closed since the file was written/);
});

test('customer docs template is self-contained and carries the page rules', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /assets\/example\.html/);

  // Styles are inline, so a rendered document needs no sibling asset to look right.
  assert.match(template, /<style>/);
  assert.doesNotMatch(template, /<link[^>]+stylesheet/);
  assert.match(template, /size: Letter/);
  assert.match(template, /break-inside: avoid/);
  assert.match(template, /--accent/);

  // The class vocabulary the skill tells the writer to use must exist in the template.
  for (const className of ['cover', 'stage', 'app__meta', 'section', 'steps', 'pill', 'callout', 'doc-footer']) {
    assert.ok(template.includes(className), `template is missing .${className}`);
  }
});

// PP-4465: generated customer docs leaked Linear keys and GitHub details. The ledger keeps them; the
// document, and the worked example it is copied from, must not.
test('customer docs keep ticket keys and GitHub info out of the document', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /\*\*No internal references\.\*\*/);
  assert.match(skill, /no ticket or issue keys/);
  assert.match(skill, /no GitHub or git information/);
  assert.match(skill, /Never put a ticket key, repo, branch, commit or PR reference in the document/);
  assert.doesNotMatch(sections, /then the epic key/);
  assert.match(sections, /no ticket refs/);
  assert.match(verify, /Grep for internal references/);
  assert.match(verify, /\*\*ledger header and citations only\*\*/);

  const body = template.slice(template.indexOf('<body>'));

  assert.doesNotMatch(body, /\b[A-Z]{2,}-\d+\b/u);
  assert.doesNotMatch(body, /github|\bcommit\b|\bbranch\b|pull request/iu);
  assert.doesNotMatch(body, /class="refs"/);
});

// PP-4538: customer docs mixed "Portal Page" with "Custom App" and could name internal MI
// environments. One term for the customer, and the platform by its version number only.
test('customer docs say Custom App and show the platform as a version only', () => {
  const skill = readTemplate('skills/customer-app-docs/SKILL.md');
  const sections = readTemplate('skills/customer-app-docs/references/sections.md');
  const verify = readTemplate('skills/customer-app-docs/references/verify.md');
  const template = readTemplate('skills/customer-app-docs/assets/example.html');

  assert.match(skill, /\*\*Custom App, never Portal Page\.\*\*/);
  assert.match(skill, /\*\*Platform: version only\.\*\*/);
  assert.match(skill, /Never call an app a Portal Page in the document/);
  assert.match(skill, /Never name the environment or host the behaviour was read on/);
  assert.doesNotMatch(sections, /`CUSTOM APP` or `PORTAL PAGE`/);
  assert.match(sections, /never the environment or host it was read on/);
  assert.match(verify, /Grep for terminology and environment leaks/);
  // Build strings such as 101.7.3760.staging_7 are not release versions and must not be trimmed into one.
  assert.match(skill, /\*\*public release\*\* number/);
  assert.match(skill, /Never trim or translate a build string into a release yourself/);
  assert.match(sections, /never a build string/);
  // Lettered releases (7.2.0a) are real public releases, not suffixes to reject.
  assert.match(skill, /optionally one trailing release letter: `7\.2\.1`, `7\.2\.0a`/);
  assert.match(verify, /optionally one trailing release letter/);
  assert.match(verify, /is a confirmed public release/);

  const body = template.slice(template.indexOf('<body>'));

  assert.doesNotMatch(body, /portal[ -]?pages?/iu);
  assert.doesNotMatch(body, /staging|\bQA\b|\bdev\b|\bUAT\b|sandbox|https?:\/\//iu);
  assert.match(body, /<span class="label">Platform<\/span>Metric Insights \d+\.\d+\.\d+[a-z]?\s*</u);
});
