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
];

const implementedTerms = [
  "KmsfDataTable",
  "data",
  "onChangeData",
  "onChangeSelection",
  "onChangeColumnLayout",
  "onChangeSort",
  "onClickCell",
  "onClickRow",
  "createKmsfDataTableState",
  "addKmsfRows",
  "updateKmsfRows",
  "deleteKmsfRows",
  "queryKmsfRows",
  "setKmsfPagination",
  "serializeKmsfColumnLayout",
  "applyKmsfColumnLayout",
  "selectRow",
  "selectCell",
  "selectCellRange",
  "getKmsfSelectedCellRange",
  "copyKmsfRow",
  "copyKmsfCell",
  "copyKmsfCellRange",
  "pasteKmsfRow",
  "pasteKmsfCell",
  "pasteKmsfCellRange",
  "fillKmsfCellRange",
  "props.copyable",
  "props.pasteable",
  "virtualized",
  "setSelectedRow",
  "setSelectedRows",
];

function readWorkspaceFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("@kmsf/data-table user documentation contract", () => {
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

    expect(readme).toContain("npm --workspace=@kmsf/data-table run dev");
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
});
