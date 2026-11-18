import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildClaudeSettingsJson } from '../src/generators/claude.js';
import { generateSetup, getGeneratedFiles } from '../src/generator.js';
import { getCliPackageVersion } from '../src/setup-log.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linear-assistant-setup-'));
}

test('getGeneratedFiles records qaAiRules in metadata when enabled', () => {
  const files = getGeneratedFiles(['cursor'], false, true);
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
  });

  assert.ok(result.created.includes('setup-cursor-assistant.md'));
  assert.ok(fs.existsSync(path.join(dir, 'setup-cursor-assistant.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/assistant-setup-health.mdc')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/linear-cli.mdc')), false);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/linear-task-gates.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/code-style.mdc')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/frontend-architecture.mdc')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/portal-env-credentials.mdc')), false);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/portal-env-credentials/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/commit-convention/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/prompts')), false);
  assert.ok(fs.existsSync(path.join(dir, '.cursorignore')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/ai-development/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/testing-flow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/testing-with-linear/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/playwright-cli/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/playwright-mcp')), false);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/customer-app-docs/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/customer-app-docs/references/sections.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/skills/customer-app-docs/assets/example.html')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ai-testing/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/README.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/form-builder')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/test-case-rules.mdc')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);
  assert.ok(fs.existsSync(path.join(dir, '.dev-environment.md')));
  assert.ok(fs.existsSync(path.join(dir, '.assistant-setup/page-workflow-context.md')));
  assert.ok(fs.existsSync(path.join(dir, '.assistant-setup/SETUP_STATUS.md')));
  assert.match(
    fs.readFileSync(path.join(dir, '.assistant-setup/SETUP_STATUS.md'), 'utf8'),
    /ca-ai-tools-setup-status.*"schemaVersion":6/,
  );
  assert.equal(fs.existsSync(path.join(dir, 'LINEAR_CLI.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursorrules')), false);
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
  // A Cursor-only setup must not point at Claude Code files that are not there.
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('.cursor/skills/'));
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('.claude/'), false);
  assert.ok(!fs.existsSync(path.join(dir, '.claude/settings.json')));
  assert.ok(!fs.existsSync(path.join(dir, 'setup-claude-assistant.md')));
});

test('generateSetup skips existing files on a second Cursor run unless force', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
  });

  const second = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
  });

  assert.ok(second.skipped.includes('.cursorignore'));
  assert.ok(second.skipped.includes('.cursor/skills/testing-with-linear/SKILL.md'));
  assert.ok(second.merged.includes('AGENTS.md'));

  const forced = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: true,
    dryRun: false,
  });

  assert.ok(forced.overwritten.includes('.cursorignore'));
  assert.ok(forced.overwritten.includes('.cursor/skills/testing-with-linear/SKILL.md'));
  assert.ok(forced.merged.includes('AGENTS.md'));
});

test('generateSetup writes no .cursor/mcp.json when no MCP server is selected', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
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
    figmaMcpInclude: true,
  });

  const md = fs.readFileSync(path.join(dir, 'setup-cursor-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('can differ by Metric Insights instance version'));
  assert.ok(md.includes('**Enable project MCP in Cursor (manual'));
  assert.ok(md.includes('does **not** turn MCP servers on'));
});

