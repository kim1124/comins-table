import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  classifyVerificationScope,
  formatVerificationScope,
  isPackageJsonBrowserRelevantChange,
  isPackageLockBrowserRelevantChange,
} from '../scripts/classify-verification-scope.mjs';

describe('verification change scope', () => {
  it('runs browser verification for the exported root stylesheet', () => {
    expect(classifyVerificationScope(['styles.css'])).toEqual({
      browser: true,
      docs: false,
      fast: true,
      gif: false,
      policy: false,
    });
  });

  it('runs browser verification when the pinned local Node runtime changes', () => {
    expect(classifyVerificationScope(['.nvmrc'])).toMatchObject({
      browser: true,
      fast: true,
    });
  });

  it('keeps documentation-only changes out of executable gates', () => {
    expect(classifyVerificationScope([
      'README.md',
      'DESIGN.md',
      'docs/README.md',
      'docs/design/componentization.md',
      'docs/feature-manifest.json',
      'docs/user/22-column-pinning.md',
      'reports/2026-08-29.md',
    ]))
      .toEqual({
        browser: false,
        docs: true,
        fast: false,
        gif: true,
        policy: false,
      });
  });

  it('runs the complete selected gates when workflow routing changes', () => {
    expect(classifyVerificationScope(['.github/workflows/verify.yml'])).toEqual({
      browser: true,
      docs: false,
      fast: true,
      gif: true,
      policy: true,
    });
  });

  it('keeps manifest changes fail-closed when field context is unavailable', () => {
    expect(classifyVerificationScope(['package.json', 'package-lock.json'])).toMatchObject({
      browser: true,
      fast: true,
    });
  });

  it('does not select browser verification for approved package metadata fields', () => {
    const before = {
      files: ['README.md'],
      keywords: ['react', 'table'],
      scripts: { 'check:docs': 'old', verify: 'old', test: 'unchanged' },
      version: '0.1.8',
    };
    const after = {
      files: ['README.md', 'DESIGN.md'],
      keywords: ['react', 'table'],
      scripts: { 'check:docs': 'new', verify: 'new', test: 'unchanged' },
      version: '0.1.9',
    };

    expect(isPackageJsonBrowserRelevantChange(before, JSON.parse(JSON.stringify(before)))).toBe(false);
    expect(isPackageJsonBrowserRelevantChange(before, after)).toBe(false);
    expect(classifyVerificationScope(['package.json'], {
      packageJsonBrowserRelevant: isPackageJsonBrowserRelevantChange(before, after),
    })).toMatchObject({
      browser: false,
      fast: true,
    });
  });

  it('selects browser verification for dependency and package export changes', () => {
    expect(isPackageJsonBrowserRelevantChange(
      { dependencies: { react: '^19.0.0' } },
      { dependencies: { react: '^19.1.0' } },
    )).toBe(true);
    expect(isPackageJsonBrowserRelevantChange(
      { exports: { '.': './dist/index.js' } },
      { exports: { '.': './dist/new-index.js' } },
    )).toBe(true);
  });

  it('ignores lockfile package versions but selects dependency graph changes', () => {
    const before = {
      lockfileVersion: 3,
      packages: {
        '': { dependencies: { react: '^19.0.0' }, version: '0.1.8' },
        'node_modules/react': { version: '19.0.0' },
      },
      version: '0.1.8',
    };
    const metadataOnly = {
      ...before,
      packages: { ...before.packages, '': { ...before.packages[''], version: '0.1.9' } },
      version: '0.1.9',
    };
    const dependencyChange = {
      ...metadataOnly,
      packages: {
        ...metadataOnly.packages,
        'node_modules/react': { version: '19.1.0' },
      },
    };

    expect(isPackageLockBrowserRelevantChange(before, metadataOnly)).toBe(false);
    expect(isPackageLockBrowserRelevantChange(before, dependencyChange)).toBe(true);
  });

  it('treats the classifier and its contract test as policy and browser inputs', () => {
    for (const path of [
      'scripts/classify-verification-scope.mjs',
      'test/verification-scope.test.ts',
    ]) {
      expect(classifyVerificationScope([path])).toMatchObject({
        browser: true,
        fast: true,
        policy: true,
      });
    }
  });

  it('provides the reviewed revisions to the field-aware CLI classifier', () => {
    const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');

    expect(workflow).toContain('COMINS_DIFF_BASE_SHA="$base_sha"');
    expect(workflow).toContain('COMINS_DIFF_HEAD_SHA="$head_sha"');
  });

  it('normalizes paths and formats stable GitHub outputs', () => {
    const scope = classifyVerificationScope(['./src/index.tsx', 'docs\\ko\\22-column-pinning.md']);

    expect(scope).toEqual({
      browser: true,
      docs: true,
      fast: true,
      gif: false,
      policy: false,
    });
    expect(formatVerificationScope(scope)).toBe(
      'policy=false\ndocs=true\nfast=true\nbrowser=true\ngif=false\n',
    );
  });
});
