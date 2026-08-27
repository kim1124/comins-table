import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const failure = 'npm-maintainer-check: failed';

function fail() {
  throw new Error(failure);
}

export function parseRepositoryOwner(repositoryUrl) {
  if (typeof repositoryUrl !== 'string') fail();
  const match = repositoryUrl.match(
    /^git\+https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/[^/]+\.git$/,
  );
  if (!match) fail();
  return match[1];
}

function maintainerName(value) {
  if (typeof value === 'string') {
    return value.match(/^([^<>\s]+)\s+<[^<>]+>$/)?.[1] ?? null;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return typeof value.name === 'string' ? value.name : null;
  }
  return null;
}

export function validateNpmMaintainers(maintainers, expectedHandle) {
  if (
    !Array.isArray(maintainers)
    || maintainers.length !== 1
    || typeof expectedHandle !== 'string'
    || expectedHandle.length === 0
    || maintainerName(maintainers[0]) !== expectedHandle
  ) {
    fail();
  }
}

function run() {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const repositoryUrl = typeof packageJson.repository === 'string'
      ? packageJson.repository
      : packageJson.repository?.url;
    const expectedHandle = parseRepositoryOwner(repositoryUrl);
    if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) fail();

    const rawMaintainers = execFileSync(
      'npm',
      ['view', packageJson.name, 'maintainers', '--json'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    validateNpmMaintainers(JSON.parse(rawMaintainers), expectedHandle);
    process.stdout.write('npm-maintainer-check: passed\n');
  } catch {
    process.stderr.write(`${failure}\n`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) run();
