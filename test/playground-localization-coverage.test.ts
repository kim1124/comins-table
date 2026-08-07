import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isArrayLiteralExpression,
  isCallExpression,
  isIdentifier,
  isJsxAttribute,
  isJsxText,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  isVariableDeclaration,
  type ArrayLiteralExpression,
  type Node,
  type ObjectLiteralExpression,
  type SourceFile,
} from "typescript/unstable/ast";
import { API } from "typescript/unstable/sync";

import { dataTableOptionGuide, getDataTableOptionGuide } from "../example/src/docs/dataTableOptionGuide";
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

  it("keeps every feature and option-guide description as an explicit localized pair", () => {
    const api = new API();
    const files = [
      resolve("example/src/features/featureRegistry.tsx"),
      resolve("example/src/docs/dataTableOptionGuide.ts"),
    ];
    const snapshot = api.updateSnapshot({ openFiles: files });

    try {
      const featureSource = getSourceFile(snapshot, files[0]!);
      const featureArray = getArrayVariable(featureSource, "featureRegistry");
      expect(featureArray.elements.length).toBe(featureRegistry.length);

      for (const element of featureArray.elements) {
        expect(isObjectLiteralExpression(element), "Every feature must be an object literal.").toBe(true);
        const feature = element as ObjectLiteralExpression;
        assertLocalizedTextCall(featureSource, feature, "label", { allowSame: true });
        assertLocalizedTextCall(featureSource, feature, "description", { requireKorean: true });
        assertLocalizedTextCall(featureSource, feature, "summary", { requireKorean: true });

        const options = getArrayProperty(featureSource, feature, "options");
        for (const option of options.elements) {
          expect(isObjectLiteralExpression(option), "Every feature option must be an object literal.").toBe(true);
          assertLocalizedTextCall(featureSource, option as ObjectLiteralExpression, "description", {
            requireKorean: true,
          });
        }
      }

      const guideSource = getSourceFile(snapshot, files[1]!);
      const guideArray = getArrayVariable(guideSource, "dataTableOptionGuide");
      for (const groupNode of guideArray.elements) {
        expect(isObjectLiteralExpression(groupNode), "Every option-guide group must be an object literal.").toBe(true);
        const group = groupNode as ObjectLiteralExpression;
        assertLocalizedTextCall(guideSource, group, "title", { allowSame: true });
        const items = getArrayProperty(guideSource, group, "items");
        for (const itemNode of items.elements) {
          expect(isObjectLiteralExpression(itemNode), "Every option-guide item must be an object literal.").toBe(true);
          assertLocalizedTextCall(guideSource, itemNode as ObjectLiteralExpression, "description", {
            requireKorean: true,
          });
        }
      }
    } finally {
      snapshot.dispose();
      api.close();
    }
  });

  it("connects representative features to meaning-specific Korean metadata", () => {
    expect(findFeature("basic", "ko").description).toBe(
      "Comins Table의 기본 data, Column, Row ID와 Theme 구성을 확인하는 예제입니다.",
    );
    expect(findFeature("header", "ko").options.find((option) => option.name === "multiSort")?.description).toBe(
      "Shift 키로 여러 Column의 우선순위 정렬을 활성화합니다.",
    );
    expect(findFeature("row-expand", "ko").summary).toBe(
      "고정 높이와 측정 기반 자동 Detail 높이를 사용하는 controlled Row Expand 예제입니다.",
    );
    expect(findFeature("tree-grid", "ko").summary).toBe(
      "배열 Ref 펼침, 10000개 Node 가상화, Component, renderer와 styling을 포함한 controlled nested Row 예제입니다.",
    );
  });

  it("connects representative options to meaning-specific Korean contracts", () => {
    const koreanGuide = getDataTableOptionGuide("ko");
    const descriptions = new Map(
      koreanGuide.flatMap((group) => group.items.map((item) => [item.name, item.description] as const)),
    );

    expect(descriptions.get("data")).toBe(
      "Table이 렌더링하는 controlled Row 배열입니다. 배열을 교체하면 Row를 다시 렌더링합니다.",
    );
    expect(descriptions.get("getRowDetailHeight")).toBe(
      '유한한 양수의 고정 Detail 높이를 반환합니다. 값이 없거나 유효하지 않거나 "auto"이면 inline height 없이 측정 기반 자동 높이를 사용합니다.',
    );
    expect(descriptions.get("onChangeExpandedRowIds")).toBe(
      "Disclosure가 전환된 뒤 다음 controlled owner Row ID 배열을 전달합니다. 생략하면 disclosure는 비활성 read-only 상태입니다.",
    );
    expect(descriptions.get("data + onChangeData")).toBe(
      "외부 useState 또는 store 배열을 data에 직접 연결합니다. Table에서 발생한 변경은 onChangeData를 통해 전달됩니다.",
    );

    const sourceKoreanDescriptions = dataTableOptionGuide.flatMap((group) =>
      group.items.map((item) => item.description.ko),
    );
    expect(sourceKoreanDescriptions).not.toContain(
      "현재 지원 동작과 application-owned 계약을 설명합니다.",
    );
    expect(new Set(sourceKoreanDescriptions).size).toBe(sourceKoreanDescriptions.length);
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

function getSourceFile(snapshot: ReturnType<API["updateSnapshot"]>, file: string) {
  const sourceFile = snapshot.getDefaultProjectForFile(file)?.program.getSourceFile(file);
  expect(sourceFile, `${file} should be available to the TypeScript compiler API`).toBeDefined();
  return sourceFile!;
}

function getArrayVariable(sourceFile: SourceFile, variableName: string) {
  let result: ArrayLiteralExpression | undefined;

  const visit = (node: Node) => {
    if (
      isVariableDeclaration(node)
      && isIdentifier(node.name)
      && node.name.text === variableName
      && node.initializer
      && isArrayLiteralExpression(node.initializer)
    ) {
      result = node.initializer;
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  expect(result, `${variableName} must be declared directly as an array literal.`).toBeDefined();
  return result!;
}

function getArrayProperty(sourceFile: SourceFile, object: ObjectLiteralExpression, propertyName: string) {
  const property = object.properties.find(
    (candidate) => isPropertyAssignment(candidate) && candidate.name.getText(sourceFile) === propertyName,
  );
  expect(property, `${propertyName} must be declared explicitly.`).toBeDefined();
  expect(
    isPropertyAssignment(property!) && isArrayLiteralExpression(property!.initializer),
    `${propertyName} must be an array literal.`,
  ).toBe(true);
  return (property as import("typescript/unstable/ast").PropertyAssignment).initializer as ArrayLiteralExpression;
}

function assertLocalizedTextCall(
  sourceFile: SourceFile,
  object: ObjectLiteralExpression,
  propertyName: string,
  options: { allowSame?: boolean; requireKorean?: boolean } = {},
) {
  const property = object.properties.find(
    (candidate) => isPropertyAssignment(candidate) && candidate.name.getText(sourceFile) === propertyName,
  );
  expect(property, `${propertyName} must be declared explicitly.`).toBeDefined();
  expect(isPropertyAssignment(property!), `${propertyName} must be a property assignment.`).toBe(true);
  const initializer = (property as import("typescript/unstable/ast").PropertyAssignment).initializer;
  expect(isCallExpression(initializer), `${propertyName} must call defineLocalizedText directly.`).toBe(true);
  expect(
    isCallExpression(initializer) && isIdentifier(initializer.expression) && initializer.expression.text,
    `${propertyName} must call defineLocalizedText directly.`,
  ).toBe("defineLocalizedText");

  const args = isCallExpression(initializer) ? initializer.arguments : [];
  expect(args.length, `${propertyName} must provide Korean and English text.`).toBe(2);
  expect(args.every(isStringLiteral), `${propertyName} translations must be string literals.`).toBe(true);
  const [ko, en] = args.map((argument) => isStringLiteral(argument) ? argument.text : "");
  expect(ko?.trim(), `${propertyName}.ko must not be empty.`).not.toBe("");
  expect(en?.trim(), `${propertyName}.en must not be empty.`).not.toBe("");
  if (!options.allowSame) {
    expect(ko, `${propertyName}.ko must not duplicate English.`).not.toBe(en);
  }
  expect(ko).not.toContain("설정과 예제 동작을 확인합니다.");
  expect(ko).not.toContain("현재 지원 동작과 application-owned 계약을 설명합니다.");
  if (options.requireKorean) {
    expect(ko, `${propertyName}.ko must contain Korean copy.`).toMatch(/[가-힣]/u);
  }
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
