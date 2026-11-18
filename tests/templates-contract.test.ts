import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FIGMA_MCP_PACKAGE,
  FIGMA_MCP_TOOLS,
  FIGMA_MCP_VERSION,
  MIN_NODE_MAJOR,
  PLAYWRIGHT_CLI_VERSION,
  type Assistant,
} from '../src/constants.js';
import { getGeneratedFiles } from '../src/generator.js';
import { readTemplate, renderAssistantBlocks, renderTemplateValues } from '../src/templates.js';

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

// A generated file that names something the setup does not write sends the assistant to nothing.
// What exists depends on the selection: a Cursor-only setup has no `.claude/`, a Claude-only one no
// `.cursor/`, and the Figma skills come only with Figma MCP. Three kinds of reference are checked:
// paths under an assistant folder (files and folders), skills named as "the `x` skill", and the
// setup documents.
test('generated files only point at files the same setup generates', () => {
  const pathPattern = /(?:\.\/)?(\.(?:claude|cursor)\/[A-Za-z0-9_\-./]*[A-Za-z0-9_-])/g;
  const skillPattern = /\*{0,2}`([a-z][a-z0-9-]+)`\*{0,2} skills?\b|\bskill \*{0,2}`([a-z][a-z0-9-]+)`/g;
  const setupDocPattern = /setup-(?:cursor|claude)-assistant\.md/g;
  // Written by other tools or by the developer.
  const external = /qa-ai-rules|settings\.local\.json|mcp\.json$/;
  const missing: string[] = [];

  for (const assistants of SELECTIONS) {
    for (const figma of [false, true]) {
      const output = generated(assistants, figma);
      const label = `${assistants.join('+')}${figma ? '+figma' : ''}`;
      const folders = new Set(
        [...output.keys()].flatMap((filePath) => {
          const parts = filePath.split('/');

          return parts.slice(1).map((_part, index) => parts.slice(0, index + 1).join('/'));
        }),
      );
      const skills = new Set(
        [...output.keys()].flatMap((filePath) => /\/skills\/([^/]+)\/SKILL\.md$/.exec(filePath)?.[1] ?? []),
      );

      for (const [file, content] of output) {
        for (const [, target] of content.matchAll(pathPattern)) {
          if (!output.has(target) && !folders.has(target) && !external.test(target)) {
            missing.push(`${label}: ${file} -> ${target}`);
          }
        }

        for (const [, before, after] of content.matchAll(skillPattern)) {
          if (!skills.has(before ?? after)) {
            missing.push(`${label}: ${file} -> skill ${before ?? after}`);
          }
        }

        for (const [setupDoc] of content.matchAll(setupDocPattern)) {
          if (!output.has(setupDoc)) {
            missing.push(`${label}: ${file} -> ${setupDoc}`);
          }
        }
      }
    }
  }

  assert.deepEqual(missing, []);
});

// The Figma skills are generated only together with Figma MCP. Without it nothing may send the
// assistant to them, or to the "Figma MCP rules" that an older release had and this one does not.
test('nothing points at the Figma skills unless Figma MCP is generated', () => {
  for (const assistants of SELECTIONS) {
    for (const [filePath, content] of generated(assistants, false)) {
      assert.doesNotMatch(content, /figma-implementation|figma-code-connect|Figma MCP rules/, filePath);
      assert.doesNotMatch(content, /<!-- \/?only/, `${filePath} keeps a block marker`);
    }

    const withFigma = generated(assistants, true);
    const root = assistants.includes('claude') ? '.claude/skills' : '.cursor/skills';

    assert.match(withFigma.get(`${root}/ui-check-simple/SKILL.md`)!, /`figma-implementation`/);
    assert.match(withFigma.get(`${root}/ai-development/SKILL.md`)!, /Follow the \*\*`figma-implementation`\*\* skill/);
    assert.doesNotMatch(withFigma.get(`${root}/ai-development/SKILL.md`)!, /Figma MCP is not set up/);
  }

  assert.match(generated(['claude'], false).get('.claude/skills/ai-development/SKILL.md')!, /Figma MCP is not set up/);
  assert.doesNotMatch(generated(['claude'], false).get('CLAUDE.md')!, /Figma design to code/);
  assert.match(generated(['claude'], true).get('CLAUDE.md')!, /\| Figma design to code \| `figma-implementation`/);
});

