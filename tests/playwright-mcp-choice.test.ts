import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaywrightMcpArg } from '../src/playwright-mcp-choice.js';

test('parsePlaywrightMcpArg maps yes variants to true', () => {
  assert.equal(parsePlaywrightMcpArg('yes'), true);
  assert.equal(parsePlaywrightMcpArg('YES'), true);
  assert.equal(parsePlaywrightMcpArg('true'), true);
  assert.equal(parsePlaywrightMcpArg('1'), true);
  assert.equal(parsePlaywrightMcpArg('cursor'), true);
  assert.equal(parsePlaywrightMcpArg('on'), true);
});

test('parsePlaywrightMcpArg maps no variants to false', () => {
  assert.equal(parsePlaywrightMcpArg('none'), false);
  assert.equal(parsePlaywrightMcpArg('NONE'), false);
  assert.equal(parsePlaywrightMcpArg('no'), false);
  assert.equal(parsePlaywrightMcpArg('false'), false);
  assert.equal(parsePlaywrightMcpArg('0'), false);
  assert.equal(parsePlaywrightMcpArg('off'), false);
});

test('parsePlaywrightMcpArg returns undefined for empty input', () => {
  assert.equal(parsePlaywrightMcpArg(undefined), undefined);
  assert.equal(parsePlaywrightMcpArg(''), undefined);
});

test('parsePlaywrightMcpArg throws on unknown value', () => {
  assert.throws(() => parsePlaywrightMcpArg('maybe'), /Invalid --mcp-playwright/);
});
