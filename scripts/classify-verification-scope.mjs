import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const outputOrder = ['policy', 'docs', 'fast', 'browser', 'gif'];

export function classifyVerificationScope(inputPaths) {
  const paths = inputPaths.map(normalizePath).filter(Boolean);

  return {
    policy: paths.some(isPolicyPath),
    docs: paths.some((path) => path.startsWith('docs/user/') || path.startsWith('docs/ko/')),
    fast: paths.some((path) => !isFastExcludedPath(path)),
    browser: paths.some(isBrowserPath),
    gif: paths.some(isGifPath),
  };
}

export function formatVerificationScope(scope) {
  return outputOrder.map((key) => `${key}=${scope[key] ? 'true' : 'false'}`).join('\n') + '\n';
}

function normalizePath(path) {
  return String(path).trim().replaceAll('\\', '/').replace(/^\.\//u, '');
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
    path === 'CHANGELOG.md' ||
    path === 'SECURITY.md' ||
    path.startsWith('.codex/') ||
    path.startsWith('docs/') ||
    path.startsWith('reports/');
}

function isBrowserPath(path) {
  return path === '.nvmrc' ||
    path === 'styles.css' ||
    path === 'playwright.config.ts' ||
    path === 'vite.example.config.ts' ||
    path === 'package.json' ||
    path === 'package-lock.json' ||
    path === '.github/workflows/verify.yml' ||
    path === 'scripts/classify-verification-scope.mjs' ||
    path === 'test/verification-scope.test.ts' ||
    path.startsWith('src/') ||
    path.startsWith('example/') ||
    path.startsWith('test/playwright/');
}

function isGifPath(path) {
  return path === 'README.md' ||
    path === 'docs/assets/comins-table-demo.gif' ||
    path === 'scripts/capture-readme-demo.mjs' ||
    path === 'test/readme-preview.test.ts' ||
    path === '.github/workflows/verify.yml';
}

async function runCli() {
  let input = '';

  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  const paths = input.split(/\r?\n/u);

  process.stdout.write(formatVerificationScope(classifyVerificationScope(paths)));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  await runCli();
}
