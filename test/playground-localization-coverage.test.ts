import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isJsxAttribute, isJsxText, isStringLiteral, type Node, type SourceFile } from "typescript/unstable/ast";
import { API } from "typescript/unstable/sync";

import { createDocsPages } from "../example/src/docs/docsRoutes";
import { searchDataTableDocs } from "../example/src/docs/search";
import { featureRegistry, findFeature } from "../example/src/features/featureRegistry";

describe("Playground localization coverage", () => {
  it("keeps Korean and English docs route structure and code samples aligned", () => {
    const koreanPages = createDocsPages("ko");
    const englishPages = createDocsPages("en");

    expect(koreanPages.map((page) => page.path)).toEqual(englishPages.map((page) => page.path));
    expect(koreanPages.map((page) => page.featureId)).toEqual(englishPages.map((page) => page.featureId));

    koreanPages.forEach((page, index) => {
      const englishPage = englishPages[index]!;
      expect(page.category.trim()).not.toBe("");
      expect(page.label.trim()).not.toBe("");
      expect(page.summary.trim()).not.toBe("");
      expect(page.title.trim()).not.toBe("");
      expect(page.codeSamples.map((sample) => sample.code)).toEqual(
        englishPage.codeSamples.map((sample) => sample.code),
      );
      expect(page.codeSamples.every((sample) => sample.title.trim().length > 0)).toBe(true);
      expect(englishPage.codeSamples.every((sample) => sample.title.trim().length > 0)).toBe(true);
    });
  });

  it("resolves complete localized metadata for every registered feature", () => {
    featureRegistry.forEach((source) => {
      for (const localized of [source.label, source.description, source.summary]) {
        expect(localized.ko.trim()).not.toBe("");
        expect(localized.en.trim()).not.toBe("");
      }
      source.options.forEach((option) => {
        expect(option.description.ko.trim()).not.toBe("");
        expect(option.description.en.trim()).not.toBe("");
      });

      for (const locale of ["ko", "en"] as const) {
        const feature = findFeature(source.id, locale);

        expect(feature.label.trim()).not.toBe("");
        expect(feature.description.trim()).not.toBe("");
        expect(feature.summary.trim()).not.toBe("");
        expect(feature.options.every((option) => option.name.trim() && option.description.trim())).toBe(true);
      }
    });
  });

  it("keeps route and API-term search available in both locales", () => {
    for (const locale of ["ko", "en"] as const) {
      const pages = createDocsPages(locale);
      expect(searchDataTableDocs("/examples/header", pages).map((item) => item.path)).toContain(
        "/examples/header",
      );
      expect(searchDataTableDocs("onChangeSortModel", pages).map((item) => item.path)).toContain(
        "/examples/header",
      );
    }
  });

  it("rejects untranslated visible JSX text and copy attributes in route-visible sources", () => {
    const featureFiles = readdirSync(resolve("example/src/features"))
      .filter((file) => file.endsWith("Feature.tsx") && file !== "AdvancedFeature.tsx")
      .map((file) => resolve("example/src/features", file));
    const componentFiles = collectTsxFiles(resolve("example/src/components"))
      .filter((file) => !file.includes("/ui/"));
    const files = [...featureFiles, ...componentFiles];
    const api = new API();
    const violations: string[] = [];
    const snapshot = api.updateSnapshot({ openFiles: files });

    try {
      for (const file of files) {
        const sourceFile = snapshot.getDefaultProjectForFile(file)?.program.getSourceFile(file);
        expect(sourceFile, `${file} should be available to the TypeScript compiler API`).toBeDefined();

        const visit = (node: Node) => {
          if (isJsxText(node)) {
            const value = node.text.trim().replace(/\s+/gu, " ");
            const isApiToken = /^[A-Z][A-Z0-9]*$/u.test(value);
            if (/[\p{L}\p{N}]/u.test(value) && !isApiToken) {
              violations.push(formatViolation(file, sourceFile!, node, `JSX text ${JSON.stringify(value)}`));
            }
          }

          if (isJsxAttribute(node)) {
            const name = node.name.getText(sourceFile);
            const visibleCopyAttributes = new Set(["aria-label", "description", "placeholder", "title"]);
            if (visibleCopyAttributes.has(name) && node.initializer && isStringLiteral(node.initializer)) {
              violations.push(
                formatViolation(file, sourceFile!, node, `${name}=${JSON.stringify(node.initializer.text)}`),
              );
            }
          }

          node.forEachChild(visit);
        };

        visit(sourceFile!);
      }
    } finally {
      snapshot.dispose();
      api.close();
    }

    expect(violations).toEqual([]);
  });
});

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTsxFiles(path);
    }
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function formatViolation(
  file: string,
  sourceFile: SourceFile,
  node: Node,
  detail: string,
) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${file}:${line + 1} ${detail}`;
}
