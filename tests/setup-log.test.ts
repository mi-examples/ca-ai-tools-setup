import test from 'node:test';
import assert from 'node:assert/strict';
import { isSetupDebugEnabled } from '../src/setup-log.js';

test('isSetupDebugEnabled respects CA_AI_TOOLS_SETUP_DEBUG', () => {
  assert.equal(isSetupDebugEnabled({ CA_AI_TOOLS_SETUP_DEBUG: '1' }), true);
  assert.equal(isSetupDebugEnabled({ CA_AI_TOOLS_SETUP_DEBUG: 'true' }), true);
  assert.equal(isSetupDebugEnabled({ CA_AI_TOOLS_SETUP_DEBUG: '0' }), false);
  assert.equal(isSetupDebugEnabled({ CA_AI_TOOLS_SETUP_DEBUG: 'false' }), false);
});

test('isSetupDebugEnabled respects DEBUG namespace', () => {
  assert.equal(isSetupDebugEnabled({ DEBUG: 'ca-ai-tools-setup' }), true);
  assert.equal(isSetupDebugEnabled({ DEBUG: 'other,ca-ai-tools-setup' }), true);
  assert.equal(isSetupDebugEnabled({ DEBUG: '*' }), true);
  assert.equal(isSetupDebugEnabled({ DEBUG: 'other' }), false);
  assert.equal(isSetupDebugEnabled({}), false);
});
