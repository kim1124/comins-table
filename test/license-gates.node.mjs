import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const checker = join(repositoryRoot, 'scripts', 'check-licenses.mjs');
const structuralFailure = 'license-check: failed\n';
const automaticLicenses = [
  'MIT',
  'MIT-0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
];
const requiredInvalidations = [
  'component',
  'version',
  'license',
  'use-surface',
  'distribution',
];

function writeJson(root, path, value) {
  const filename = join(root, path);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture({
  entries = [
    {
      name: 'automatic-tool',
      version: '1.0.0',
      license: 'MIT',
      dev: true,
    },
  ],
  approvals,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'comins-table-license-'));
  const packageJson = {
    name: 'comins-license-fixture',
    version: '1.0.0',
    license: 'MIT',
    devDependencies: Object.fromEntries(
      entries.filter((entry) => entry.dev).map((entry) => [entry.name, entry.version]),
    ),
    dependencies: Object.fromEntries(
      entries.filter((entry) => !entry.dev).map((entry) => [entry.name, entry.version]),
    ),
  };
  const packages = {
    '': {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
    },
  };

  for (const entry of entries) {
    packages[`node_modules/${entry.name}`] = {
      version: entry.version,
      license: entry.license,
      dev: entry.dev || undefined,
      optional: entry.optional || undefined,
      description: entry.description,
    };
  }

  writeJson(root, 'package.json', packageJson);
  writeJson(root, 'package-lock.json', {
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages,
  });
  if (approvals) writeJson(root, 'THIRD_PARTY_LICENSE_APPROVALS.json', approvals);
  return root;
}

function approval(overrides = {}) {
  return {
    components: ['lightningcss'],
    version: '1.32.0',
    license: 'MPL-2.0',
    useSurface: 'development-only-tooling',
    distributed: false,
    conditions: ['Remain development-only and absent from repository artifacts.'],
    rationale: 'Reviewed build tooling that is not copied, modified, bundled, or distributed.',
    approvedBy: 'maintainer',
    reviewDate: '2026-07-29',
    invalidatesOn: requiredInvalidations,
    ...overrides,
  };
}

function approvals(...items) {
  return {
    schemaVersion: 1,
    approvals: items,
  };
}

function run(root, ...args) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function expectSuccess(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

function expectReview(result, diagnostic) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `${diagnostic}\n`);
}

function expectStructuralFailure(result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, structuralFailure);
}

function remove(root) {
  rmSync(root, { recursive: true, force: true });
}

test('passes routine dependencies with exact automatic SPDX metadata', () => {
  for (const license of automaticLicenses) {
    const root = fixture({
      entries: [{
        name: `tool-${license.toLowerCase()}`,
        version: '1.0.0',
        license,
        dev: true,
      }],
    });
    try {
      expectSuccess(run(root));
    } finally {
      remove(root);
    }
  }
});

for (const license of [undefined, '', 'NOASSERTION', 'UNLICENSED']) {
  test(`requires review for ${license === undefined ? 'missing' : license || 'empty'} license metadata`, () => {
    const root = fixture({
      entries: [{
        name: 'reviewed-tool',
        version: '1.0.0',
        license,
        dev: true,
      }],
    });
    try {
      expectReview(
        run(root),
        `license-check: review required: reviewed-tool@1.0.0 (${license || 'missing'}; development-only-tooling)`,
      );
    } finally {
      remove(root);
    }
  });
}

for (const license of [
  'MIT OR Apache-2.0',
  'MIT AND BSD-3-Clause',
  'GPL-2.0-only WITH Classpath-exception-2.0',
]) {
  test(`requires review for compound expression ${license}`, () => {
    const root = fixture({
      entries: [{
        name: 'compound-tool',
        version: '2.0.0',
        license,
        dev: true,
      }],
    });
    try {
      expectReview(
        run(root),
        `license-check: review required: compound-tool@2.0.0 (${license}; development-only-tooling)`,
      );
    } finally {
      remove(root);
    }
  });
}

