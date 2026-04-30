import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQaAiRulesInitArgs } from '../src/qa-ai-rules-setup.js';

test('buildQaAiRulesInitArgs adds --cursor and --claude for both assistants', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['cursor', 'claude']), ['--cursor', '--claude']);
});

test('buildQaAiRulesInitArgs cursor only', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['cursor']), ['--cursor']);
});

test('buildQaAiRulesInitArgs claude only', () => {
  assert.deepEqual(buildQaAiRulesInitArgs(['claude']), ['--claude']);
});
