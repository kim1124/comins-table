import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
const spoqaFonts = [
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Bold.woff2',
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Medium.woff2',
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Regular.woff2',
];
const spoqaLicense = 'example/public/fonts/spoqa/LICENSE.SpoqaHanSans.txt';
const readmeGif = 'docs/assets/comins-table-demo.gif';
const reservedFontNames = [
  'Spoqa Han Sans',
  'Spoqa Han Sans JP',
  'Spoqa Han Sans Neo',
];
const spoqaLicenseText = readFileSync(join(repositoryRoot, spoqaLicense), 'utf8');
const currentReviewEntries = [
  { name: 'lightningcss', version: '1.32.0', license: 'MPL-2.0', dev: true },
  { name: 'lightningcss-android-arm64', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-darwin-arm64', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-darwin-x64', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-freebsd-x64', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-linux-arm-gnueabihf', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-linux-arm64-gnu', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-linux-arm64-musl', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-linux-x64-gnu', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-linux-x64-musl', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-win32-arm64-msvc', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lightningcss-win32-x64-msvc', version: '1.32.0', license: 'MPL-2.0', dev: true, optional: true },
  { name: 'lru-cache', version: '11.5.2', license: 'BlueOak-1.0.0', dev: true },
  { name: 'mdn-data', version: '2.27.1', license: 'CC0-1.0', dev: true },
];

function writeJson(root, path, value) {
  const filename = join(root, path);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function write(root, path, value) {
  const filename = join(root, path);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, value);
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

function assetEvidence() {
  const common = {
    component: 'Spoqa Han Sans Neo',
    version: '3.3.0',
    source: 'https://github.com/spoqa/spoqa-han-sans/releases/tag/v3.3.0',
    sourceRevision: 'v3.3.0',
    license: 'OFL-1.1',
    modified: false,
    repositoryDistributed: true,
    packageDistributed: false,
    reservedFontNames,
    licenseFile: spoqaLicense,
  };
  return {
    schemaVersion: 1,
    assets: [
      {
        id: 'spoqa-han-sans-neo-3.3.0',
        ...common,
        useSurface: 'repository-asset',
        generated: false,
        obligations: [
          'Keep the full OFL-1.1 text with every repository-distributed font copy.',
          'Preserve the Reserved Font Names.',
        ],
        files: spoqaFonts,
        containsFontBinary: true,
      },
      {
        id: 'comins-table-readme-demo-gif',
        ...common,
        useSurface: 'generated-output',
        generated: true,
        obligations: [
          'Keep the generated GIF outside the npm package.',
          'Do not embed the source font binaries in the GIF.',
        ],
        files: [readmeGif],
        containsFontBinary: false,
      },
    ],
  };
}

function writeSpoqaAssets(root, evidence = assetEvidence()) {
  for (const font of spoqaFonts) {
    write(root, font, Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(12)]));
  }
  write(root, spoqaLicense, spoqaLicenseText);
  write(root, readmeGif, Buffer.concat([Buffer.from('GIF87a'), Buffer.alloc(12)]));
  if (evidence) writeJson(root, 'THIRD_PARTY_ASSETS.json', evidence);
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

test('rejects package and lockfile root dependency drift', () => {
  const root = fixture();
  const lockfile = readJson(root, 'package-lock.json');
  lockfile.packages[''].devDependencies = {};
  writeJson(root, 'package-lock.json', lockfile);

  try {
    expectStructuralFailure(run(root));
  } finally {
    remove(root);
  }
});

test('rejects a root dependency without lock package metadata', () => {
  const root = fixture();
  const lockfile = readJson(root, 'package-lock.json');
  delete lockfile.packages['node_modules/automatic-tool'];
  writeJson(root, 'package-lock.json', lockfile);

  try {
    expectStructuralFailure(run(root));
  } finally {
    remove(root);
  }
});

