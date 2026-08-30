import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const outputOrder = ['policy', 'docs', 'fast', 'browser', 'gif'];
const readmeGifs = new Set([
  'docs/assets/comins-table-column-filtering.gif',
  'docs/assets/comins-table-column-pinning.gif',
  'docs/assets/comins-table-cross-table-drag.gif',
  'docs/assets/comins-table-overview.gif',
  'docs/assets/comins-table-row-grouping.gif',
]);

const packageJsonBrowserExclusions = new Set([
  'files',
  'scripts.check:docs',
  'scripts.verify',
  'version',
]);

export function classifyVerificationScope(inputPaths, context = {}) {
  const paths = inputPaths.map(normalizePath).filter(Boolean);

  return {
    policy: paths.some(isPolicyPath),
    docs: paths.some(isDocumentationPath),
    fast: paths.some((path) => !isFastExcludedPath(path)),
    browser: paths.some((path) => isBrowserPath(path, context)),
    gif: paths.some(isGifPath),
  };
}

export function isPackageJsonBrowserRelevantChange(before, after) {
  const changedPaths = collectChangedJsonPaths(before, after);

  return changedPaths.some((path) => !packageJsonBrowserExclusions.has(path));
}

export function isPackageLockBrowserRelevantChange(before, after) {
  if (!isPlainObject(before) || !isPlainObject(after)) return true;

  const normalizedBefore = copyJson(before);
  const normalizedAfter = copyJson(after);

  delete normalizedBefore.version;
  delete normalizedAfter.version;
  if (isPlainObject(normalizedBefore.packages?.[''])) delete normalizedBefore.packages[''].version;
  if (isPlainObject(normalizedAfter.packages?.[''])) delete normalizedAfter.packages[''].version;

  return JSON.stringify(normalizedBefore) !== JSON.stringify(normalizedAfter);
}

export function formatVerificationScope(scope) {
  return outputOrder.map((key) => `${key}=${scope[key] ? 'true' : 'false'}`).join('\n') + '\n';
}

function normalizePath(path) {
  return String(path).trim().replaceAll('\\', '/').replace(/^\.\//u, '');
}

function isDocumentationPath(path) {
  return path === 'README.md' ||
    path === 'DESIGN.md' ||
    path === 'docs/README.md' ||
    path === 'docs/feature-manifest.json' ||
    path.startsWith('docs/design/') ||
    path.startsWith('docs/user/') ||
    path.startsWith('docs/ko/');
}

function isPolicyPath(path) {
  return path === 'AGENTS.md' ||
    path === 'SECURITY.md' ||
    path === '.gitleaks.toml' ||
    path.startsWith('.codex/') ||
    path.startsWith('.githooks/') ||
    path.startsWith('.github/workflows/') ||
    path === 'scripts/check-public-identities.mjs' ||
    path === 'scripts/classify-verification-scope.mjs' ||
    path === 'test/sensitive-data-gates.node.mjs' ||
    path === 'test/verification-scope.test.ts';
}

function isFastExcludedPath(path) {
  return path === 'AGENTS.md' ||
    path === 'README.md' ||
    path === 'DESIGN.md' ||
    path === 'CHANGELOG.md' ||
    path === 'SECURITY.md' ||
    path.startsWith('.codex/') ||
    path.startsWith('docs/') ||
    path.startsWith('reports/');
}

function isBrowserPath(path, context) {
  if (path === 'package.json') return context.packageJsonBrowserRelevant ?? true;
  if (path === 'package-lock.json') return context.packageLockBrowserRelevant ?? true;

  return path === '.nvmrc' ||
    path === 'styles.css' ||
    path === 'playwright.config.ts' ||
    path === 'vite.example.config.ts' ||
    path === '.github/workflows/verify.yml' ||
    path === 'scripts/classify-verification-scope.mjs' ||
    path === 'test/verification-scope.test.ts' ||
    path.startsWith('src/') ||
    path.startsWith('example/') ||
    path.startsWith('test/playwright/');
}

function collectChangedJsonPaths(before, after, prefix = '') {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) || Array.isArray(after)) {
    return Array.isArray(before) && Array.isArray(after) && JSON.stringify(before) === JSON.stringify(after)
      ? []
      : [prefix];
  }
  if (!isPlainObject(before) || !isPlainObject(after)) return [prefix];

  const paths = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(...collectChangedJsonPaths(before[key], after[key], path));
  }
  return paths;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function copyJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJsonAtRevision(revision, path) {
  const source = execFileSync('git', ['show', `${revision}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(source);
}

function resolvePackageChangeContext(paths, options = {}) {
  const baseSha = options.baseSha ?? process.env.COMINS_DIFF_BASE_SHA;
  const headSha = options.headSha ?? process.env.COMINS_DIFF_HEAD_SHA;
  const context = {};

  for (const [path, key, classifier] of [
    ['package.json', 'packageJsonBrowserRelevant', isPackageJsonBrowserRelevantChange],
    ['package-lock.json', 'packageLockBrowserRelevant', isPackageLockBrowserRelevantChange],
  ]) {
    if (!paths.includes(path)) continue;

    context[key] = true;
    if (!baseSha || !headSha) continue;

    try {
      context[key] = classifier(
        readJsonAtRevision(baseSha, path),
        readJsonAtRevision(headSha, path),
      );
    } catch {
      // Missing revisions, deleted manifests, and invalid JSON remain fail-closed.
    }
  }

  return context;
}

function isGifPath(path) {
  return path === 'README.md' ||
    readmeGifs.has(path) ||
    path === 'scripts/capture-readme-demo.mjs' ||
    path === 'test/readme-preview.test.ts' ||
    path === '.github/workflows/verify.yml';
}

async function runCli() {
  let input = '';

  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  const paths = input.split(/\r?\n/u).map(normalizePath).filter(Boolean);
  const context = resolvePackageChangeContext(paths);

  process.stdout.write(formatVerificationScope(classifyVerificationScope(paths, context)));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  await runCli();
}
