import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssistantsArg } from '../src/assistants.js';

test('parseAssistantsArg parses and de-duplicates assistants', () => {
  const value = parseAssistantsArg('cursor, claude, cursor');

  assert.deepEqual(value, ['cursor', 'claude']);
});

test('parseAssistantsArg returns undefined for empty input', () => {
  const value = parseAssistantsArg(undefined);

  assert.equal(value, undefined);
});

test('parseAssistantsArg throws for unsupported assistant', () => {
  assert.throws(() => parseAssistantsArg('cursor,foo'));
});