test('rejects an external peer without lock package metadata', () => {
  const root = fixture();
  const manifest = readJson(root, 'package.json');
  const lockfile = readJson(root, 'package-lock.json');
  manifest.peerDependencies = { 'external-peer': '^1.0.0' };
  lockfile.packages[''].peerDependencies = manifest.peerDependencies;
  writeJson(root, 'package.json', manifest);
  writeJson(root, 'package-lock.json', lockfile);

  try {
    expectStructuralFailure(run(root));
  } finally {
    remove(root);
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

test('rejects an artifact whose runtime dependency boundary differs from the repository', () => {
  const root = fixture({
    entries: [{
      name: 'automatic-runtime',
      version: '1.0.0',
      license: 'MIT',
      dev: false,
    }],
  });
  const packageRoot = join(root, 'artifact', 'package');
  mkdirSync(packageRoot, { recursive: true });
  const manifest = readJson(root, 'package.json');
  manifest.dependencies = {
    ...manifest.dependencies,
    'unexpected-runtime': '1.0.0',
  };
  writeJson(packageRoot, 'package.json', manifest);
  write(packageRoot, 'LICENSE', 'MIT\n');
  execFileSync('tar', ['-czf', 'fixture.tgz', '-C', 'artifact', 'package'], {
    cwd: root,
  });

  try {
    expectStructuralFailure(run(root, '--artifact', 'fixture.tgz'));
  } finally {
    remove(root);
  }
});

test('rejects a component name that can inject diagnostic lines', () => {
  const root = fixture({
    entries: [{
      name: 'reviewed-tool',
      version: '1.0.0',
      license: 'MPL-2.0',
      dev: true,
    }],
  });
  const lockfile = readJson(root, 'package-lock.json');
  lockfile.packages['node_modules/reviewed-tool'].name = 'reviewed-tool\nPRIVATE-COMPONENT';
  writeJson(root, 'package-lock.json', lockfile);

  try {
    expectStructuralFailure(run(root));
  } finally {
    remove(root);
  }
});

test('rejects a license value that can inject diagnostic lines', () => {
  const root = fixture({
    entries: [{
      name: 'reviewed-tool',
      version: '1.0.0',
      license: 'MPL-2.0\nPRIVATE-LICENSE-BODY',
      dev: true,
    }],
  });

  try {
    expectStructuralFailure(run(root));
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

test('requires evidence for repository-distributed third-party assets', () => {
  const root = fixture();
  writeSpoqaAssets(root, null);
  try {
    expectStructuralFailure(run(root));
    writeJson(root, 'THIRD_PARTY_ASSETS.json', assetEvidence());
    expectSuccess(run(root));
  } finally {
    remove(root);
  }
});

test('rejects missing fonts, incomplete OFL text, package-boundary drift, and embedded font bytes', () => {
  const cases = [
    (root) => rmSync(join(root, spoqaFonts[0])),
    (root) => write(
      root,
      spoqaLicense,
      'SIL OPEN FONT LICENSE Version 1.1\nReserved Font Name Spoqa Han Sans Neo\n',
    ),
    (root) => write(
      root,
      spoqaLicense,
      [
        'SIL OPEN FONT LICENSE Version 1.1',
        'Reserved Font Name Spoqa Han Sans JP',
        'Reserved Font Name Spoqa Han Sans Neo',
        '',
      ].join('\n'),
    ),
    (root) => write(
      root,
      spoqaLicense,
      spoqaLicenseText.replace(
        /\nPERMISSION AND CONDITIONS[\s\S]*\nTERMINATION/,
        '\nTERMINATION',
      ),
    ),
    (root) => {
      const manifest = readJson(root, 'package.json');
      manifest.files = ['example', 'dist'];
      writeJson(root, 'package.json', manifest);
    },
    (root) => write(
      root,
      readmeGif,
      Buffer.concat([Buffer.from('GIF87a'), Buffer.from('wOF2'), Buffer.alloc(8)]),
    ),
  ];

  for (const mutate of cases) {
    const root = fixture();
    writeSpoqaAssets(root);
    mutate(root);
    try {
      expectStructuralFailure(run(root));
    } finally {
      remove(root);
    }
  }
});

test('blocks the exact current non-automatic dependencies without approvals', () => {
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
  const root = fixture({ entries: currentReviewEntries });
  try {
    const result = run(root);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.deepEqual(result.stderr.trimEnd().split('\n'), expected);
    assert.doesNotMatch(result.stderr, /Copyright|Permission is hereby granted/);
  } finally {
    remove(root);
  }
});

test('accepts the current repository after exact scoped maintainer approval', () => {
  expectSuccess(run(repositoryRoot));
});
