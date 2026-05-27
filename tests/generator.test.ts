import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildClaudeSettingsJson } from '../src/generators/claude.js';
import { generateSetup, getGeneratedFiles } from '../src/generator.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linear-assistant-setup-'));
}

test('getGeneratedFiles records qaAiRules in metadata when enabled', () => {
  const files = getGeneratedFiles(['cursor'], false, false, true);
  const metaFile = files.find((f) => f.path === '.assistant-setup/ca-ai-tools-setup.json');

  assert.ok(metaFile);
  const meta = JSON.parse(metaFile!.content) as { qaAiRules: { enabled: boolean; package: string } };

  assert.deepEqual(meta.qaAiRules, { enabled: true, package: '@metricinsights/qa-ai-rules' });
});

test('generateSetup creates files for selected assistants', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });

  assert.ok(result.created.includes('setup-cursor-assistant.md'));
  assert.ok(fs.existsSync(path.join(dir, 'setup-cursor-assistant.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/linear-cli.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/linear-task-gates.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/portal-env-credentials.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/README.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/prompts/react-component-unit.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursorignore')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/ai-testing/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/ai-development/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md')));
  assert.ok(
    fs.readFileSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md'), 'utf8').includes('UI check and verification'),
  );
  assert.ok(
    fs
      .readFileSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md'), 'utf8')
      .includes('`.cursor/skills/linear-workflow/SKILL.md`'),
  );
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/testing-flow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/prompts/form-prompt.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(dir, '.dev-environment.md')));
  assert.ok(fs.existsSync(path.join(dir, '.assistant-setup/page-workflow-context.md')));
  assert.ok(result.created.includes('LINEAR_CLI.md'));
  assert.ok(fs.existsSync(path.join(dir, 'LINEAR_CLI.md')));
  assert.ok(fs.readFileSync(path.join(dir, 'LINEAR_CLI.md'), 'utf8').includes('Linear CLI Reference'));
  assert.ok(fs.existsSync(path.join(dir, '.cursorrules')));
  assert.ok(fs.readFileSync(path.join(dir, '.cursorrules'), 'utf8').includes('AGENTS.md'));
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('.claude/agents'));
  assert.ok(!fs.existsSync(path.join(dir, '.claude/settings.json')));
  assert.ok(!fs.existsSync(path.join(dir, 'setup-claude-assistant.md')));
});

test('generateSetup skips .cursorrules on second Cursor run unless force', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  const second = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(second.skipped.includes('.cursorrules'));
  assert.ok(second.skipped.includes('.cursor/skills/ui-check/SKILL.md'));
  assert.ok(second.skipped.includes('AGENTS.md'));

  const forced = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: true,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(forced.overwritten.includes('.cursorrules'));
  assert.ok(forced.overwritten.includes('.cursor/skills/ui-check/SKILL.md'));
  assert.ok(forced.overwritten.includes('AGENTS.md'));
});

test('generateSetup omits .cursor/mcp.json when Playwright MCP is declined', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(result.created.includes('setup-cursor-assistant.md'));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);

  const md = fs.readFileSync(path.join(dir, 'setup-cursor-assistant.md'), 'utf8');

  assert.ok(md.includes('installer **chose not to**'));
  assert.ok(md.includes('https://help.metricinsights.com/m/API_Access'));
});

