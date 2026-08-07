import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, isAbsolute, resolve } from 'node:path';
import {
  isImportDeclaration,
  isNamedImports,
  isStringLiteral,
} from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

const STRUCTURAL_FAILURE = 'license-check: failed\n';
const AUTOMATIC_LICENSES = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
]);
const INVALIDATION_BOUNDARY = [
  'component',
  'version',
  'license',
  'use-surface',
  'distribution',
];
const USE_SURFACES = new Set([
  'development-only-tooling',
  'peer-or-external-runtime',
  'runtime',
  'transitive-runtime',
]);
const APPROVAL_KEYS = [
  'components',
  'version',
  'license',
  'useSurface',
  'distributed',
  'conditions',
  'rationale',
  'approvedBy',
  'reviewDate',
  'invalidatesOn',
];
const ASSET_KEYS = [
  'id',
  'component',
  'version',
  'source',
  'sourceRevision',
  'license',
  'useSurface',
  'modified',
  'generated',
  'repositoryDistributed',
  'packageDistributed',
  'reservedFontNames',
  'obligations',
  'licenseFile',
  'files',
  'containsFontBinary',
];
const SPOQA_FONTS = [
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Bold.woff2',
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Medium.woff2',
  'example/public/fonts/spoqa/SpoqaHanSansNeo-Regular.woff2',
];
const SPOQA_LICENSE = 'example/public/fonts/spoqa/LICENSE.SpoqaHanSans.txt';
const SPOQA_LICENSE_SHA256 = 'd9574d06965f8a559e73540ac5d8e99f22bcf69a0440e916ec9b9e48464b5093';
const README_GIF = 'docs/assets/comins-table-demo.gif';
const ASSET_EVIDENCE = 'THIRD_PARTY_ASSETS.json';
const RESERVED_FONT_NAMES = [
  'Spoqa Han Sans',
  'Spoqa Han Sans JP',
  'Spoqa Han Sans Neo',
];
const RADIX_ICONS = Object.freeze({
  copyright: 'Copyright (c) 2022 WorkOS',
  integrity: 'sha512-fyQIhGDhzfc9pK2kH6Pl9c4BDJGfMkPqkyIgYDthyNYoNg3wVhoJMMh19WS4Up/1KMPFVpNsT2q3WmXn2N1m6g==',
  license: 'MIT',
  name: '@radix-ui/react-icons',
  revision: 'bde33b13aa5848555f5512ac12155930fb4beb7d',
  source: 'https://github.com/radix-ui/icons',
  version: '1.3.2',
});
const RADIX_LICENSE_TEXT = `MIT License

Copyright (c) 2022 WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
const RADIX_ICON_EXPORT_ALLOWLIST = new Set([
  'CaretSortIcon',
  'ChevronDownIcon',
  'ChevronLeftIcon',
  'ChevronRightIcon',
  'DoubleArrowLeftIcon',
  'DoubleArrowRightIcon',
  'DragHandleDots2Icon',
  'MagnifyingGlassIcon',
  'TriangleDownIcon',
  'TriangleUpIcon',
]);
const RADIX_NOTICE_START = '<!-- radix-icons-used-exports:start -->';
const RADIX_NOTICE_END = '<!-- radix-icons-used-exports:end -->';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function packageIdentifier(value) {
  return nonEmptyString(value)
    && value.length <= 214
    && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
}

function licenseAtom(value) {
  if (
    AUTOMATIC_LICENSES.has(value)
    || value === 'missing'
    || value === 'NOASSERTION'
    || value === 'UNLICENSED'
  ) {
    return true;
  }
  if (
    /^(?:DocumentRef-[A-Za-z0-9.-]+:)?LicenseRef-[A-Za-z0-9.-]+$/.test(value)
  ) {
    return true;
  }
  return /^[A-Za-z0-9][A-Za-z0-9.-]*\+?$/.test(value)
    && (value.includes('-') || /\d/.test(value));
}

function licenseIdentifier(value) {
  if (
    !nonEmptyString(value)
    || value.length > 128
    || !/^[A-Za-z0-9.+(): -]+$/.test(value)
  ) {
    return false;
  }

  const tokens = value
    .replaceAll('(', ' ( ')
    .replaceAll(')', ' ) ')
    .split(' ')
    .filter(Boolean);
  let cursor = 0;

  function primary() {
    if (tokens[cursor] === '(') {
      cursor += 1;
      if (!expression() || tokens[cursor] !== ')') return false;
      cursor += 1;
      return true;
    }
    if (!licenseAtom(tokens[cursor])) return false;
    cursor += 1;
    return true;
  }

  function withExpression() {
    if (!primary()) return false;
    if (tokens[cursor] === 'WITH') {
      cursor += 1;
      if (!licenseAtom(tokens[cursor])) return false;
      cursor += 1;
    }
    return true;
  }

  function andExpression() {
    if (!withExpression()) return false;
    while (tokens[cursor] === 'AND') {
      cursor += 1;
      if (!withExpression()) return false;
    }
    return true;
  }

  function expression() {
    if (!andExpression()) return false;
    while (tokens[cursor] === 'OR') {
      cursor += 1;
      if (!andExpression()) return false;
    }
    return true;
  }

  return expression() && cursor === tokens.length;
}

function exactKeys(value, expected) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && expected.slice().sort().every((key, index) => actual[index] === key);
}

function uniqueStringList(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every(nonEmptyString)
    && new Set(value).size === value.length;
}

function uniquePackageList(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every(packageIdentifier)
    && new Set(value).size === value.length;
}

function realDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function exactVersion(value) {
  return nonEmptyString(value)
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function publicApprover(value) {
  return value === 'maintainer' || /^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value);
}

function validApproval(approval) {
  return exactKeys(approval, APPROVAL_KEYS)
    && uniquePackageList(approval.components)
    && exactVersion(approval.version)
    && licenseIdentifier(approval.license)
    && USE_SURFACES.has(approval.useSurface)
    && typeof approval.distributed === 'boolean'
    && uniqueStringList(approval.conditions)
    && nonEmptyString(approval.rationale)
    && publicApprover(approval.approvedBy)
    && realDate(approval.reviewDate)
    && uniqueStringList(approval.invalidatesOn)
    && approval.invalidatesOn.length === INVALIDATION_BOUNDARY.length
    && INVALIDATION_BOUNDARY.every((value) => approval.invalidatesOn.includes(value));
}

function loadApprovals(root) {
  const path = resolve(root, 'THIRD_PARTY_LICENSE_APPROVALS.json');
  if (!existsSync(path)) return [];

  const record = readJson(path);
  if (
    !exactKeys(record, ['schemaVersion', 'approvals'])
    || record.schemaVersion !== 1
    || !Array.isArray(record.approvals)
    || !record.approvals.every(validApproval)
  ) {
    throw new Error('invalid approvals');
  }
  return record.approvals;
}

function packageName(path, entry) {
  let name = entry.name;
  if (name == null) {
    const marker = 'node_modules/';
    const index = path.lastIndexOf(marker);
    if (index < 0) throw new Error('invalid package path');
    name = path.slice(index + marker.length);
  }
  if (!packageIdentifier(name) || name.includes('/node_modules/')) {
    throw new Error('invalid package name');
  }
  return name;
}

function safeRepositoryPath(value) {
  if (
    !nonEmptyString(value)
    || isAbsolute(value)
    || value.split(/[\\/]/).includes('..')
    || /[*?[\]]/.test(value)
    || value.includes('\\')
  ) {
    throw new Error('unsafe repository path');
  }
  return value.replace(/^\.\//, '').replace(/\/$/, '');
}

function packageCovers(path, roots) {
  return roots.some((root) => path === root || path.startsWith(`${root}/`));
}

function sameStringSet(actual, expected) {
  return uniqueStringList(actual)
    && actual.length === expected.length
    && expected.every((value) => actual.includes(value));
}

function hasReservedFontName(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`Reserved Font Name ${escaped}(?:[.,;:]|$)`);
  return text.split(/\r?\n/).some((line) => pattern.test(line));
}

function validAssetRecord(record) {
  return exactKeys(record, ASSET_KEYS)
    && nonEmptyString(record.id)
    && record.component === 'Spoqa Han Sans Neo'
    && record.version === '3.3.0'
    && record.source === 'https://github.com/spoqa/spoqa-han-sans/releases/tag/v3.3.0'
    && record.sourceRevision === 'v3.3.0'
    && record.license === 'OFL-1.1'
    && new Set(['repository-asset', 'generated-output']).has(record.useSurface)
    && typeof record.modified === 'boolean'
    && typeof record.generated === 'boolean'
    && record.repositoryDistributed === true
    && record.packageDistributed === false
    && sameStringSet(record.reservedFontNames, RESERVED_FONT_NAMES)
    && uniqueStringList(record.obligations)
    && nonEmptyString(record.licenseFile)
    && uniqueStringList(record.files)
    && typeof record.containsFontBinary === 'boolean';
}

function inspectAssets(root, manifest) {
  const triggerPaths = [...SPOQA_FONTS, SPOQA_LICENSE, README_GIF];
  const hasTrackedAssets = triggerPaths.some((path) => existsSync(resolve(root, path)));
  const evidencePath = resolve(root, ASSET_EVIDENCE);
  if (!hasTrackedAssets && !existsSync(evidencePath)) return;
  if (!existsSync(evidencePath)) throw new Error('missing asset evidence');

  const evidence = readJson(evidencePath);
  if (
    !exactKeys(evidence, ['schemaVersion', 'assets'])
    || evidence.schemaVersion !== 1
    || !Array.isArray(evidence.assets)
    || evidence.assets.length !== 2
    || !evidence.assets.every(validAssetRecord)
  ) {
    throw new Error('invalid asset evidence');
  }

  const font = evidence.assets.find((record) => record.id === 'spoqa-han-sans-neo-3.3.0');
  const gif = evidence.assets.find((record) => record.id === 'comins-table-readme-demo-gif');
  if (
    font == null
    || gif == null
    || font.useSurface !== 'repository-asset'
    || font.modified !== false
    || font.generated !== false
    || font.containsFontBinary !== true
    || font.licenseFile !== SPOQA_LICENSE
    || !sameStringSet(font.files, SPOQA_FONTS)
    || gif.useSurface !== 'generated-output'
    || gif.modified !== false
    || gif.generated !== true
    || gif.containsFontBinary !== false
    || gif.licenseFile !== SPOQA_LICENSE
    || !sameStringSet(gif.files, [README_GIF])
  ) {
    throw new Error('invalid asset boundary');
  }

  const roots = Array.isArray(manifest.files)
    ? manifest.files.map(safeRepositoryPath)
    : [];
  for (const path of [ASSET_EVIDENCE, SPOQA_LICENSE, ...SPOQA_FONTS, README_GIF]) {
    const safePath = safeRepositoryPath(path);
    if (!existsSync(resolve(root, safePath)) || packageCovers(safePath, roots)) {
      throw new Error('invalid asset distribution');
    }
  }

  const licenseText = readFileSync(resolve(root, SPOQA_LICENSE), 'utf8');
  const normalizedLicenseText = licenseText.replace(/\r\n/g, '\n').trimEnd();
  if (
    !licenseText.includes('SIL OPEN FONT LICENSE Version 1.1')
    || RESERVED_FONT_NAMES.some((name) => !hasReservedFontName(licenseText, name))
    || createHash('sha256').update(normalizedLicenseText).digest('hex') !== SPOQA_LICENSE_SHA256
  ) {
    throw new Error('invalid OFL evidence');
  }

  for (const path of SPOQA_FONTS) {
    const bytes = readFileSync(resolve(root, path));
    if (bytes.subarray(0, 4).toString('ascii') !== 'wOF2') {
      throw new Error('invalid font asset');
    }
  }

  const gifBytes = readFileSync(resolve(root, README_GIF));
  if (
    !/^GIF8[79]a$/.test(gifBytes.subarray(0, 6).toString('ascii'))
    || gifBytes.indexOf(Buffer.from('wOF2')) >= 0
  ) {
    throw new Error('invalid generated asset');
  }
}

function useSurface(name, entry, rootManifest) {
  if (entry.dev === true) return 'development-only-tooling';
  if (Object.hasOwn(rootManifest.peerDependencies ?? {}, name)) {
    return 'peer-or-external-runtime';
  }
  if (
    Object.hasOwn(rootManifest.dependencies ?? {}, name)
    || Object.hasOwn(rootManifest.optionalDependencies ?? {}, name)
  ) {
    return 'runtime';
  }
  return 'transitive-runtime';
}

function approvalMatches(approval, component) {
  return approval.components.includes(component.name)
    && approval.version === component.version
    && approval.license === component.license
    && approval.useSurface === component.useSurface
    && approval.distributed === component.distributed;
}

function collectSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

function collectRadixImports(root) {
  const sourceRoot = resolve(root, 'src');
  const exampleRoot = resolve(root, 'example', 'src');
  const files = [
    ...collectSourceFiles(sourceRoot),
    ...collectSourceFiles(exampleRoot),
  ];
  if (files.length === 0) throw new Error('missing source inventory');

  const api = new API();
  const snapshot = api.updateSnapshot({ openFiles: files });
  const imports = new Set();

  try {
    for (const file of files) {
      const sourceFile = snapshot.getDefaultProjectForFile(file)?.program.getSourceFile(file);
      if (!sourceFile) throw new Error('missing source file');

      for (const statement of sourceFile.statements) {
        if (!isImportDeclaration(statement) || !isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (file.startsWith(exampleRoot) && /(?:^|\/)table-icons(?:\.[jt]sx?)?$/.test(specifier)) {
          throw new Error('private icon boundary');
        }
        if (!specifier.startsWith(RADIX_ICONS.name)) continue;
        if (specifier !== RADIX_ICONS.name) throw new Error('invalid Radix module specifier');

        const clause = statement.importClause;
        const bindings = clause?.namedBindings;
        if (clause?.name || !bindings || !isNamedImports(bindings)) {
          throw new Error('invalid Radix import style');
        }
        for (const element of bindings.elements) {
          const name = element.propertyName?.text ?? element.name.text;
          if (!RADIX_ICON_EXPORT_ALLOWLIST.has(name)) throw new Error('unapproved Radix export');
          imports.add(name);
        }
      }
    }
  } finally {
    snapshot.dispose();
    api.close();
  }

  if (imports.size === 0) throw new Error('empty Radix inventory');
  return [...imports].sort();
}

function parseRadixNoticeInventory(notice) {
  const start = notice.indexOf(RADIX_NOTICE_START);
  const end = notice.indexOf(RADIX_NOTICE_END);
  if (start < 0 || end <= start || notice.indexOf(RADIX_NOTICE_START, start + 1) >= 0) {
    throw new Error('invalid notice markers');
  }
  const block = notice.slice(start + RADIX_NOTICE_START.length, end).trim();
  const entries = block ? block.split('\n').map((line) => {
    const match = /^- `([A-Za-z][A-Za-z0-9]*)`$/.exec(line.trim());
    if (!match || !RADIX_ICON_EXPORT_ALLOWLIST.has(match[1])) {
      throw new Error('invalid notice inventory');
    }
    return match[1];
  }) : [];
  if (entries.length === 0 || new Set(entries).size !== entries.length) {
    throw new Error('invalid notice inventory');
  }
  return entries.sort();
}

function inspectRadixIcons(root, manifest, lockfile) {
  const dependencySections = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies'];
  const declaredSections = dependencySections.filter((section) =>
    Object.hasOwn(manifest[section] ?? {}, RADIX_ICONS.name));
  const mustInspect = manifest.name === 'comins-table' || declaredSections.length > 0;
  if (!mustInspect) return;

  if (
    declaredSections.length !== 1
    || declaredSections[0] !== 'dependencies'
    || manifest.dependencies[RADIX_ICONS.name] !== RADIX_ICONS.version
    || lockfile.packages['']?.dependencies?.[RADIX_ICONS.name] !== RADIX_ICONS.version
  ) {
    throw new Error('invalid Radix dependency boundary');
  }

  const locked = lockfile.packages[`node_modules/${RADIX_ICONS.name}`];
  if (
    !locked
    || locked.version !== RADIX_ICONS.version
    || locked.license !== RADIX_ICONS.license
    || locked.integrity !== RADIX_ICONS.integrity
  ) {
    throw new Error('invalid Radix lock evidence');
  }

  const upstreamLicensePath = resolve(root, 'node_modules', RADIX_ICONS.name, 'LICENSE');
  if (!existsSync(upstreamLicensePath)) throw new Error('missing Radix license');
  const upstreamLicense = readFileSync(upstreamLicensePath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (upstreamLicense !== RADIX_LICENSE_TEXT) throw new Error('invalid Radix license');

  const noticePath = resolve(root, 'THIRD_PARTY_NOTICES.md');
  if (!existsSync(noticePath)) throw new Error('missing Radix notice');
  const notice = readFileSync(noticePath, 'utf8').replace(/\r\n/g, '\n');
  for (const evidence of [
    `Component: ${RADIX_ICONS.name}`,
    `Version: ${RADIX_ICONS.version}`,
    `Revision: ${RADIX_ICONS.revision}`,
    `Source: ${RADIX_ICONS.source}`,
    `License: ${RADIX_ICONS.license}`,
    RADIX_ICONS.copyright,
    'Use surface: external runtime dependency; may be bundled by downstream applications',
    'Modified or copied by Comins: no',
    RADIX_LICENSE_TEXT,
  ]) {
    if (!notice.includes(evidence)) throw new Error('incomplete Radix notice');
  }

  const sourceImports = collectRadixImports(root);
  const noticeImports = parseRadixNoticeInventory(notice);
  if (JSON.stringify(sourceImports) !== JSON.stringify(noticeImports)) {
    throw new Error('Radix inventory drift');
  }
}

function inspectDependencies(root) {
  const manifest = readJson(resolve(root, 'package.json'));
  const lockfile = readJson(resolve(root, 'package-lock.json'));
  if (
    !nonEmptyString(manifest.license)
    || lockfile.lockfileVersion !== 3
    || lockfile.packages == null
    || typeof lockfile.packages !== 'object'
    || Array.isArray(lockfile.packages)
  ) {
    throw new Error('invalid package metadata');
  }

  const lockRoot = lockfile.packages[''];
  if (lockRoot == null || typeof lockRoot !== 'object' || Array.isArray(lockRoot)) {
    throw new Error('invalid lock root');
  }
  const dependencySections = [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'devDependencies',
  ];
  for (const section of dependencySections) {
    const declared = dependencyRecord(manifest[section]);
    const locked = dependencyRecord(lockRoot[section]);
    if (JSON.stringify(declared) !== JSON.stringify(locked)) {
      throw new Error('stale lock root');
    }
  }
  const directNames = new Set(
    dependencySections.flatMap((section) => Object.keys(dependencyRecord(manifest[section]))),
  );
  for (const name of directNames) {
    if (!Object.hasOwn(lockfile.packages, `node_modules/${name}`)) {
      throw new Error('missing direct package metadata');
    }
  }

  inspectAssets(root, manifest);
  inspectRadixIcons(root, manifest, lockfile);
  const approvals = loadApprovals(root);
  const review = [];
  for (const [path, entry] of Object.entries(lockfile.packages)) {
    if (path === '') continue;
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('invalid lock entry');
    }
    const name = packageName(path, entry);
    if (!exactVersion(entry.version)) throw new Error('invalid dependency version');
    const license = entry.license == null || entry.license === ''
      ? 'missing'
      : entry.license;
    if (!licenseIdentifier(license)) throw new Error('invalid license identifier');
    if (AUTOMATIC_LICENSES.has(license)) continue;

    const surface = useSurface(name, entry, manifest);
    const component = {
      name,
      version: entry.version,
      license,
      useSurface: surface,
      distributed: false,
    };
    if (!approvals.some((approval) => approvalMatches(approval, component))) {
      review.push(component);
    }
  }

  return review.sort(
    (left, right) => left.name.localeCompare(right.name)
      || left.version.localeCompare(right.version),
  );
}

function safeArtifactPath(value) {
  if (
    !nonEmptyString(value)
    || isAbsolute(value)
    || value.split(/[\\/]/).includes('..')
    || /[*?[\]]/.test(value)
    || basename(value) !== value
    || !/^[A-Za-z0-9._-]+\.tgz$/.test(value)
  ) {
    throw new Error('invalid artifact path');
  }
  return value;
}

function packedPaths(filename) {
  const listing = execFileSync('tar', ['-tzf', filename], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const paths = listing.split('\n').filter(Boolean);
  if (
    paths.length === 0
    || paths.some(
      (path) => isAbsolute(path)
        || path.split('/').includes('..')
        || !(path === 'package' || path.startsWith('package/')),
    )
  ) {
    throw new Error('unsafe artifact');
  }
  return paths;
}

function readPackedFile(filename, path) {
  return execFileSync('tar', ['-xOzf', filename, `package/${path}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function dependencyRecord(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid dependency boundary');
  }

  const entries = Object.entries(value);
  if (entries.some(([name, version]) => !nonEmptyString(name) || typeof version !== 'string')) {
    throw new Error('invalid dependency boundary');
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function inspectArtifact(root, value) {
  const relative = safeArtifactPath(value);
  const filename = resolve(root, relative);
  if (!existsSync(filename)) throw new Error('missing artifact');
  const paths = packedPaths(filename);
  if (!paths.includes('package/LICENSE') || !paths.includes('package/package.json')) {
    throw new Error('missing artifact license');
  }

  const packedManifest = JSON.parse(readPackedFile(filename, 'package.json'));
  if (!nonEmptyString(packedManifest.license)) throw new Error('missing packed license');

  const repositoryManifest = readJson(resolve(root, 'package.json'));
  if (packedManifest.license !== repositoryManifest.license) {
    throw new Error('packed license drift');
  }
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const packed = dependencyRecord(packedManifest[section]);
    const repository = dependencyRecord(repositoryManifest[section]);
    if (JSON.stringify(packed) !== JSON.stringify(repository)) {
      throw new Error('packed dependency drift');
    }
  }
  if (
    Array.isArray(repositoryManifest.files)
    && repositoryManifest.files.includes('THIRD_PARTY_NOTICES.md')
    && !paths.includes('package/THIRD_PARTY_NOTICES.md')
  ) {
    throw new Error('missing packed notice');
  }
}

function parseArguments(args) {
  if (args.length === 0) return {};
  if (args.length === 2 && args[0] === '--artifact') return { artifact: args[1] };
  throw new Error('invalid arguments');
}

try {
  const root = process.cwd();
  const { artifact } = parseArguments(process.argv.slice(2));
  const review = inspectDependencies(root);
  if (artifact) inspectArtifact(root, artifact);

  if (review.length > 0) {
    for (const component of review) {
      process.stderr.write(
        `license-check: review required: ${component.name}@${component.version} `
        + `(${component.license}; ${component.useSurface})\n`,
      );
    }
    process.exitCode = 1;
  }
} catch {
  process.stderr.write(STRUCTURAL_FAILURE);
  process.exitCode = 1;
}
