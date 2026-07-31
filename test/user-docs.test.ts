import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
      expect(document).toContain('"auto"');
      expect(document).toContain("300");
    }

    expect(playground).toContain('data-testid="row-expand-example-fixed"');
    expect(playground).toContain('data-testid="row-expand-example-auto"');
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
});