test('generateSetup writes .mcp.json for Claude when Figma MCP is selected', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
    figmaMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/mcp.json')), false);

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  // Never set for a new setup: the key only marks what an older release wrote (PP-4531).
  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.figmaMcp, { cursorFile: false, projectRootFile: true });
  assert.equal(meta.version, 6);
  assert.equal(meta.provenance.package, '@metricinsights/ca-ai-tools-setup');
  assert.equal(meta.provenance.version, getCliPackageVersion());
  assert.ok(meta.files['.claude/skills/ai-development/SKILL.md']);
  assert.equal(meta.generatedAt, undefined);
  assert.deepEqual(meta.qaAiRules, { enabled: false, package: '@metricinsights/qa-ai-rules' });
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
  assert.equal(meta.linearCliReference, undefined);

  const md = fs.readFileSync(path.join(dir, 'setup-claude-assistant.md'), 'utf8');

  assert.ok(md.includes('bootstrapped **with**'));
  assert.ok(md.includes('https://help.metricinsights.com/m/API_Access'));
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/ai-development/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/README.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ui-check/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ai-testing/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/workflows/ui-check.md')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/rules/linear-task-gates.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/rules/code-style.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/portal-env-credentials/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/testing-flow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/playwright-cli/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/workflows')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/workflows/playwright-mcp.md')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/agents/qa-tester.md')));
  assert.equal(fs.existsSync(path.join(dir, '.claude/agents/code-style.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/commands/testing-flow.md')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/commands/ui-check.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/customer-app-docs/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/customer-app-docs/references/sections.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/customer-app-docs/references/verify.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/customer-app-docs/assets/example.html')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/commands/customer-docs.md')));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('`customer-app-docs`'));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('`testing-with-linear`'));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('.claude/rules/'));
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('`code-style`'));
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
  assert.deepEqual(claudeSettings.enabledMcpjsonServers, ['figma']);
  assert.deepEqual(claudeSettings.permissions?.allow, ['mcp__figma__*']);
});

test('generateSetup omits .mcp.json for Claude when no MCP server is selected', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
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
  });

  const second = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: false,
    dryRun: false,
  });

  assert.ok(second.overwritten.includes('setup-claude-assistant.md'));
  assert.ok(second.skipped.includes('CLAUDE.md'));
  assert.ok(second.skipped.includes('.claude/settings.json'));
  assert.ok(second.merged.includes('AGENTS.md'));
  assert.ok(second.skipped.includes('.dev-environment.md'));
  assert.ok(second.overwritten.includes('.assistant-setup/ca-ai-tools-setup.json'));
  assert.ok(second.skipped.includes('.assistant-setup/page-workflow-context.md'));
  assert.ok(second.skipped.includes('.claude/rules/code-style.md'));
  assert.ok(second.skipped.includes('.claude/skills/ai-development/SKILL.md'));

  const forced = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: true,
    dryRun: false,
  });

  assert.ok(forced.overwritten.includes('setup-claude-assistant.md'));
  assert.ok(forced.overwritten.includes('CLAUDE.md'));
  assert.ok(forced.overwritten.includes('.claude/settings.json'));
  assert.ok(forced.merged.includes('AGENTS.md'));
  assert.ok(forced.overwritten.includes('.claude/skills/ai-development/SKILL.md'));
});

test('generateSetup preserves existing AGENTS.md content and merges generated rows with --force', () => {
  const dir = makeTempDir();
  const agentsPath = path.join(dir, 'AGENTS.md');

  fs.writeFileSync(
    agentsPath,
    '# Repository instructions\n\nKeep this custom guidance.\n\n| File | Purpose |\n| ---- | ------- |\n',
    'utf8',
  );

  const result = generateSetup({
    targetDir: dir,
    assistants: ['claude'],
    force: true,
    dryRun: false,
  });
  const merged = fs.readFileSync(agentsPath, 'utf8');

  assert.ok(result.merged.includes('AGENTS.md'));
  assert.match(merged, /Keep this custom guidance\./);
  assert.match(merged, /`qa-tester\.md`/);
  assert.doesNotMatch(merged, /^# Agents and project instructions/m);
});

test('generateSetup writes both MCP files when Cursor and Claude selected and MCP enabled', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    figmaMcpInclude: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  assert.ok(fs.existsSync(path.join(dir, '.mcp.json')));

  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8'));

  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.figmaMcp, { cursorFile: true, projectRootFile: true });
  assert.deepEqual(meta.devEnvironment, {
    file: '.dev-environment.md',
    generated: true,
  });
  assert.deepEqual(meta.pageWorkflowContext, {
    file: '.assistant-setup/page-workflow-context.md',
    generated: true,
  });
  assert.equal(meta.linearCliReference, undefined);

  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ui-check/SKILL.md')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/testing-with-linear/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/workflows')), false);
});