test('requires review for development-only MPL tooling', () => {
  const root = fixture({
    entries: [{
      name: 'lightningcss',
      version: '1.32.0',
      license: 'MPL-2.0',
      dev: true,
    }],
  });
  try {
    expectReview(
      run(root),
      'license-check: review required: lightningcss@1.32.0 (MPL-2.0; development-only-tooling)',
    );
  } finally {
    remove(root);
  }
});

test('accepts an exact scoped approval', () => {
  const root = fixture({
    entries: [{
      name: 'lightningcss',
      version: '1.32.0',
      license: 'MPL-2.0',
      dev: true,
    }],
    approvals: approvals(approval()),
  });
  try {
    expectSuccess(run(root));
  } finally {
    remove(root);
  }
});

test('invalidates approval after component, version, license, use-surface, or distribution drift', () => {
  const cases = [
    {
      entry: { name: 'lightningcss-linux-x64-gnu', version: '1.32.0', license: 'MPL-2.0', dev: true },
      approval: approval(),
    },
    {
      entry: { name: 'lightningcss', version: '1.33.0', license: 'MPL-2.0', dev: true },
      approval: approval(),
    },
    {
      entry: { name: 'lightningcss', version: '1.32.0', license: 'MPL-2.0', dev: true },
      approval: approval({ license: 'MIT' }),
    },
    {
      entry: { name: 'lightningcss', version: '1.32.0', license: 'MPL-2.0', dev: false },
      approval: approval(),
    },
    {
      entry: { name: 'lightningcss', version: '1.32.0', license: 'MPL-2.0', dev: true },
      approval: approval({ distributed: true }),
    },
  ];

  for (const item of cases) {
    const root = fixture({
      entries: [item.entry],
      approvals: approvals(item.approval),
    });
    try {
      const result = run(root);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /^license-check: review required:/);
    } finally {
      remove(root);
    }
  }
});

test('rejects an unsafe artifact path without echoing it', () => {
  const root = fixture();
  try {
    expectStructuralFailure(run(root, '--artifact', '../package.tgz'));
  } finally {
    remove(root);
  }
});

test('rejects an artifact without the Comins license', () => {
  const root = fixture();
  const packageRoot = join(root, 'artifact', 'package');
  mkdirSync(packageRoot, { recursive: true });
  writeJson(packageRoot, 'package.json', {
    name: 'comins-license-fixture',
    version: '1.0.0',
    license: 'MIT',
  });
  execFileSync('tar', ['-czf', 'fixture.tgz', '-C', 'artifact', 'package'], {
    cwd: root,
  });

  try {
    expectStructuralFailure(run(root, '--artifact', 'fixture.tgz'));
  } finally {
    remove(root);
  }
});

test('does not expose package contacts or license bodies in review output', () => {
  const root = fixture({
    entries: [{
      name: 'reviewed-tool',
      version: '1.0.0',
      license: 'MPL-2.0',
      dev: true,
      description: [
        'private',
        'contact',
        'example.com',
      ].join('@'),
    }],
  });
  try {
    const result = run(root);
    expectReview(
      result,
      'license-check: review required: reviewed-tool@1.0.0 (MPL-2.0; development-only-tooling)',
    );
    assert.doesNotMatch(result.stderr, /private|contact|example\.com|Mozilla Public License/i);
  } finally {
    remove(root);
  }
});

test('keeps the current repository blocked on exact non-automatic dependencies', () => {
  const expected = [
    'license-check: review required: lightningcss@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-android-arm64@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-darwin-arm64@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-darwin-x64@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-freebsd-x64@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-linux-arm-gnueabihf@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-linux-arm64-gnu@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-linux-arm64-musl@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-linux-x64-gnu@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-linux-x64-musl@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-win32-arm64-msvc@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lightningcss-win32-x64-msvc@1.32.0 (MPL-2.0; development-only-tooling)',
    'license-check: review required: lru-cache@11.5.2 (BlueOak-1.0.0; development-only-tooling)',
    'license-check: review required: mdn-data@2.27.1 (CC0-1.0; development-only-tooling)',
  ];
  const result = run(repositoryRoot);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(result.stderr.trimEnd().split('\n'), expected);
  assert.doesNotMatch(result.stderr, /Copyright|Permission is hereby granted/);
});