// A skill prompts subagents with the full path of its own files, so the path has to be the folder
// the skill was really generated into — `.cursor/skills` in a Cursor-only setup.
// PP-4661: the setup registered Framelink while one skill called tools only the official Figma MCP
// has, so that skill could never work. The server is one, pinned, and the templates name its tools.
test('every Figma tool a template names exists on the server the setup registers', () => {
  const output = generated(['cursor', 'claude'], true);
  const skill = output.get('.claude/skills/figma-implementation/SKILL.md')!;
  // Tools are the only snake_case names in backticks in that skill; parameters are camelCase.
  const named = new Set([...skill.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map(([, tool]) => tool));

  assert.deepEqual([...named].sort(), [...FIGMA_MCP_TOOLS].sort());

  for (const [filePath, content] of output) {
    // Tools of the official Figma MCP, and a server name that belonged to one project.
    assert.doesNotMatch(
      content,
      /get_design_context|get_variable_defs|get_code_connect|get_context_for_code_connect|get_metadata|project-0-/,
      filePath,
    );
  }

  assert.equal(output.has('.claude/skills/figma-code-connect/SKILL.md'), false);
});

test('the Figma server is pinned and takes its token without OAuth, per client', () => {
  type Server = { command: string; args: string[]; env: Record<string, string> };
  const output = generated(['cursor', 'claude'], true);
  const server = (filePath: string): Server =>
    (JSON.parse(output.get(filePath)!) as { mcpServers: { figma: Server } }).mcpServers.figma;
  const claude = server('.mcp.json');
  const cursor = server('.cursor/mcp.json');

  for (const config of [claude, cursor]) {
    assert.equal(config.args[1], `${FIGMA_MCP_PACKAGE}@${FIGMA_MCP_VERSION}`);
    assert.equal(config.env.FRAMELINK_TELEMETRY, 'off');
    assert.doesNotMatch(JSON.stringify(config), /oauth/i);
  }

  // Claude Code: an unset variable must become an empty value, not the literal placeholder, so the
  // server falls back to the repository's .env instead of sending a bogus token to Figma.
  assert.equal(claude.env.FIGMA_API_KEY, '${FIGMA_API_KEY:-}');
  // Cursor: its own placeholder syntax, and the .env file and image folder by explicit path.
  assert.equal(cursor.env.FIGMA_API_KEY, '${env:FIGMA_API_KEY}');
  assert.deepEqual(cursor.args.slice(3), ['--env', '${workspaceFolder}/.env', '--image-dir', '${workspaceFolder}']);

  // The setup documents show the same entry they tell the developer to check.
  assert.ok(output.get('setup-claude-assistant.md')!.includes(`"${FIGMA_MCP_PACKAGE}@${FIGMA_MCP_VERSION}"`));
  assert.match(output.get('setup-cursor-assistant.md')!, /\$\{workspaceFolder\}\/\.env/);
});

// Two reference files of a skill were generated with nothing in them; a link to an empty file is a
// dead end the assistant still spends a read on.
test('no generated file is empty', () => {
  for (const assistants of SELECTIONS) {
    for (const figma of [false, true]) {
      for (const [filePath, content] of generated(assistants, figma)) {
        assert.notEqual(content.trim(), '', filePath);
      }
    }
  }
});

test('a skill names its own files under the folder it is generated into', () => {
  const cursorOnly = generated(['cursor']).get('.cursor/skills/customer-app-docs/SKILL.md')!;
  const withClaude = generated(['cursor', 'claude']).get('.claude/skills/customer-app-docs/SKILL.md')!;

  assert.match(cursorOnly, /Read `\.cursor\/skills\/customer-app-docs\/references\/verify\.md`/);
  assert.match(cursorOnly, /cp \.cursor\/skills\/customer-app-docs\/assets\/example\.html /);
  assert.doesNotMatch(cursorOnly, /\.claude\//);
  assert.match(withClaude, /Read `\.claude\/skills\/customer-app-docs\/references\/verify\.md`/);
  assert.doesNotMatch(withClaude, /\.cursor\//);
});

test('template blocks follow the assistants and the Figma selection', () => {
  const template = [
    'always',
    '<!-- only:figma -->',
    'with figma',
    '<!-- /only -->',
    '<!-- only:no-figma -->',
    'without figma',
    '<!-- /only -->',
    '<!-- only:cursor-only -->',
    'cursor alone',
    '<!-- /only -->',
    '',
  ].join('\n');

  assert.equal(renderAssistantBlocks(template, ['cursor'], { figma: true }), 'always\nwith figma\ncursor alone\n');
  assert.equal(renderAssistantBlocks(template, ['cursor', 'claude']), 'always\nwithout figma\n');
  assert.throws(
    () => renderAssistantBlocks('<!-- only:figmaa -->\nx\n<!-- /only -->\n', ['claude']),
    /Unknown template block/,
  );
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
    // PP-4663: one file for secrets, and it is the one every repository already ignores.
    assert.match(setup, /Credentials and tokens belong in \*\*`\.env`\*\*/u);
    assert.doesNotMatch(setup, /\.mi-credentials\.local\.env/u);
  }
});

// PP-4663: the same portal login was described with five sets of names in three files and three
// login URLs, so the assistant had to guess. The names are listed once, in the credentials skill;
// everything else may use a name from that list and nothing else.
test('one credential scheme: every variable a template names is listed in the credentials skill', () => {
  const credentialName = new RegExp(
    [
      'MI_[A-Z]+(?:_[A-Z]+)*',
      'QA_(?:USER|PASS)_[A-Z]+',
      'DEFAULT_(?:USERNAME|PASSWORD)_[A-Z]+',
      'PP_(?:USER|PASS|LOCAL_APP_URL)',
      'PAGE_URL',
      'BASE_URL',
      'APPLICATION_(?:ID|KEY)',
    ]
      .map((name) => `\\b${name}\\b`)
      .join('|'),
    'g',
  );

  for (const assistants of SELECTIONS) {
    const output = generated(assistants, true);
    const root = assistants.includes('claude') ? '.claude/skills' : '.cursor/skills';
    const skillPath = `${root}/portal-env-credentials/SKILL.md`;
    const skill = output.get(skillPath)!;
    const [scheme, olderNames] = skill.split('## Older names');
    const listed = new Set(scheme.match(credentialName));

    for (const name of ['MI_ACCESS_TOKEN', 'MI_ACCESS_TOKEN_REGULAR', 'DEFAULT_USERNAME_ADMIN', 'QA_USER_POWER']) {
      assert.ok(listed.has(name), `${name} is not listed in the credentials skill`);
    }

    // The retired names live only in the "Older names" table, as a documented fallback.
    for (const retired of ['MI_USERNAME', 'MI_PASSWORD', 'PP_USER', 'PP_PASS', 'PAGE_URL', 'PP_LOCAL_APP_URL']) {
      assert.equal(listed.has(retired), false, `${retired} is still part of the scheme`);
      assert.ok(olderNames.includes(retired), `${retired} is not documented as an older name`);
    }

    for (const [filePath, content] of output) {
      if (filePath === skillPath) {
        continue;
      }

      for (const name of content.match(credentialName) ?? []) {
        assert.ok(listed.has(name), `${filePath} names ${name}, which the credentials skill does not list`);
      }

      assert.doesNotMatch(content, /\.mi-credentials/, filePath);
    }
  }

  assert.match(readTemplate('gitignore'), /^\.env$/mu);
});

test('one login URL: /login, and only on the password path', () => {
  for (const assistants of SELECTIONS) {
    for (const [filePath, content] of generated(assistants, true)) {
      assert.doesNotMatch(content, /\/auth\/login|redirects to \/auth|localhost:[<\w>]+\/auth\b/, filePath);
    }
  }

  const skill = generated(['claude']).get('.claude/skills/portal-env-credentials/SKILL.md')!;

  assert.match(skill, /`\/login` on the host you sign in on — the only login path/);
  // Token first: no login page at all, and roles through pp-dev's per-user hosts.
  assert.match(skill, /there is no login page/);
  assert.match(skill, /\/@api\/users/);
  assert.match(skill, /regular\.localhost:<port>/);
  // The role token is read from .env inside the command, never written into it.
  assert.match(skill, /node --env-file=\.env -e "[^\n]*process\.env\.MI_ACCESS_TOKEN_REGULAR/);
});

// PR #25 review. With the developer's token set, pp-dev signs every request on localhost as the
// developer, so a role that has only a password must sign in on its own host — or the run tests
// the developer's permissions. And a password must reach the form unchanged and unseen: a shell
// loader rewrites `$`, quotes and `#`, and the CLI prints the text it fills in.
test('a password role signs in on its own host, and no shell or output touches the password', () => {
  const output = generated(['cursor', 'claude'], true);
  const skill = output.get('.claude/skills/portal-env-credentials/SKILL.md')!;

  assert.match(
    skill,
    /\| `MI_ACCESS_TOKEN` is set[^\n]*\| the role's own host: `http:\/\/<role>\.localhost:<port>\/login` \|/,
  );
  assert.match(skill, /\| no `MI_ACCESS_TOKEN` \| `http:\/\/localhost:<port>\/login` \|/);
  assert.match(skill, /always answers \*\*as you\*\*/);
  assert.match(skill, /name:'regular',kind:'session'/);
  assert.match(skill, /`user\.loginUrl`/);

  // The form is filled by Node with values from process.env, and the CLI output is discarded.
  const fill = /node --env-file=\.env -e "[^\n]*'fill'[^\n]*"/.exec(skill)?.[0] ?? '';

  assert.match(fill, /process\.env\.QA_USER_REGULAR/);
  assert.match(fill, /process\.env\.QA_PASS_REGULAR,'--submit'/);
  assert.match(fill, /stdio:'ignore'/);
  assert.doesNotMatch(fill, /shell:\s*true|execSync\(/);

  for (const [filePath, content] of output) {
    // No shell loader for .env, and no password or username expanded by a shell.
    assert.doesNotMatch(content, /set -a|\. \.\/\.env|Get-Content \.env/, filePath);
    assert.doesNotMatch(content, /"\$(?:QA_(?:USER|PASS)|DEFAULT_(?:USERNAME|PASSWORD))_|\$env:QA_/, filePath);
  }

  for (const name of ['playwright-cli', 'testing-flow', 'ui-check-simple']) {
    assert.match(output.get(`.claude/skills/${name}/SKILL.md`)!, /the role's own host when your token is set/);
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

// PP-4662: the templates named four different Node.js versions and pinned the CLI in several
// files, so a bump meant a search — and the setup script skipped the upgrade on Node 22 although
// pp-dev needs 24. Both versions now come from src/constants.ts through placeholders.
test('templates take the Playwright CLI and Node.js versions from one place', () => {
  const pinnedInTemplate = listFiles('templates')
    .filter((template) => /@playwright\/cli@\d|nvm (?:install|use) \d/.test(fs.readFileSync(template, 'utf8')))
    .map((template) => path.relative('templates', template).split(path.sep).join('/'));

  assert.deepEqual(pinnedInTemplate, []);

  for (const assistants of SELECTIONS) {
    for (const [filePath, content] of generated(assistants, true)) {
      assert.doesNotMatch(content, /\{\{[A-Z][A-Z0-9_]*\}\}/, `${filePath} keeps an unfilled placeholder`);

      for (const [, version] of content.matchAll(/@playwright\/cli@([\w.-]+)/g)) {
        assert.equal(version, PLAYWRIGHT_CLI_VERSION, `${filePath} pins another @playwright/cli version`);
      }

      // "Node.js 24", "Node.js ≥ 24", "Node.js version: `<v24.x>`", "nvm install 24".
      const nodeMajors = [
        ...content.matchAll(/Node(?:\.js)?(?: version: `<v| ≥ | >= | )(\d+)/g),
        ...content.matchAll(/nvm (?:install|use) (\d+)/g),
      ];

      for (const [mention, major] of nodeMajors) {
        assert.equal(Number(major), MIN_NODE_MAJOR, `${filePath}: "${mention}"`);
      }
    }
  }

  const setup = generated(['claude']).get('setup-claude-assistant.md')!;

  assert.match(setup, new RegExp(`npm install --save-dev @playwright/cli@${PLAYWRIGHT_CLI_VERSION}\\b`));
  // The script upgrades whenever the major is below the requirement, not below an older one.
  assert.match(setup, new RegExp(`"\\$NODE_MAJOR" -ge ${MIN_NODE_MAJOR} \\]`));
  assert.match(setup, new RegExp(`\\$nodeMajor -ge ${MIN_NODE_MAJOR}\\)`));
  assert.match(setup, new RegExp(`nvm install ${MIN_NODE_MAJOR}$`, 'm'));
});

test('an unknown template placeholder is an error; lower-case braces pass through', () => {
  assert.equal(renderTemplateValues('v{{MIN_NODE_MAJOR}} {{page}}'), `v${MIN_NODE_MAJOR} {{page}}`);
  assert.throws(() => renderTemplateValues('{{PLAYWRIGHT_VERSION}}'), /Unknown template placeholder/);
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

// A skill or rule whose frontmatter is not valid YAML is never loaded, and nothing reports it: the
// file is simply absent from the assistant's list. `: ` inside an unquoted value is the easy way to
// get there — a description that quotes `type(scope): subject` did exactly that.
test('frontmatter values are valid YAML scalars', () => {
  const problems: string[] = [];

  for (const assistants of SELECTIONS) {
    for (const [generatedPath, content] of generated(assistants, true)) {
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content.replace(/\r\n/g, '\n'));

      if (!frontmatter || !/\.(?:md|mdc)$/.test(generatedPath)) {
        continue;
      }

      for (const line of frontmatter[1].split('\n')) {
        const value = /^[A-Za-z-]+:\s*(.*)$/.exec(line)?.[1];

        if (value === undefined || /^(['"]).*\1$/.test(value)) {
          continue;
        }

        if (/: | #/.test(value) || /^[[{>|*&!%@`]/.test(value)) {
          problems.push(`${generatedPath}: ${line}`);
        }
      }
    }
  }

  assert.deepEqual([...new Set(problems)], []);
});

// PP-4659: linear-cli can no longer be authorized, so nothing generated may send the assistant to
// it — not even as a fallback. Linear is reached through the Linear MCP tools.
test('nothing generated mentions linear-cli', () => {
  for (const template of listFiles('templates')) {
    assert.doesNotMatch(fs.readFileSync(template, 'utf8'), /linear-cli/, template);
  }

  for (const assistants of SELECTIONS) {
    for (const [generatedPath, content] of generated(assistants, true)) {
      assert.doesNotMatch(content, /linear-cli/, `${assistants.join('+')}: ${generatedPath}`);
    }
  }
});

// The server name differs per client (an account connector has a generated id), so a prefixed
// tool name such as `mcp__linear__get_issue` would match in one client and nowhere else.
test('Linear tools are named without a server prefix', () => {
  for (const template of listFiles('templates')) {
    assert.doesNotMatch(fs.readFileSync(template, 'utf8'), /mcp__/, template);
  }

  const workflow = readTemplate('skills/linear-workflow/SKILL.md');

  for (const tool of [
    'get_issue',
    'list_issues',
    'list_comments',
    'list_issue_statuses',
    'save_issue',
    'save_comment',
  ]) {
    assert.ok(workflow.includes(`\`${tool}\``), tool);
  }

  assert.match(readTemplate('skills/linear-report/SKILL.md'), /`prepare_file_upload`/);
});

// A missing connector must stop the work, not turn into a guess about the issue.
test('templates say what to do when a Linear tool is missing or fails', () => {
  const workflow = readTemplate('skills/linear-workflow/SKILL.md');
  const gates = generated(['cursor', 'claude']).get('.claude/rules/linear-task-gates.md')!;
  const setup = generated(['claude']).get('setup-claude-assistant.md')!;

  assert.match(workflow, /## When a Linear tool is missing or fails/);
  assert.match(workflow, /\*\*Never guess\*\* the state or the content of an issue/);
  assert.match(gates, /`get_issue`/);
  assert.match(gates, /Linear tools are missing or return an error, \*\*stop\*\*/);
  assert.match(gates, /Never guess the state of an issue/);
  // A missing connector is reported, but it does not fail the setup.
  assert.match(setup, /OK \/ NOT CONNECTED {2}Linear MCP/);
  assert.match(setup, /`NOT CONNECTED` is not a failed setup/);
  assert.doesNotMatch(setup, /OK \/ FAIL\s+Linear/);
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
  const skill = readTemplate('skills/customer-app-docs/SKILL.md', { SKILLS_ROOT: '.claude/skills' });
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
  const skill = readTemplate('skills/customer-app-docs/SKILL.md', { SKILLS_ROOT: '.claude/skills' });
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
  const skill = readTemplate('skills/customer-app-docs/SKILL.md', { SKILLS_ROOT: '.claude/skills' });
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
  const skill = readTemplate('skills/customer-app-docs/SKILL.md', { SKILLS_ROOT: '.claude/skills' });
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