test('generateSetup writes figma MCP only when requested', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
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
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-implementation/SKILL.md')), true);
  // PP-4661: this skill needed the official Figma MCP, which the setup does not register.
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-code-connect')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/agents/figma-mcp.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/rules/figma-mcp.mdc')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills')), false);
  assert.deepEqual(meta.playwrightMcp, { cursorFile: false, projectRootFile: false });
  assert.deepEqual(meta.figmaMcp, { cursorFile: true, projectRootFile: true });

  const claudeSettings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')) as {
    enabledMcpjsonServers?: string[];
    permissions?: { allow?: string[] };
  };

  assert.deepEqual(claudeSettings.enabledMcpjsonServers, ['figma']);
  assert.ok(claudeSettings.permissions?.allow?.includes('mcp__figma__*'));
});

test('generateSetup omits the Figma skills when Figma MCP is not selected', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
    figmaMcpInclude: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-implementation')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/figma-code-connect')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ai-development/SKILL.md')), true);
});

test('buildClaudeSettingsJson enables the Figma MCP server when selected', () => {
  const doc = JSON.parse(buildClaudeSettingsJson({ includeFigmaMcp: true })) as {
    enableAllProjectMcpServers?: boolean;
    enabledMcpjsonServers?: string[];
    enabledPlugins?: Record<string, boolean>;
    permissions?: { allow?: string[] };
  };

  assert.equal(doc.enableAllProjectMcpServers, true);
  assert.deepEqual(doc.enabledMcpjsonServers, ['figma']);
  assert.deepEqual(doc.permissions?.allow, ['mcp__figma__*']);
  assert.equal(doc.enabledPlugins?.['claude-code-setup@claude-plugins-official'], true);
});

test('buildClaudeSettingsJson omits MCP keys when no MCP selected', () => {
  const doc = JSON.parse(buildClaudeSettingsJson({ includeFigmaMcp: false })) as Record<string, unknown>;

  assert.ok(doc.$schema);
  assert.equal(doc.enableAllProjectMcpServers, undefined);
  assert.deepEqual(doc.enabledPlugins, { 'claude-code-setup@claude-plugins-official': true });
});

test('generateSetup writes only the Figma server into the MCP file', () => {
  const dir = makeTempDir();

  generateSetup({
    targetDir: dir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
    figmaMcpInclude: true,
  });

  const cursorMcp = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };

  assert.deepEqual(Object.keys(cursorMcp.mcpServers), ['figma']);
});

test('generateSetup dry-run does not write files', () => {
  const dir = makeTempDir();
  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: true,
    dryRun: true,
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
    figmaMcpInclude: true,
    existingFileActions: { '.cursor/mcp.json': 'merge' },
  });

  assert.ok(result.merged.includes('.cursor/mcp.json'));
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
    note: string;
  };

  assert.equal(parsed.note, 'keep-me');
  assert.ok(parsed.mcpServers.custom);
  assert.ok(parsed.mcpServers.figma);
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
    figmaMcpInclude: true,
    existingFileActions: { 'AGENTS.md': 'merge' },
  });

  assert.ok(result.merged.includes('AGENTS.md'));

  const content = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');

  assert.ok(content.includes('`custom-agent.md`'), 'existing row preserved');
  assert.ok(content.includes('`qa-tester.md`'), 'new row appended');
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
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  // The Cursor copy has no successor any more: nothing reads it, so it is removed, not renamed.
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), false);
  assert.ok(
    result.migratedLegacy.includes('.assistant-setup/linear-cli-setup.json -> .assistant-setup/ca-ai-tools-setup.json'),
  );
  assert.ok(result.removedLegacy.includes('.cursor/linear-cli-setup.json'));
});

