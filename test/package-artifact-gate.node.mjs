import assert from 'node:assert/strict';
// Kept outside Vitest's *.test.* collection and executed by Node's test runner.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const checker = join(root, 'scripts', 'verify-package-artifact.mjs');
const failure = 'package-artifact-check: failed\n';
const radixName = '@radix-ui/react-icons';
const radixVersion = '1.3.2';
const radixIntegrity = 'sha512-fyQIhGDhzfc9pK2kH6Pl9c4BDJGfMkPqkyIgYDthyNYoNg3wVhoJMMh19WS4Up/1KMPFVpNsT2q3WmXn2N1m6g==';
const radixRevision = 'bde33b13aa5848555f5512ac12155930fb4beb7d';
const radixLicenseText = readFileSync(join(root, 'node_modules', radixName, 'LICENSE'), 'utf8');

function radixNotice() {
  return [
    '# Third-Party Notices',
    '',
    '## Radix Icons',
    '',
    `- Component: ${radixName}`,
    `- Version: ${radixVersion}`,
    `- Revision: ${radixRevision}`,
    '- Source: https://github.com/radix-ui/icons',
    '- License: MIT',
    '- Use surface: external runtime dependency; may be bundled by downstream applications',
    '- Modified or copied by Comins: no',
    '',
    '<!-- radix-icons-used-exports:start -->',
    '- `ChevronRightIcon`',
    '<!-- radix-icons-used-exports:end -->',
    '',
    radixLicenseText.trimEnd(),
    '',
  ].join('\n');
}

function fixture({
  files = ['dist', 'README.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md'],
  dependencies = { [radixName]: radixVersion },
  optionalDependencies,
  includeLicense = true,
  includeNotice = true,
  indexDeclaration = 'export declare const value: number;\n',
  indexSource = `import { ChevronRightIcon } from "${radixName}";\nexport const value = ChevronRightIcon;\n`,
  mapSources = ['../src/index.ts'],
  packageName = 'comins-table',
} = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'comins-table-package-'));
  mkdirSync(join(cwd, 'dist'));
  writeFileSync(join(cwd, 'dist', 'index.js'), indexSource);
  writeFileSync(join(cwd, 'dist', 'index.js.map'), JSON.stringify({
    version: 3,
    file: 'index.js',
    sources: mapSources,
    names: [],
    mappings: '',
  }));
  for (const entry of ['clipboard', 'core', 'selection']) {
    writeFileSync(join(cwd, 'dist', `${entry}.d.ts`), 'export declare const value: number;\n');
  }
  writeFileSync(join(cwd, 'dist', 'index.d.ts'), indexDeclaration);
  writeFileSync(join(cwd, 'README.md'), '# Fixture\n');
  writeFileSync(join(cwd, 'CHANGELOG.md'), '# Changes\n');
  if (includeNotice) writeFileSync(join(cwd, 'THIRD_PARTY_NOTICES.md'), radixNotice());
  if (includeLicense) writeFileSync(join(cwd, 'LICENSE'), 'MIT\n');
  const packageJson = {
    name: packageName,
    version: '1.0.0',
    license: 'MIT',
    files,
    dependencies,
    optionalDependencies,
    scripts: {
      prepack: "node -e \"require('node:fs').writeFileSync('should-not-exist','blocked')\"",
    },
  };
  writeFileSync(join(cwd, 'package.json'), JSON.stringify(packageJson));
  writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: packageJson.name,
        version: packageJson.version,
        license: packageJson.license,
        dependencies,
        optionalDependencies,
      },
      ...(dependencies?.[radixName] === radixVersion ? {
        [`node_modules/${radixName}`]: {
          version: radixVersion,
          license: 'MIT',
          integrity: radixIntegrity,
        },
      } : {}),
    },
  }));
  if (dependencies?.[radixName] === radixVersion) {
    mkdirSync(join(cwd, 'node_modules', radixName), { recursive: true });
    writeFileSync(join(cwd, 'node_modules', radixName, 'LICENSE'), radixLicenseText);
    mkdirSync(join(cwd, 'src'), { recursive: true });
    writeFileSync(
      join(cwd, 'src', 'table-icons.tsx'),
      `import { ChevronRightIcon } from "${radixName}";\n`,
    );
  }
  return cwd;
}

function run(cwd) {
  return spawnSync(process.execPath, [checker], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: join(cwd, '.npm-cache') },
  });
}

test('creates one ignored-script artifact covered by the files allow-list', () => {
  const cwd = fixture();
  try {
    const result = run(cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /^[a-z0-9._-]+\.tgz\n$/i);
    assert.equal(existsSync(join(cwd, result.stdout.trim())), true);
    assert.equal(existsSync(join(cwd, 'should-not-exist')), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails closed without a non-empty package files allow-list', () => {
  const cwd = fixture({ files: [] });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when the exact artifact omits the Comins license', () => {
  const cwd = fixture({ includeLicense: false });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when the packed manifest declares lucide-react', () => {
  const cwd = fixture({
    dependencies: { 'lucide-react': '^0.468.0' },
  });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when the packed manifest declares lucide-react in optionalDependencies', () => {
  const cwd = fixture({
    optionalDependencies: { 'lucide-react': '^0.468.0' },
  });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when optionalDependencies contains a falsy lucide-react declaration', () => {
  const cwd = fixture({
    optionalDependencies: { 'lucide-react': '' },
  });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when a shipped source map exposes bundled node_modules sources', () => {
  const cwd = fixture({
    mapSources: ['../src/index.ts', '../node_modules/lucide-react/dist/cjs/lucide-react.js'],
  });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when shipped JavaScript contains a node_modules bundle region', () => {
  const cwd = fixture({
    indexSource: '//#region node_modules/third-party-package/index.js\n',
  });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when the Comins bundle drops the Radix external import', () => {
  const cwd = fixture({ indexSource: 'export const value = 1;\n' });
  try {
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, failure);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when a public declaration exposes Radix or private icon primitives', () => {
  for (const leaked of [radixName, 'CominsTableIconButton']) {
    const cwd = fixture({ indexDeclaration: `export declare const leaked: typeof import("${leaked}");\n` });
    try {
      const result = run(cwd);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, failure);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});
