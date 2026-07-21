import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const scanner = join(repositoryRoot, 'scripts', 'check-repository-hygiene.mjs');
const fixtures: string[] = [];
const failure = 'repository-hygiene-check: failed\n';

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), 'comins-table-hygiene-'));
  fixtures.push(root);
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'comins-ci');
  git(root, 'config', 'user.email', ['comins-ci', 'users.noreply.github.com'].join('@'));
  write(root, 'README.md', '# Fixture\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '--quiet', '-m', 'fixture');
  return root;
}

function write(root: string, path: string, content: string | Uint8Array) {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function run(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [scanner, ...args], { cwd: root, encoding: 'utf8' });
}

function expectFailure(result: ReturnType<typeof run>) {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toBe(failure);
}

describe('repository hygiene', () => {
  it('passes a clean tracked repository', () => {
    const root = createRepository();
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('blocks a force-added local-only path without exposing it', () => {
    const root = createRepository();
    write(root, '.local/benchmarks/catalog.md', 'local research\n');
    git(root, 'add', '--force', '.local/benchmarks/catalog.md');
    expectFailure(run(root, '--staged'));
  });

  it('blocks benchmark paths and named comparison content', () => {
    const root = createRepository();
    write(root, 'benchmarks/capture.png', new Uint8Array([0, 1, 2, 3]));
    git(root, 'add', 'benchmarks/capture.png');
    expectFailure(run(root, '--staged'));

    git(root, 'reset', '--quiet');
    rmSync(join(root, 'benchmarks'), { recursive: true, force: true });
    write(root, 'notes.md', ['AG', 'Grid'].join(' ') + '\n');
    git(root, 'add', 'notes.md');
    expectFailure(run(root, '--staged'));
  });

  it('reads the staged snapshot instead of an unstaged edit', () => {
    const root = createRepository();
    write(root, 'notes.md', 'public module notes\n');
    git(root, 'add', 'notes.md');
    write(root, 'notes.md', ['AG', 'Grid'].join(' ') + '\n');

    const result = run(root, '--staged');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('keeps repository-only safeguards outside the package allow-list', () => {
    const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
      files: string[];
    };
    expect(packageJson.files).toEqual(['dist', 'README.md', 'styles.css', 'CHANGELOG.md']);
    for (const path of ['scripts', 'test', 'reports', '.githooks', '.local']) {
      expect(packageJson.files).not.toContain(path);
    }
  });
});
