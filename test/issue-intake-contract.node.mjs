import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function fieldIds(yaml) {
  return [...yaml.matchAll(/^\s+id: ([a-z][a-z0-9-]*)$/gm)].map((match) => match[1]);
}

const bug = read('.github/ISSUE_TEMPLATE/01-bug-report.yml');
const feature = read('.github/ISSUE_TEMPLATE/02-feature-request.yml');
const chooser = read('.github/ISSUE_TEMPLATE/config.yml');
const prompt = read('.github/codex/issue-analysis.prompt.md');
const schema = JSON.parse(read('.github/codex/issue-analysis.schema.json'));
const workflow = read('.github/workflows/codex-issue-analysis.yml');

function assertStrictObject(objectSchema) {
  if (objectSchema.type === 'object') {
    assert.equal(objectSchema.additionalProperties, false);
    assert.deepEqual(
      [...objectSchema.required].sort(),
      Object.keys(objectSchema.properties).sort(),
    );
    for (const property of Object.values(objectSchema.properties)) {
      assertStrictObject(property);
    }
  }
}

test('keeps reporter inputs concise and distinct from maintainer work authority', () => {
  assert.deepEqual(fieldIds(bug), [
    'behavior',
    'reproduction',
    'environment',
    'additional',
    'confirmations',
  ]);
  assert.deepEqual(fieldIds(feature), [
    'problem',
    'outcome',
    'alternatives',
    'additional',
    'confirmations',
  ]);
  assert.doesNotMatch(`${bug}\n${feature}`, /label: (작업 유형|대상|범위|완료 조건|권한)$/m);
  assert.match(bug, /^  - bug$/m);
  assert.match(feature, /^  - enhancement$/m);
  assert.equal(chooser, 'blank_issues_enabled: false\n');
});

test('keeps issue analysis read-only, strict, and maintainer-gated', () => {
  assert.match(prompt, /untrusted user report/i);
  assert.match(prompt, /Do not implement changes/i);
  assert.match(prompt, /leave work authority and release decisions to the maintainer/i);
  assertStrictObject(schema);
  assert.ok(schema.required.includes('recommendedSolution'));
  assert.ok(schema.required.includes('validationStrategy'));
  assert.deepEqual(schema.properties.readiness.enum, [
    'needs-information',
    'maintainer-review',
    'implementation-ready',
    'security-routing',
  ]);
});

test('gates Codex execution and posts only a structured read-only result', () => {
  assert.match(workflow, /types: \[opened, edited, reopened, labeled\]/);
  assert.match(workflow, /OWNER.*MEMBER.*COLLABORATOR/);
  assert.match(workflow, /github\.event\.label\.name == 'codex:analyze'/);
  assert.match(workflow, /gsub\("<!\-\-\.\*\?\-\->"; ""; "s"\)/);
  assert.match(workflow, /\.\[0:20000\]/);
  assert.match(
    workflow,
    /uses: openai\/codex-action@52fe01ec70a42f454c9d2ebd47598f9fd6893d56 # v1/,
  );
  assert.match(workflow, /permission-profile: ':read-only'/);
  assert.match(workflow, /safety-strategy: drop-sudo/);
  assert.match(workflow, /output-schema-file: \.github\/codex\/issue-analysis\.schema\.json/);
  assert.match(workflow, /openai-api-key: \$\{\{ secrets\.OPENAI_API_KEY \}\}/);
  assert.match(
    workflow,
    /uses: actions\/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b # v7/,
  );
  assert.match(workflow, /issues: write/);
  assert.doesNotMatch(workflow, /pull-requests: write/);
  assert.match(workflow, /escapeHtml/);
  const scriptBlock = workflow.match(/          script: \|\n([\s\S]+)$/);
  assert.ok(scriptBlock);
  const script = scriptBlock[1]
    .split("\n")
    .map((line) => line.replace(/^ {12}/, ''))
    .join("\n");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  assert.doesNotThrow(() => new AsyncFunction('github', 'context', script));
});
