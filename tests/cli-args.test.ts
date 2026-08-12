import assert from 'node:assert/strict';
import test from 'node:test';
import { cliMode, firstNonEmptyTarget, parseCliArgs, validateCliArgs } from '../src/cli-args.js';

test('cliMode recognizes check and update subcommands', () => {
  assert.equal(cliMode(parseCliArgs(['check'])), 'check');
  assert.equal(cliMode(parseCliArgs(['update'])), 'update');
  assert.equal(cliMode(parseCliArgs([])), 'generate');
  assert.equal(cliMode(parseCliArgs(['some-target'])), 'generate');
});

test('firstNonEmptyTarget skips a recognized subcommand', () => {
  assert.equal(firstNonEmptyTarget(parseCliArgs(['check', '../repo'])), '../repo');
  assert.equal(firstNonEmptyTarget(parseCliArgs(['update', '../repo'])), '../repo');
  assert.equal(firstNonEmptyTarget(parseCliArgs(['../repo'])), '../repo');
});

test('explicit --target takes precedence over positional targets', () => {
  assert.equal(firstNonEmptyTarget(parseCliArgs(['check', '../positional', '--target', '../flag'])), '../flag');
});

test('parseCliArgs supports version aliases', () => {
  assert.equal(parseCliArgs(['--version']).version, true);
  assert.equal(parseCliArgs(['-v']).version, true);
});

test('validateCliArgs rejects command typos with an additional target', () => {
  assert.throws(
    () => validateCliArgs(parseCliArgs(['chek', '../repo'])),
    /Unknown command or too many positional arguments/,
  );
  assert.throws(() => validateCliArgs(parseCliArgs(['check', '../repo', 'extra'])), /Too many positional/);
});
