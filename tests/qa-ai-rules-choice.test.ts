import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQaAiRulesArg } from '../src/qa-ai-rules-choice.js';

test('parseQaAiRulesArg maps yes variants to true', () => {
  assert.equal(parseQaAiRulesArg('yes'), true);
  assert.equal(parseQaAiRulesArg('TRUE'), true);
  assert.equal(parseQaAiRulesArg('1'), true);
  assert.equal(parseQaAiRulesArg('on'), true);
});

test('parseQaAiRulesArg maps no variants to false', () => {
  assert.equal(parseQaAiRulesArg('no'), false);
  assert.equal(parseQaAiRulesArg('none'), false);
  assert.equal(parseQaAiRulesArg('false'), false);
  assert.equal(parseQaAiRulesArg('0'), false);
  assert.equal(parseQaAiRulesArg('off'), false);
});

test('parseQaAiRulesArg returns undefined for empty input', () => {
  assert.equal(parseQaAiRulesArg(undefined), undefined);
  assert.equal(parseQaAiRulesArg(''), undefined);
});

test('parseQaAiRulesArg throws on unknown value', () => {
  assert.throws(() => parseQaAiRulesArg('maybe'), /Invalid --qa-ai-rules/);
});