test('generateSetup setup-cursor notes bootstrap included MCP when enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });

  const md = fs.readFileSync(path.join(dir, 'setup-cursor-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('can differ by Metric Insights instance version'));
  assert.ok(md.includes('**2.5. Enable project MCP in Cursor (manual'));
  assert.ok(md.includes('does **not** turn MCP servers on'));
});

test('generateSetup writes .mcp.json for Claude when Playwright MCP enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: true });
  assert.equal(meta.version, 5);
  assert.deepEqual(meta.qaAiRules, { enabled: false, package: '@metricinsights/qa-ai-rules' });
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
  assert.deepEqual(meta.linearCliReference, {
    file: 'LINEAR_CLI.md',
    generated: true,
  });

  const md = fs.readFileSync(path.join(dir, 'setup-claude-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('https://help.metricinsights.com/m/API_Access'));
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/ui-check/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/ai-testing/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/ai-development/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/README.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/linear-task-gates.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/portal-env-credentials.mdc')));
  assert.ok(
    fs
      .readFileSync(path.join(dir, '.claude/skills/ui-check/SKILL.md'), 'utf8')
      .includes('`.claude/workflows/linear-workflow.md`'),
  );
  assert.ok(fs.existsSync(path.join(dir, '.claude/workflows/testing-flow.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/agents/qa-tester.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/commands/testing-flow.md')));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('testing-with-linear.md'));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('workflows/testing-with-linear.md'));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('qa-tester'));
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('ca-ai-tools-setup'));
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('.claude/agents'));
  assert.ok(fs.existsSync(path.join(dir, '.claude/settings.json')));
  const claudeSettings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')) as {
    $schema?: string;
    enableAllProjectMcpServers?: boolean;
    enabledMcpjsonServers?: string[];
    permissions?: { allow?: string[] };
  };

  assert.ok(claudeSettings.$schema?.includes('claude-code-settings'));
  assert.equal(claudeSettings.enableAllProjectMcpServers, true);
  assert.deepEqual(claudeSettings.enabledMcpjsonServers, ['playwright']);
  assert.ok(claudeSettings.permissions?.allow?.includes('mcp__playwright__*'));
});

test('generateSetup omits .mcp.json for Claude when Playwright MCP declined', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });
  assert.equal(fs.existsSync(path.join(dir, '.mcp.json')), false);

  const md = fs.readFileSync(path.join(dir, 'setup-claude-assistant.md'), 'utf8');

  assert.ok(md.includes('installer **chose not to**'));
  assert.ok(md.includes('can differ by Metric Insights instance version'));

  const noMcpSettings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')) as {
    enableAllProjectMcpServers?: boolean;
    enabledMcpjsonServers?: unknown;
  };

  assert.equal(noMcpSettings.enableAllProjectMcpServers, undefined);
  assert.equal(noMcpSettings.enabledMcpjsonServers, undefined);
});

test('generateSetup always overwrites setup assistant files', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  const second = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(second.overwritten.includes('setup-claude-assistant.md'));
  assert.ok(second.skipped.includes('CLAUDE.md'));
  assert.ok(second.skipped.includes('.claude/settings.json'));
  assert.ok(second.skipped.includes('AGENTS.md'));
  assert.ok(second.skipped.includes('.dev-environment.md'));
  assert.ok(second.skipped.includes('.assistant-setup/ca-ai-tools-setup.json'));
  assert.ok(second.skipped.includes('.assistant-setup/page-workflow-context.md'));
  assert.ok(second.skipped.includes('LINEAR_CLI.md'));
  assert.ok(second.skipped.includes('.claude/skills/ui-check/SKILL.md'));

  const forced = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: true,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.ok(forced.overwritten.includes('setup-claude-assistant.md'));
  assert.ok(forced.overwritten.includes('CLAUDE.md'));
  assert.ok(forced.overwritten.includes('.claude/settings.json'));
  assert.ok(forced.overwritten.includes('AGENTS.md'));
  assert.ok(forced.overwritten.includes('.claude/skills/ui-check/SKILL.md'));
});

test('generateSetup writes both MCP files when Cursor and Claude selected and MCP enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: true, projectRootFile: true });
  assert.deepEqual(meta.figmaMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
  assert.deepEqual(meta.linearCliReference, {
    file: 'LINEAR_CLI.md',
    generated: true,
  });

  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/ui-check/SKILL.md')));
  assert.ok(
    fs
      .readFileSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md'), 'utf8')
      .includes('`.cursor/skills/linear-workflow/SKILL.md`'),
  );
  assert.ok(
    fs
      .readFileSync(path.join(dir, '.claude/skills/ui-check/SKILL.md'), 'utf8')
      .includes('`.claude/workflows/linear-workflow.md`'),
  );
});

