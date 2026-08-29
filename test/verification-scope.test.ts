import { describe, expect, it } from 'vitest';

import {
  classifyVerificationScope,
  formatVerificationScope,
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
    expect(classifyVerificationScope(['docs/user/22-column-pinning.md', 'reports/2026-08-29.md']))
      .toEqual({
        browser: false,
        docs: true,
        fast: false,
        gif: false,
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
