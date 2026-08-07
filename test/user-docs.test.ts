import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDataTableOptionGuide } from "../example/src/docs/dataTableOptionGuide";

const englishDataTableOptionGuide = getDataTableOptionGuide("en");

const userDocs = [
  "01-quick-start.md",
  "02-data-and-crud.md",
  "03-core-state.md",
  "04-styling.md",
  "05-pagination.md",
  "06-header.md",
  "07-row.md",
  "08-cell.md",
  "09-clipboard.md",
  "10-selection.md",
  "11-virtualization.md",
  "12-playground.md",
  "13-loading-empty.md",
  "14-export.md",
  "15-infinite-scroll.md",
  "16-lazy-load.md",
  "17-tree-grid.md",
  "18-summary-row.md",
  "19-row-expand.md",
];

const implementedTerms = [
  "CominsTable",
  "data",
  "onChangeData",
  "onChangeSelection",
  "onChangeColumnLayout",
  "onChangeSort",
  "onChangeSortModel",
  "onClickCell",
  "onClickRow",
  "createCominsTableState",
  "addCominsRows",
  "updateCominsRows",
  "deleteCominsRows",
  "queryCominsRows",
  "setCominsPagination",
  "setCominsSortModel",
  "serializeCominsColumnLayout",
  "applyCominsColumnLayout",
  "selectRow",
  "selectCell",
  "selectCellRange",
  "getCominsSelectedCellRange",
  "copyCominsRow",
  "copyCominsCell",
  "copyCominsCellRange",
  "pasteCominsRow",
  "pasteCominsCell",
  "pasteCominsCellRange",
  "fillCominsCellRange",
  "props.copyable",
  "props.pasteable",
  "virtualized",
  "setSelectedRow",
  "setSelectedRows",
  "setMoveTargetRow",
  "rowProps.draggable",
  "loading",
  "emptyComponent",
  "skeletonRowCount",
  "exportCominsRowsToCsv",
  "exportCominsRowsToJson",
  "infiniteScroll",
  "infiniteScrollThreshold",
  "hasMoreRows",
  "loadingMore",
  "onLoadMore",
  "lazyLoad",
  "lazyLoadBatchSize",
  "lazyLoadMode",
  "lazyLoadThreshold",
  "onLazyLoad",
  "CominsTreeNode",
  "CominsSortModel",
  "multiSort",
  "getSortModel",
  "setSortModel",
  "summary",
  "tree",
  "expandedRowIds",
  "onChangeExpandedRowIds",
  "getRowDetailHeight",
  "estimatedRowDetailHeight",
  "renderRowDetail",
];

function readWorkspaceFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

type DataTableOptionGuide = ReadonlyArray<{
  items: ReadonlyArray<{ description: string; name: string }>;
  title: string;
}>;

const rowExpandHeightOptionDescriptions = {
  estimatedRowDetailHeight:
    "Estimate for an automatic Detail before matching-width measurement: a valid finite positive value wins; otherwise the resolved rowHeight is used.",
  getRowDetailHeight:
    'Returns a finite positive fixed Detail height. Missing, invalid, and "auto" values use measured automatic height without inline height.',
} as const;

function getRowExpandOptionGuideContractViolations(optionGuide: DataTableOptionGuide) {
  const propsGroups = optionGuide.filter((group) => group.title === "Props");
  const violations: string[] = [];

  if (propsGroups.length !== 1) {
    violations.push(`Props group must appear exactly once; received ${propsGroups.length}.`);
    return violations;
  }

  for (const [name, description] of Object.entries(rowExpandHeightOptionDescriptions)) {
    const options = propsGroups[0]!.items.filter((item) => item.name === name);

    if (options.length !== 1) {
      violations.push(`${name} must appear exactly once in Props; received ${options.length}.`);
    } else if (options[0]!.description !== description) {
      violations.push(`${name} must retain its measured automatic Detail height description.`);
    }
  }

  return violations;
}

function cloneDataTableOptionGuide() {
  return englishDataTableOptionGuide.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }));
}