test('generateSetup writes figma MCP only when requested', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
    figmaMcpInclude: true,
  });

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  const claudeMcp = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.ok(cursorMcp.mcpServers.figma);
  assert.equal(cursorMcp.mcpServers.playwright, undefined);
  assert.ok(claudeMcp.mcpServers.figma);
  assert.equal(claudeMcp.mcpServers.playwright, undefined);
  assert.equal(fs.existsSync(path.join(dir, '.claude/agents/figma-mcp.md')), true);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-code-connect/SKILL.md')), true);
  assert.equal(
    fs.existsSync(path.join(dir, '.claude/skills/figma-code-connect/references/api.md')),
    true,
  );
  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/figma-mcp.mdc')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/figma-code-connect/SKILL.md')), true);
  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.figmaMcp, { cursorFile: true, projectRootFile: true });

  const claudeSettings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')) as {
    enabledMcpjsonServers?: string[];
    permissions?: { allow?: string[] };
  };

  assert.deepEqual(claudeSettings.enabledMcpjsonServers, ['figma']);
  assert.ok(claudeSettings.permissions?.allow?.includes('mcp__figma__*'));
});

test('generateSetup omits .cursor/rules/figma-mcp.mdc when Figma MCP not selected', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    figmaMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/figma-mcp.mdc')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/figma-code-connect/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/agents/figma-mcp.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-code-connect/SKILL.md')), false);
});

test('buildClaudeSettingsJson enables both MCP servers when selected', () => {
  const doc = JSON.parse(buildClaudeSettingsJson({ includePlaywrightMcp: true, includeFigmaMcp: true })) as {
    enableAllProjectMcpServers?: boolean;
    enabledMcpjsonServers?: string[];
    enabledPlugins?: Record<string, boolean>;
    permissions?: { allow?: string[] };
  };

  assert.equal(doc.enableAllProjectMcpServers, true);
  assert.deepEqual(doc.enabledMcpjsonServers, ['playwright', 'figma']);
  assert.ok(doc.permissions?.allow?.includes('mcp__playwright__*'));
  assert.ok(doc.permissions?.allow?.includes('mcp__figma__*'));
  assert.equal(doc.enabledPlugins?.['claude-code-setup@claude-plugins-official'], true);
});

test('buildClaudeSettingsJson omits MCP keys when no MCP selected', () => {
  const doc = JSON.parse(buildClaudeSettingsJson({ includePlaywrightMcp: false, includeFigmaMcp: false })) as Record<
    string,
    unknown
  >;

  assert.ok(doc.$schema);
  assert.equal(doc.enableAllProjectMcpServers, undefined);
  assert.deepEqual(doc.enabledPlugins, { 'claude-code-setup@claude-plugins-official': true });
});

test('generateSetup can combine playwright and figma MCP in one file', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    figmaMcpInclude: true,
  });

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };

  assert.ok(cursorMcp.mcpServers.playwright);
  assert.ok(cursorMcp.mcpServers.figma);
});

test('generateSetup dry-run does not write files', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: true,
    dryRun: true,
    playwrightMcpInclude: true,
  });

  assert.ok(result.created.length > 0);
  assert.equal(fs.existsSync(path.join(dir, 'setup-cursor-assistant.md')), false);
  assert.equal(fs.existsSync(path.join(dir, 'setup-claude-assistant.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.dev-environment.md')), false);
});

test('generateSetup merge combines mcpServers in existing .cursor/mcp.json', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  const prior = {
    mcpServers: {
      custom: { command: 'echo', args: ['mcp'] },
    },
    note: 'keep-me',
  };

  fs.writeFileSync(path.join(dir, '.cursor/mcp.json'), `${JSON.stringify(prior, null, 2)}\n`, 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    existingFileActions: { '.cursor/mcp.json': 'merge' },
  });

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
    note: string;
  };

  assert.equal(parsed.note, 'keep-me');
  assert.ok(parsed.mcpServers.custom);
  assert.ok(parsed.mcpServers.playwright);
});

