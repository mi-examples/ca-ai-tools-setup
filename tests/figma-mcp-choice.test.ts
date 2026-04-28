import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFigmaMcpArg } from '../src/figma-mcp-choice.js';

test('parseFigmaMcpArg maps yes variants to true', () => {
  assert.equal(parseFigmaMcpArg('yes'), true);
  assert.equal(parseFigmaMcpArg('YES'), true);
  assert.equal(parseFigmaMcpArg('true'), true);
  assert.equal(parseFigmaMcpArg('1'), true);
  assert.equal(parseFigmaMcpArg('figma'), true);
  assert.equal(parseFigmaMcpArg('on'), true);
});

test('parseFigmaMcpArg maps no variants to false', () => {
  assert.equal(parseFigmaMcpArg('none'), false);
  assert.equal(parseFigmaMcpArg('NONE'), false);
  assert.equal(parseFigmaMcpArg('no'), false);
  assert.equal(parseFigmaMcpArg('false'), false);
  assert.equal(parseFigmaMcpArg('0'), false);
  assert.equal(parseFigmaMcpArg('off'), false);
});

test('parseFigmaMcpArg returns undefined for empty input', () => {
  assert.equal(parseFigmaMcpArg(undefined), undefined);
  assert.equal(parseFigmaMcpArg(''), undefined);
});

test('parseFigmaMcpArg throws on unknown value', () => {
  assert.throws(() => parseFigmaMcpArg('maybe'), /Invalid --mcp-figma/);
});
