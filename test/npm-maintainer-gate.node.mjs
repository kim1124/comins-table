import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parseRepositoryOwner,
  validateNpmMaintainers,
} from '../scripts/check-npm-maintainer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failure = /^Error: npm-maintainer-check: failed$/;

test('accepts exactly one approved npm maintainer from current CLI shapes', () => {
  const syntheticAddress = ['release', 'example.invalid'].join('@');

  assert.doesNotThrow(() => validateNpmMaintainers(
    [`kim1124 <${syntheticAddress}>`],
    'kim1124',
  ));
  assert.doesNotThrow(() => validateNpmMaintainers(
    [{ email: syntheticAddress, name: 'kim1124' }],
    'kim1124',
  ));
});

test('fails closed for missing, duplicate, malformed, or mismatched maintainers', () => {
  const syntheticAddress = ['release', 'example.invalid'].join('@');

  for (const maintainers of [
    [],
    [`kim1124 <${syntheticAddress}>`, `kim1124 <${syntheticAddress}>`],
    ['malformed'],
    [`different-handle <${syntheticAddress}>`],
    [{ name: 'different-handle' }],
    null,
  ]) {
    assert.throws(
      () => validateNpmMaintainers(maintainers, 'kim1124'),
      failure,
    );
  }
});

test('derives the approved public handle from the GitHub repository URL', () => {
  assert.equal(
    parseRepositoryOwner('git+https://github.com/kim1124/comins-table.git'),
    'kim1124',
  );
  assert.throws(
    () => parseRepositoryOwner('https://example.invalid/comins-table'),
    failure,
  );
});

test('runs the value-free maintainer gate immediately before staged publishing', () => {
  const workflow = readFileSync(`${root}/.github/workflows/publish.yml`, 'utf8');
  const gate = workflow.indexOf('node scripts/check-npm-maintainer.mjs');
  const publish = workflow.indexOf('npm stage publish');

  assert.ok(gate >= 0);
  assert.ok(publish > gate);
  assert.doesNotMatch(workflow.slice(gate, publish), /npm (?:publish|stage publish)/);
});