test('generateSetup merge keeps existing FIGMA_API_KEY token when template has placeholder', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  const prior = {
    mcpServers: {
      figma: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'figma-developer-mcp', '--stdio'],
        env: {
          FIGMA_API_KEY: 'existing-user-token',
        },
      },
    },
  };

  fs.writeFileSync(path.join(dir, '.cursor/mcp.json'), `${JSON.stringify(prior, null, 2)}\n`, 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
    figmaMcpInclude: true,
    existingFileActions: { '.cursor/mcp.json': 'merge' },
  });

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: { figma: { env: { FIGMA_API_KEY: string } } };
  };

  assert.equal(parsed.mcpServers.figma.env.FIGMA_API_KEY, 'existing-user-token');
});

test('generateSetup merge combines MCP servers in existing .claude/settings.json', () => {
  const dir = makeTempDir();

  const prior = JSON.stringify(
    {
      $schema: 'https://existing.schema',
      enableAllProjectMcpServers: true,
      enabledMcpjsonServers: ['playwright'],
      permissions: { allow: ['mcp__playwright__*'] },
    },
    null,
    2,
  );

  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude/settings.json'), `${prior}\n`, 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: true,
    figmaMcpInclude: true,
    existingFileActions: { '.claude/settings.json': 'merge' },
  });

  assert.ok(result.merged.includes('.claude/settings.json'));

  const merged = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')) as {
    $schema: string;
    enabledMcpjsonServers: string[];
    permissions: { allow: string[] };
  };

  assert.equal(merged.$schema, 'https://existing.schema');
  assert.deepEqual(merged.enabledMcpjsonServers.sort(), ['figma', 'playwright']);
  assert.ok(merged.permissions.allow.includes('mcp__playwright__*'));
  assert.ok(merged.permissions.allow.includes('mcp__figma__*'));
});

test('generateSetup merge appends new agent rows to existing AGENTS.md', () => {
  const dir = makeTempDir();

  const priorAgents = [
    '# Claude Code — agent registry',
    '',
    '## Registered agents',
    '',
    '| File | Purpose |',
    '|------|---------|',
    '| `custom-agent.md` | My custom agent. |',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(dir, 'AGENTS.md'), priorAgents, 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
    figmaMcpInclude: true,
    existingFileActions: { 'AGENTS.md': 'merge' },
  });

  assert.ok(result.merged.includes('AGENTS.md'));

  const content = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');

  assert.ok(content.includes('`custom-agent.md`'), 'existing row preserved');
  assert.ok(content.includes('`figma-mcp.md`'), 'new row appended');
});

test('generateSetup throws when merge requested for unsupported file', () => {
  const dir = makeTempDir();

  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'existing content\n', 'utf8');

  assert.throws(
    () =>
      generateSetup({
        targetDir: dir,
        assistants: ['claude'],
        force: false,
        dryRun: false,
        playwrightMcpInclude: false,
        existingFileActions: { 'CLAUDE.md': 'merge' },
      }),
    /Merge is not supported/,
  );
});

test('generateSetup migrates legacy setup metadata files to new names', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.assistant-setup'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), true);
  assert.ok(
    result.migratedLegacy.includes('.assistant-setup/linear-cli-setup.json -> .assistant-setup/ca-ai-tools-setup.json'),
  );
  assert.ok(result.migratedLegacy.includes('.cursor/linear-cli-setup.json -> .cursor/ca-ai-tools-setup.json'));
});

test('generateSetup removes legacy metadata files with --force', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.assistant-setup'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.assistant-setup/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/linear-cli-setup.json'), '{"legacy":true}\n', 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: true,
    dryRun: false,
    playwrightMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), true);
  assert.ok(result.removedLegacy.includes('.assistant-setup/linear-cli-setup.json'));
  assert.ok(result.removedLegacy.includes('.cursor/linear-cli-setup.json'));
});
