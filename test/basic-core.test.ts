import { describe, expect, it } from "vitest";

import {
  addKmsfRows,
  applyKmsfColumnLayout,
  copyKmsfCell,
  copyKmsfRow,
  createKmsfDataTableState,
  deleteKmsfRows,
  formatKmsfCellValue,
  getKmsfCellValue,
  getKmsfPageRows,
  getKmsfVirtualRows,
  moveKmsfColumn,
  moveKmsfRow,
  pasteKmsfCell,
  pasteKmsfRow,
  queryKmsfRows,
  replaceKmsfRows,
  serializeKmsfColumnLayout,
  setKmsfColumnHidden,
  setKmsfHeaderVisible,
  setKmsfPagination,
  setKmsfColumnWidth,
  setKmsfSortState,
  setKmsfTableTheme,
  sortKmsfRows,
  updateKmsfRows,
} from "../src";

type PersonRow = {
  active?: boolean;
  age: number;
  id: string;
  name: string;
  profile?: {
    score: number;
  };
};

const columns = [
  { field: "name", label: "Name", sort: true },
  {
    cell: {
      format: ({ value }: { value: unknown }) => `${String(value)} years`,
    },
    field: "age",
    label: "Age",
    sort: true,
  },
  { field: "profile.score", label: "Score" },
] as const;

const rows: PersonRow[] = [
  { active: true, age: 31, id: "a", name: "Alpha", profile: { score: 8 } },
  { active: false, age: 42, id: "b", name: "Beta", profile: { score: 4 } },
];

function createState() {
  return createKmsfDataTableState<PersonRow>({
    columns,
    getRowId: (row) => row.id,
    rows,
  });
}

describe("@kmsf/data-table basic core", () => {
  it("normalizes column ids from fields and reads nested field values", () => {
    const state = createState();

    expect(state.columns[0]?.id).toBe("name");
    expect(state.columns[2]?.id).toBe("profile.score");
    expect(state.columns[0]?.label).toBe("Name");
    expect(getKmsfCellValue(state, rows[0], "profile.score")).toBe(8);
  });

  it("supports full refresh, partial update, CRUD, query, and theme updates", () => {
    let state = createState();

    state = addKmsfRows(state, [{ age: 27, id: "c", name: "Gamma", profile: { score: 9 } }]);
    state = updateKmsfRows(state, [{ id: "b", patch: { active: true, age: 43 } }]);
    state = deleteKmsfRows(state, ["a"]);
    state = setKmsfTableTheme(state, {
      className: "rounded-md border",
      density: "compact",
      style: { color: "rgb(17, 24, 39)" },
    });

    expect(queryKmsfRows(state).map((row) => row.id)).toEqual(["b", "c"]);
    expect(queryKmsfRows(state, (row) => row.active === true).map((row) => row.id)).toEqual(["b"]);
    expect(state.theme).toMatchObject({ className: "rounded-md border", density: "compact" });

    state = replaceKmsfRows(state, [{ age: 19, id: "z", name: "Zeta" }]);

    expect(queryKmsfRows(state)).toEqual([{ age: 19, id: "z", name: "Zeta" }]);
  });

  it("persists header visibility, width, and column order", () => {
    let state = createState();

    state = setKmsfColumnWidth(state, "age", 144);
    state = setKmsfColumnHidden(state, "name", true);
    state = moveKmsfColumn(state, "age", 0);
    state = moveKmsfRow(state, "b", 0);

    const layout = serializeKmsfColumnLayout(state);
    const restored = applyKmsfColumnLayout(createState(), layout);

    expect(layout.order).toEqual(["age", "name", "profile.score"]);
    expect(layout).not.toHaveProperty("rowIds");
    expect(layout).not.toHaveProperty("rows");
    expect(restored.columnState.age?.width).toBe(144);
    expect(restored.columnState.name?.hidden).toBe(true);
    expect(restored.columnOrder).toEqual(["age", "name", "profile.score"]);
    expect(queryKmsfRows(restored).map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("supports pagination and virtual row windows for 100000 rows", () => {
    const largeRows = Array.from({ length: 100_000 }, (_, index) => ({
      age: index,
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    const state = createKmsfDataTableState<PersonRow>({
      columns,
      getRowId: (row) => row.id,
      pagination: { pageIndex: 2, pageSize: 25 },
      rows: largeRows,
    });

    const pageRows = getKmsfPageRows(state);
    const virtualRows = getKmsfVirtualRows(state, {
      overscan: 2,
      rowHeight: 20,
      scrollTop: 2_000,
      viewportHeight: 100,
    });

    expect(pageRows.map((row) => row.id).slice(0, 3)).toEqual(["row-50", "row-51", "row-52"]);
    expect(virtualRows.startIndex).toBe(98);
    expect(virtualRows.endIndex).toBe(107);
    expect(virtualRows.rows.map((row) => row.id).slice(0, 2)).toEqual(["row-98", "row-99"]);
    expect(virtualRows.totalHeight).toBe(2_000_000);
  });

  it("updates header visibility and pagination in the table store", () => {
    let state = createState();

    state = setKmsfHeaderVisible(state, false);
    state = setKmsfPagination(state, { pageIndex: 1, pageSize: 1 });

    expect(state.showHeader).toBe(false);
    expect(getKmsfPageRows(state)).toEqual([
      { active: false, age: 42, id: "b", name: "Beta", profile: { score: 4 } },
    ]);
  });

  it("supports row reorder, row copy-paste, and cell copy-paste", () => {
    let state = addKmsfRows(createState(), [{ age: 27, id: "c", name: "Gamma", profile: { score: 9 } }]);

    state = moveKmsfRow(state, "c", 0);
    expect(queryKmsfRows(state).map((row) => row.id)).toEqual(["c", "a", "b"]);

    const copiedRow = copyKmsfRow(state, "a");
    state = pasteKmsfRow(state, copiedRow, {
      getNewRowId: (row) => `${row.id}-copy`,
      mode: "append",
    });

    expect(queryKmsfRows(state).at(-1)).toEqual({
      active: true,
      age: 31,
      id: "a-copy",
      name: "Alpha",
      profile: { score: 8 },
    });

    const copiedCell = copyKmsfCell(state, { columnId: "name", rowId: "b" });
    state = pasteKmsfCell(state, { columnId: "name", rowId: "c" }, copiedCell);

    expect(queryKmsfRows(state)[0]?.name).toBe("Beta");
    expect(copiedCell.text).toBe("Beta");

    const replaceRow = copyKmsfRow(state, "a-copy");
    state = pasteKmsfRow(state, replaceRow, { mode: "replace", targetRowId: "b" });

    expect(queryKmsfRows(state).find((row) => row.id === "b")).toEqual({
      active: true,
      age: 31,
      id: "b",
      name: "Alpha",
      profile: { score: 8 },
    });
  });

  it("formats cells and sorts rows by a single column", () => {
    let state = createState();

    expect(formatKmsfCellValue(state, rows[0], "a", state.columns[1]!)).toBe("31 years");

    state = setKmsfSortState(state, { columnId: "age", direction: "desc" });
    expect(getKmsfPageRows(state).map((row) => row.name)).toEqual(["Beta", "Alpha"]);

    const sorted = sortKmsfRows(createState(), { columnId: "age", direction: "asc" });
    expect(sorted.rows.map((row) => row.name)).toEqual(["Alpha", "Beta"]);
  });
});
