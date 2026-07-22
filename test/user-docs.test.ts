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
];

const implementedTerms = [
  "CominsTable",
  "data",
  "onChangeData",
  "onChangeSelection",
  "onChangeColumnLayout",
  "onChangeSort",
  "onClickCell",
  "onClickRow",
  "createCominsTableState",
  "addCominsRows",
  "updateCominsRows",
  "deleteCominsRows",
  "queryCominsRows",
  "setCominsPagination",
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
  "summary",
  "tree",
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
    const merged = userDocs.map((doc) => readWorkspaceFile(join("docs/user", doc))).join("\n");

    for (const term of implementedTerms) {
      expect(merged, `${term} should be documented`).toContain(term);
    }
  });

  it("keeps README aligned with the shipped playground and user docs", () => {
    const readme = readWorkspaceFile("README.md");

    expect(readme).toContain("npm run dev");
    expect(readme).toContain("docs/user/01-quick-start.md");
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
    expect(readme).toContain("drag UX remains outside the first public release");

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
});