describe("comins-table user documentation contract", () => {
  it("has user docs for every currently implemented core area", () => {
    for (const doc of userDocs) {
      expect(existsSync(join(process.cwd(), "docs/user", doc)), `${doc} should exist`).toBe(true);
    }
  });

  it("documents all implemented public helpers and runtime props", () => {
    const merged = userDocs
      .filter((doc) => existsSync(join(process.cwd(), "docs/user", doc)))
      .map((doc) => readWorkspaceFile(join("docs/user", doc)))
      .join("\n");

    for (const term of implementedTerms) {
      expect(merged, `${term} should be documented`).toContain(term);
    }
  });

  it("keeps README aligned with the shipped playground and user docs", () => {
    const readme = readWorkspaceFile("README.md");

    expect(readme).toContain("npm run dev");
    expect(readme).toContain("docs/user/01-quick-start.md");
    expect(readme).toContain("/examples/summary-row");
    expect(readme).toContain("/examples/tree-grid");
    expect(readme).toContain("/examples/row-expand");
    expect(readme).toContain("/examples/selection-clipboard");
    expect(readme).toContain("docs/user/17-tree-grid.md");
    expect(readme).toContain("docs/user/18-summary-row.md");
    expect(readme).toContain("docs/user/19-row-expand.md");
    expect(readme).not.toContain("does not currently ship a browser example server");
  });

  it("does not present deferred advanced features as supported user-facing APIs", () => {
    const docsText = userDocs
      .filter((doc) => existsSync(join(process.cwd(), "docs/user", doc)))
      .map((doc) => readWorkspaceFile(join("docs/user", doc)))
      .join("\n");

    expect(docsText).not.toMatch(/external store adapter.*supported/iu);
    expect(docsText).not.toMatch(/visual fill handle.*supported/iu);
  });

  it("keeps residual-risk documentation aligned with the current CSR data-table scope", () => {
    const readme = readWorkspaceFile("README.md");
    const optionGuide = readWorkspaceFile("example/src/docs/dataTableOptionGuide.ts");
    const advancedFeature = readWorkspaceFile("example/src/features/AdvancedFeature.tsx");

    expect(readme).toContain("CSR-focused controlled component");
    expect(readme).toContain("CSR");
    expect(readme).toContain("The visual fill handle is not shipped or supported");
    expect(readme).not.toContain("first public release");

    expect(optionGuide).toContain("data + onChangeData");
    expect(optionGuide).toContain("CSR");
    expect(optionGuide).toContain("Visual Fill Handle UI");

    const unavailableList = advancedFeature.match(/const unavailable = \[([\s\S]*?)\];/u)?.[1] ?? "";

    expect(unavailableList).not.toContain("advanced range selection");
    expect(unavailableList).not.toContain("multi-cell clipboard");
    expect(unavailableList).not.toContain("집계");
    expect(unavailableList).not.toContain("트리 데이터");
    expect(advancedFeature).toContain("시각적 Fill Handle UI");
  });

  it("documents the 100000-row virtualization performance contract", () => {
    const virtualization = readWorkspaceFile("docs/user/11-virtualization.md");

    expect(virtualization).toContain("100000");
    expect(virtualization).toContain("Chrome DevTools Performance Monitor");
    expect(virtualization).toContain("DOM Node");
    expect(virtualization).toContain("JS heap");
    expect(virtualization).toContain('"buffer-size"');
    expect(virtualization).toContain("rowHeight");
    expect(virtualization).toContain("--comins-table-row-height");
  });

  it("documents and demonstrates controlled Infinite Scroll ownership", () => {
    const englishDocs = readWorkspaceFile("docs/user/15-infinite-scroll.md");
    const koreanDocs = readWorkspaceFile("docs/ko/15-infinite-scroll.md");
    const playground = readWorkspaceFile("example/src/features/InfiniteScrollFeature.tsx");

    for (const term of ["infiniteScroll", "hasMoreRows", "loadingMore", "onLoadMore"]) {
      expect(englishDocs).toContain(term);
      expect(koreanDocs).toContain(term);
      expect(playground).toContain(term);
    }

    expect(playground).not.toContain("onLazyLoad=");
  });

  it("documents the controlled Selection and Clipboard React example", () => {
    const docs = [
      readWorkspaceFile("docs/user/09-clipboard.md"),
      readWorkspaceFile("docs/user/10-selection.md"),
      readWorkspaceFile("docs/ko/09-clipboard.md"),
      readWorkspaceFile("docs/ko/10-selection.md"),
    ].join("\n");
    const playground = readWorkspaceFile("example/src/features/SelectionClipboardFeature.tsx");

    for (const term of ["onChangeSelection", "cellSelection", "copyable", "pasteable", "Ctrl", "Shift"]) {
      expect(docs).toContain(term);
      expect(playground).toContain(term);
    }

    expect(docs).toContain("/examples/selection-clipboard");
    expect(playground).toContain("onChangeData={setRows}");
  });

  it("documents the detailed Summary Row and Tree Grid control contracts", () => {
    const summary = readWorkspaceFile("docs/user/18-summary-row.md");
    const tree = readWorkspaceFile("docs/user/17-tree-grid.md");

    expect(summary).toContain("count");
    expect(summary).toContain("sum");
    expect(summary).toContain("avg");
    expect(summary).toContain("colSpan");
    expect(summary).toContain("format");
    expect(summary).toContain("className");
    expect(summary).toContain("style");
    expect(tree).toContain("defaultExpandAll");
    expect(tree).toContain("expand(nodeIds?)");
    expect(tree).toContain("fold(nodeIds?)");
    expect(tree).toContain("cell.components");
    expect(tree).toContain("cell.renderer");
    expect(tree).toContain("10000");
  });

  it("documents and registers controlled Row Expand with matching public examples", () => {
    const englishPath = "docs/user/19-row-expand.md";
    const koreanPath = "docs/ko/19-row-expand.md";
    const englishRowExpand = existsSync(join(process.cwd(), englishPath))
      ? readWorkspaceFile(englishPath)
      : "";
    const koreanRowExpand = existsSync(join(process.cwd(), koreanPath))
      ? readWorkspaceFile(koreanPath)
      : "";
    const playgroundPath = "example/src/features/RowExpandFeature.tsx";
    const playground = existsSync(join(process.cwd(), playgroundPath))
      ? readWorkspaceFile(playgroundPath)
      : "";
    const advanced = readWorkspaceFile("example/src/features/AdvancedFeature.tsx");
    const registry = readWorkspaceFile("example/src/features/featureRegistry.tsx");
    const featureTypes = readWorkspaceFile("example/src/features/types.ts");
    const samples = readWorkspaceFile("example/src/docs/codeSamples.ts");
    const routes = readWorkspaceFile("example/src/docs/docsRoutes.tsx");
    const optionGuide = readWorkspaceFile("example/src/docs/dataTableOptionGuide.ts");

    for (const document of [englishRowExpand, koreanRowExpand]) {
      expect(document).toContain("expandedRowIds");
      expect(document).toContain("onChangeExpandedRowIds");
      expect(document).toContain("getRowDetailHeight");
      expect(document).toContain("estimatedRowDetailHeight");
      expect(document).toContain("renderRowDetail");
      expect(document).toContain("rowHeight");
      expect(document).toContain('"auto"');
      expect(document).toContain("300");
      expect(document).not.toContain("default `300px` fixed");
      expect(document).not.toContain("기본 fixed 높이 `300px`");
      expect(document).toContain("Expand <row-id> details");
      expect(document).toContain("Collapse <row-id> details");
      expect(document).toContain("read-only");
      expect(document).toContain("non-expandable");
    }

    expect(playground).toContain('data-testid="row-expand-example-fixed"');
    expect(playground).toContain('data-testid="row-expand-example-auto"');
    expect(playground).toContain('data-testid="row-expand-example-readonly"');
    expect(playground).toContain('data-testid="row-expand-example-non-expandable"');
    expect(playground).toContain('isRowExpandable={() => false}');
    expect(advanced).not.toContain('"Flat Row Expand"');
    expect(advanced).not.toContain('"master/detail"');
    expect(registry).toContain('id: "row-expand"');
    expect(featureTypes).toContain('| "row-expand"');
    expect(samples).toContain("rowExpandSamples");
    expect(routes).toContain('path: "/examples/row-expand"');
    expect(routes).toContain('featureId: "row-expand"');
    expect(optionGuide).toContain('name: "expandedRowIds"');
    expect(optionGuide).toContain('name: "onChangeExpandedRowIds"');
  });

  it("keeps README Row Expand height guidance aligned with measured automatic Details", () => {
    const readme = readWorkspaceFile("README.md");

    expect(readme).not.toMatch(/\b300px\b/u);
    expect(readme).toContain(
      'A finite positive CSS pixel height is fixed and retains its inline height. Missing values, invalid numeric values, and `"auto"` use measured automatic height with no inline height. Before an automatic Detail has a matching-width measurement, a valid finite positive `estimatedRowDetailHeight` is used; otherwise the resolved `rowHeight` is the estimate.',
    );
  });

  it("keeps the option guide Row Expand height guidance aligned with measured automatic Details", () => {
    expect(getRowExpandOptionGuideContractViolations(englishDataTableOptionGuide)).toEqual([]);
  });

  it("keeps the Korean Row Expand performance guidance fully translated", () => {
    const koreanDocs = readWorkspaceFile("docs/ko/19-row-expand.md");
    const normalizedKoreanDocs = koreanDocs.replace(/\s+/gu, " ");

    expect(koreanDocs).not.toContain(
      "Data Rows and collapsed Detail owners keep the arithmetic fixed-height path.",
    );
    expect(normalizedKoreanDocs).toContain(
      "Data Row와 접힌 Detail owner는 고정 높이 산술 경로를 유지합니다. 유효하게 펼쳐진 Detail로 인해 data Slot이 rowHeight보다 높아지는 경우에만 private height index가 활성화됩니다.",
    );
  });

  it("rejects a duplicate Props group in the exported option guide", () => {
    const optionGuide = cloneDataTableOptionGuide();
    const propsGroup = optionGuide.find((group) => group.title === "Props")!;

    optionGuide.push({ ...propsGroup, items: [...propsGroup.items] });

    expect(getRowExpandOptionGuideContractViolations(optionGuide)).toEqual([
      "Props group must appear exactly once; received 2.",
    ]);
  });

  it("rejects a duplicate Row Expand height option in the exported Props group", () => {
    const optionGuide = cloneDataTableOptionGuide();
    const propsGroup = optionGuide.find((group) => group.title === "Props")!;
    const getRowDetailHeight = propsGroup.items.find((item) => item.name === "getRowDetailHeight")!;

    propsGroup.items.push({ ...getRowDetailHeight });

    expect(getRowExpandOptionGuideContractViolations(optionGuide)).toEqual([
      "getRowDetailHeight must appear exactly once in Props; received 2.",
    ]);
  });

  it("rejects swapped Row Expand height descriptions in the exported Props group", () => {
    const optionGuide = cloneDataTableOptionGuide();
    const propsGroup = optionGuide.find((group) => group.title === "Props")!;
    const getRowDetailHeight = propsGroup.items.find((item) => item.name === "getRowDetailHeight")!;
    const estimatedRowDetailHeight = propsGroup.items.find((item) => item.name === "estimatedRowDetailHeight")!;

    [getRowDetailHeight.description, estimatedRowDetailHeight.description] = [
      estimatedRowDetailHeight.description,
      getRowDetailHeight.description,
    ];

    expect(getRowExpandOptionGuideContractViolations(optionGuide)).toEqual([
      "estimatedRowDetailHeight must retain its measured automatic Detail height description.",
      "getRowDetailHeight must retain its measured automatic Detail height description.",
    ]);
  });

  it("keeps the English Row Expand Playground route aligned with measured automatic Details", () => {
    const routes = readWorkspaceFile("example/src/docs/docsRoutes.tsx");
    const englishRowExpandRoute =
      routes.match(
        /featurePage\(\{\n    body: paragraphs\(\[\n      "The application owns expandedRowIds[\s\S]*?featureId: "row-expand",[\s\S]*?\n  \}\),/u,
      )?.[0] ?? "";

    expect(englishRowExpandRoute).not.toMatch(/\b300px\b/u);
    expect(englishRowExpandRoute).toContain(
      'Only a finite positive height is fixed and retains inline height. Missing, invalid, and "auto" Details use measured automatic height without an inline height. Before matching-width measurement, a valid estimatedRowDetailHeight wins; otherwise the resolved `rowHeight` is the estimate.',
    );
  });

  it("keeps the Korean Row Expand Playground route aligned with measured automatic Details", () => {
    const routes = readWorkspaceFile("example/src/docs/docsRoutes.tsx");
    const koreanRowExpandRoute =
      routes.match(/"\/examples\/row-expand": \{[\s\S]*?\n  \},\n  "\/examples\/selection-clipboard":/u)?.[0] ?? "";

    expect(koreanRowExpandRoute).not.toMatch(/\b300px\b/u);
    expect(koreanRowExpandRoute).toContain(
      "유한한 양수 높이만 fixed이며 inline height를 유지합니다. 값이 없거나 invalid 또는 `auto`인 Detail은 inline height 없이 자동 측정합니다. matching-width 측정 전에는 유효한 finite positive `estimatedRowDetailHeight`를 우선 사용하고, 그 외에는 resolved `rowHeight`를 estimate로 사용합니다.",
    );
  });

  it("documents column drag activation and Virtual List row selection", () => {
    const header = readWorkspaceFile("docs/user/06-header.md");
    const cell = readWorkspaceFile("docs/user/08-cell.md");

    expect(header).toContain("6-pixel");
    expect(header).toContain("source placeholder");
    expect(header).toContain("non-mouse");
    expect(cell).toContain("Ctrl");
    expect(cell).toContain("Shift");
    expect(cell).toContain("More");
    expect(cell).toContain("onClickCell");
    expect(cell).toContain("onClickRow");
  });

  it("documents and demonstrates the opt-in multi-column sort contract", () => {
    const englishHeader = readWorkspaceFile("docs/user/06-header.md");
    const koreanHeader = readWorkspaceFile("docs/ko/06-header.md");
    const playground = readWorkspaceFile("example/src/features/HeaderFeature.tsx");
    const optionGuide = readWorkspaceFile("example/src/docs/dataTableOptionGuide.ts");
    const readme = readWorkspaceFile("README.md");

    for (const document of [englishHeader, koreanHeader, readme]) {
      expect(document).toContain("multiSort");
      expect(document).toContain("onChangeSortModel");
      expect(document).toContain("getSortModel");
      expect(document).toContain("setSortModel");
    }

    expect(playground).toContain('data-testid="header-example-multi-sort"');
    expect(playground).toContain("multiSort");
    expect(playground).toContain("onChangeSortModel={setSortModel}");
    expect(playground).toContain("Shift+Enter/Space");
    expect(optionGuide).toContain("ordered multi-column sort model");
  });

  it("documents the decorative Radix Header icons without implying a public icon API", () => {
    const englishHeader = readWorkspaceFile("docs/user/06-header.md");
    const koreanHeader = readWorkspaceFile("docs/ko/06-header.md");

    for (const document of [englishHeader, koreanHeader]) {
      expect(document).toContain("Radix SVG");
      expect(document).toContain('aria-hidden="true"');
      expect(document).toContain("aria-sort");
      expect(document).not.toContain("module-owned CSS");
      expect(document).not.toContain("Comins가 소유한 CSS");
    }

    expect(englishHeader).toContain("whole Header remains the pointer target");
    expect(englishHeader).toContain("not a dedicated public handle or icon override API");
    expect(koreanHeader).toContain("Header 전체가 pointer target");
    expect(koreanHeader).toContain("전용 public handle 또는 icon override API가 아니다");
  });

  it("records Column Filter as deferred Header guidance without a Filter API", () => {
    const englishHeader = readWorkspaceFile("docs/user/06-header.md");
    const koreanHeader = readWorkspaceFile("docs/ko/06-header.md");

    expect(englishHeader).toContain("Future Column Filter");
    expect(englishHeader).toContain("right edge");
    expect(englishHeader).toContain("not shipped");
    expect(englishHeader).not.toMatch(/filter\??:\s*(true|boolean)/u);
    expect(koreanHeader).toContain("향후 Column Filter");
    expect(koreanHeader).toContain("우측");
    expect(koreanHeader).toContain("제공하지");
  });

  it("links Flat Table Ref methods to the live visible-index example", () => {
    const documents = [
      readWorkspaceFile("docs/user/06-header.md"),
      readWorkspaceFile("docs/user/07-row.md"),
      readWorkspaceFile("docs/user/10-selection.md"),
      readWorkspaceFile("docs/ko/06-header.md"),
      readWorkspaceFile("docs/ko/07-row.md"),
      readWorkspaceFile("docs/ko/10-selection.md"),
    ];

    for (const document of documents) {
      expect(document).toContain("/api/ref");
    }

    const playground = readWorkspaceFile("example/src/features/RefApiFeature.tsx");
    for (const term of [
      "setSelectedRows",
      "setSortModel",
      "clearSort",
      "getColumnLayout",
      "setColumnLayout",
      "setMoveTargetRow",
      "onChangeData",
    ]) {
      expect(playground).toContain(term);
    }
  });

  it("keeps English and Korean Virtual List Search guidance single-selection-only", () => {
    const englishCell = readWorkspaceFile("docs/user/08-cell.md");
    const koreanCell = readWorkspaceFile("docs/ko/08-cell.md");

    expect(englishCell).toContain("Search remains single-selection-only and is available only while exactly one Row is selected.");
    expect(koreanCell).toContain("`searchable: true`인 경우 정확히 하나의 Row가 선택되었을 때만 검색 input을 표시");
    expect(koreanCell).not.toContain("Row/Cell selection 상태에 의존하지 않는다");
  });

  it("documents the Playground locale persistence and route-neutral toggle contract", () => {
    const playgroundDocs = [
      readWorkspaceFile("docs/user/12-playground.md"),
      readWorkspaceFile("docs/ko/12-playground.md"),
    ];

    for (const document of playgroundDocs) {
      expect(document).toContain('"ko"');
      expect(document).toContain('"en"');
      expect(document).toContain("comins-table-playground-locale");
      expect(document).toContain("localStorage");
      expect(document).toContain("<html lang>");
      expect(document).not.toMatch(/\/(?:ko|en)\//u);
    }
  });

  it("keeps Korean and English guidance aligned with the current Playground interaction contract", () => {
    const englishHeader = readWorkspaceFile("docs/user/06-header.md");
    const koreanHeader = readWorkspaceFile("docs/ko/06-header.md");
    const englishRow = readWorkspaceFile("docs/user/07-row.md");
    const koreanRow = readWorkspaceFile("docs/ko/07-row.md");
    const englishCell = readWorkspaceFile("docs/user/08-cell.md");
    const koreanCell = readWorkspaceFile("docs/ko/08-cell.md");
    const englishPlayground = readWorkspaceFile("docs/user/12-playground.md");
    const koreanPlayground = readWorkspaceFile("docs/ko/12-playground.md");
    const englishTree = readWorkspaceFile("docs/user/17-tree-grid.md");
    const koreanTree = readWorkspaceFile("docs/ko/17-tree-grid.md");

    expect(englishHeader).toContain("darker dashed source placeholder");
    expect(englishHeader).toContain("red invalid marker");
    expect(koreanHeader).toContain("더 어두운 점선 source placeholder");
    expect(koreanHeader).toContain("붉은색 invalid marker");
    expect(koreanHeader).not.toContain("단일 toggle control");

    for (const row of [englishRow, koreanRow]) {
      expect(row).toContain("0/1/N");
      expect(row).toContain("View");
      expect(row).toContain("Create");
      expect(row).toContain("Update");
      expect(row).toContain("Delete");
    }

    expect(englishCell).toContain("Row selection background remains visible");
    expect(koreanCell).toContain("Row selection 배경을 유지");

    for (const playground of [englishPlayground, koreanPlayground]) {
      expect(playground).toContain("30 Row");
      expect(playground).toContain("480px");
      expect(playground).toContain("0 Row");
    }
    expect(koreanPlayground).not.toContain("선택 행 삭제, 필터링");
    expect(englishTree).not.toContain("A future Row Expand feature");
    expect(koreanTree).not.toContain("향후 Row Expand는");
  });
});