test('generateSetup removes obsolete legacy QA skills on re-run', () => {
  const dir = makeTempDir();

  fs.mkdirSync(path.join(dir, '.cursor/skills/ai-testing'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor/skills/ui-check'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/skills/ai-testing'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/workflows'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cursor/skills/ai-testing/SKILL.md'), '# legacy\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md'), '# legacy\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.claude/skills/ai-testing/SKILL.md'), '# legacy\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.claude/workflows/ui-check.md'), '# legacy\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.cursor/skills/README.md'), '# legacy\n', 'utf8');

  const result = generateSetup({
    targetDir: dir,
    assistants: ['cursor', 'claude'],
    force: false,
    dryRun: false,
  });

  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ai-testing/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ui-check/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ai-testing/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/workflows/ui-check.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/README.md')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ai-testing')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills/ui-check')), false);
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/ai-testing')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/testing-with-linear/SKILL.md')));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills')), false);
  assert.ok(result.removedLegacy.includes('.cursor/skills/ai-testing/SKILL.md'));
  assert.ok(result.removedLegacy.includes('.cursor/skills/ui-check/SKILL.md'));
  assert.ok(result.removedLegacy.includes('.claude/workflows/ui-check.md'));
  assert.ok(result.removedLegacy.includes('.cursor/skills/ai-testing'));
  assert.ok(result.removedLegacy.includes('.cursor/skills/ui-check'));
  assert.ok(result.removedLegacy.includes('.claude/skills/ai-testing'));
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
  });

  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/linear-cli-setup.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.assistant-setup/ca-ai-tools-setup.json')), true);
  assert.equal(fs.existsSync(path.join(dir, '.cursor/ca-ai-tools-setup.json')), false);
  assert.ok(result.removedLegacy.includes('.assistant-setup/linear-cli-setup.json'));
  assert.ok(result.removedLegacy.includes('.cursor/linear-cli-setup.json'));
});

test('generateSetup merges an existing .gitignore instead of replacing it, even with --force', () => {
  const targetDir = makeTempDir();
  const gitignorePath = path.join(targetDir, '.gitignore');
  const repoOwned = 'node_modules/\ndist/\n.env.local\n';

  fs.writeFileSync(gitignorePath, repoOwned, 'utf8');

  const result = generateSetup({
    targetDir,
    assistants: ['cursor'],
    force: true,
    dryRun: false,
  });

  const merged = fs.readFileSync(gitignorePath, 'utf8');

  assert.ok(merged.startsWith(repoOwned), 'repository-owned patterns must survive verbatim');
  assert.match(merged, /^\.dev-environment\.md$/mu);
  assert.ok(result.merged.includes('.gitignore'));
  assert.equal(result.overwritten.includes('.gitignore'), false);
});

test('generateSetup creates .gitignore ignoring the machine-specific dev environment file', () => {
  const targetDir = makeTempDir();

  generateSetup({
    targetDir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
  });

  const content = fs.readFileSync(path.join(targetDir, '.gitignore'), 'utf8');

  assert.match(content, /^\.dev-environment\.md$/mu);
});

// The file records the local instance URL and shell profile, so a committed copy leaks one
// developer's environment into everyone else's checkout.
test('.dev-environment.md is generated but ignored', () => {
  const targetDir = makeTempDir();

  generateSetup({
    targetDir,
    assistants: ['cursor'],
    force: false,
    dryRun: false,
  });

  assert.ok(fs.existsSync(path.join(targetDir, '.dev-environment.md')));
  assert.match(fs.readFileSync(path.join(targetDir, '.gitignore'), 'utf8'), /\.dev-environment\.md/u);
});

// --- Plain re-run and files a release stops generating (PP-4839) ----------------------------------
//
// `generateSetup` rewrites the metadata from the current file list. Before it cleaned up after
// itself, a file dropped by a release simply fell out of the metadata on the next plain re-run and
// was never reported again — the obsolete instructions stayed in the repository for good.

const RETIRED_PATH = '.cursor/rules/retired-rule.mdc';
const RETIRED_CONTENT = 'Generated by an older release.\n';

function generateCursor(targetDir: string, files: ReturnType<typeof getGeneratedFiles>, force = false) {
  return generateSetup({
    targetDir,
    assistants: ['cursor'],
    force,
    dryRun: false,
    files,
  });
}

function trackedFiles(targetDir: string): Record<string, { contentHash: string }> {
  return (
    JSON.parse(fs.readFileSync(path.join(targetDir, '.assistant-setup/ca-ai-tools-setup.json'), 'utf8')) as {
      files: Record<string, { contentHash: string }>;
    }
  ).files;
}

