import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { playgroundFeatureRouteManifest } from "../example/src/docs/featureRouteManifest";
import type { FeatureId } from "../example/src/features/types";

const specDirectory = join(process.cwd(), "test/playwright/specs");

const featureSpecCoverage = {
  basic: ["basic-playground.spec.ts"],
  "basic-crud": ["crud-playground.spec.ts", "user-playground-docs.spec.ts"],
  size: ["playground-layout-polish.spec.ts"],
  theme: ["theme-playground.spec.ts"],
  loading: ["loading-empty-state.spec.ts"],
  header: ["header-basic.spec.ts", "header-quality.spec.ts"],
  "column-groups": ["header-basic.spec.ts"],
  "column-pinning": ["column-pinning.spec.ts"],
  cell: ["cell-row-examples.spec.ts", "cell-selection-option.spec.ts"],
  "selection-clipboard": ["selection-clipboard.spec.ts"],
  component: ["component-renderer.spec.ts"],
  row: ["row-basic.spec.ts", "cell-row-examples.spec.ts"],
  "row-expand": ["row-expand.spec.ts"],
  "row-grouping": ["row-grouping.spec.ts"],
  "cross-table-drag": ["cross-table-drag.spec.ts"],
  "column-filtering": ["column-filtering.spec.ts"],
  "summary-row": ["summary-row.spec.ts"],
  "tree-grid": ["tree-grid.spec.ts"],
  "context-menu": ["context-menu.spec.ts", "context-menu-data.spec.ts"],
  export: ["export-helper.spec.ts"],
  "ref-api": ["ref-api.spec.ts"],
  pagination: ["playground-layout-polish.spec.ts"],
  "infinite-scroll": ["infinite-scroll.spec.ts"],
  "lazy-load": ["lazy-load.spec.ts"],
  body: ["virtualization.spec.ts", "virtual-sticky-header.spec.ts"],
} satisfies Record<FeatureId, readonly string[]>;

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("test reliability contract", () => {
  it("assigns every public feature to an existing dedicated browser spec", () => {
    expect(Object.keys(featureSpecCoverage).sort()).toEqual(
      playgroundFeatureRouteManifest.map((route) => route.featureId).sort(),
    );

    for (const [featureId, specFiles] of Object.entries(featureSpecCoverage)) {
      expect(specFiles.length, `${featureId} must own at least one browser spec`).toBeGreaterThan(0);
      for (const specFile of specFiles) {
        const specPath = join(specDirectory, specFile);
        expect(existsSync(specPath), `${featureId} browser spec is missing: ${specFile}`).toBe(true);
        expect(readFileSync(specPath, "utf8"), `${specFile} must declare a Playwright test`).toMatch(
          /\btest\s*\(/u,
        );
      }
    }
  });

  it("keeps fixed waits out of ordinary user-behavior E2E", () => {
    const violations = readdirSync(specDirectory)
      .filter((file) => file.endsWith(".spec.ts"))
      .flatMap((file) => {
        const source = readFileSync(join(specDirectory, file), "utf8");
        if (!source.includes("waitForTimeout")) return [];

        const titles = [...source.matchAll(/\btest\s*\(\s*["'`]([^"'`]+)["'`]/gu)]
          .map((match) => match[1] ?? "");
        return titles.length > 0 && titles.every((title) => title.includes("@perf"))
          ? []
          : [file];
      });

    expect(violations).toEqual([]);
  });

  it("does not allow committed skip, fixme, or focused Playwright cases", () => {
    const violations = readdirSync(specDirectory)
      .filter((file) => file.endsWith(".spec.ts"))
      .filter((file) => /\btest\.(?:skip|fixme|only)\s*\(/u.test(readFileSync(join(specDirectory, file), "utf8")));

    expect(violations).toEqual([]);
  });

  it("keeps local E2E deterministic and treats flaky retries as failures", () => {
    const config = read("playwright.config.ts");

    expect(config).toMatch(/forbidOnly:\s*true/u);
    expect(config).toMatch(/failOnFlakyTests:\s*true/u);
    expect(config).toMatch(/retries:\s*isCI\s*\?\s*1\s*:\s*0/u);
    expect(config).toMatch(/workers:\s*1/u);
  });

  it("keeps local full verification ordered from fast gates to E2E and performance", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["verify:local"]).toBe("npm run verify && npm run verify:e2e");
    expect(packageJson.scripts?.["verify:full"]).toBe(
      "npm run verify:local && npm run test:perf -- --workers=1",
    );
  });
});