test('generateSetup re-run removes a tracked file the release no longer generates', () => {
  const dir = makeTempDir();
  const current = getGeneratedFiles(['cursor'], false, false);

  generateCursor(dir, [...current, { path: RETIRED_PATH, content: RETIRED_CONTENT }]);
  assert.equal(fs.existsSync(path.join(dir, RETIRED_PATH)), true);

  const result = generateCursor(dir, current);

  assert.ok(result.removedLegacy.includes(RETIRED_PATH));
  assert.equal(fs.existsSync(path.join(dir, RETIRED_PATH)), false);
  assert.equal(RETIRED_PATH in trackedFiles(dir), false);
});

test('generateSetup re-run keeps a locally edited obsolete file and keeps tracking it', () => {
  const dir = makeTempDir();
  const current = getGeneratedFiles(['cursor'], false, false);

  generateCursor(dir, [...current, { path: RETIRED_PATH, content: RETIRED_CONTENT }]);

  const recorded = trackedFiles(dir)[RETIRED_PATH];

  fs.writeFileSync(path.join(dir, RETIRED_PATH), 'Repository-owned edit.\n', 'utf8');

  const result = generateCursor(dir, current);

  assert.equal(result.removedLegacy.includes(RETIRED_PATH), false);
  assert.equal(fs.readFileSync(path.join(dir, RETIRED_PATH), 'utf8'), 'Repository-owned edit.\n');
  // The record survives unchanged, so `check` and `update` still see the file and raise the conflict.
  assert.deepEqual(trackedFiles(dir)[RETIRED_PATH], recorded);

  const forced = generateCursor(dir, current, true);

  assert.ok(forced.removedLegacy.includes(RETIRED_PATH));
  assert.equal(fs.existsSync(path.join(dir, RETIRED_PATH)), false);
});

test('generateSetup re-run does not delete a tracked legacy path that the repository edited', () => {
  const dir = makeTempDir();
  const legacyPath = '.cursor/skills/ui-check/SKILL.md';
  const current = getGeneratedFiles(['cursor'], false, false);

  // The only way a legacy path gets a record: an older release generated it while tracking files.
  generateCursor(dir, [...current, { path: legacyPath, content: RETIRED_CONTENT }]);
  fs.writeFileSync(path.join(dir, legacyPath), 'Repository-owned edit.\n', 'utf8');

  const result = generateCursor(dir, current);

  assert.equal(result.removedLegacy.includes(legacyPath), false);
  assert.equal(fs.readFileSync(path.join(dir, legacyPath), 'utf8'), 'Repository-owned edit.\n');
});

// PR #24 review: with Claude selected the skills live under .claude/skills, so the copies an older
// release wrote under .cursor/skills must go — Cursor reads both folders and would list each twice.
test('generateSetup re-run removes the Cursor copies of skills once Claude is selected', () => {
  const dir = makeTempDir();
  const oldCopy = '.cursor/skills/testing-flow/SKILL.md';

  fs.mkdirSync(path.join(dir, path.dirname(oldCopy)), { recursive: true });
  fs.writeFileSync(path.join(dir, oldCopy), '# written by an older release\n', 'utf8');

  const result = generateSetup({ targetDir: dir, assistants: ['cursor', 'claude'], force: false, dryRun: false });

  assert.ok(result.removedLegacy.includes(oldCopy));
  assert.equal(fs.existsSync(path.join(dir, '.cursor/skills')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/testing-flow/SKILL.md')));

  // Cursor alone still owns that folder: the existing file is kept, as any existing file is.
  const cursorOnly = makeTempDir();

  fs.mkdirSync(path.join(cursorOnly, path.dirname(oldCopy)), { recursive: true });
  fs.writeFileSync(path.join(cursorOnly, oldCopy), '# written by an older release\n', 'utf8');

  const kept = generateSetup({ targetDir: cursorOnly, assistants: ['cursor'], force: false, dryRun: false });

  assert.equal(kept.removedLegacy.includes(oldCopy), false);
  assert.ok(kept.skipped.includes(oldCopy));
});
