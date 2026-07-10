import { describe, expect, it } from "vitest";

import {
  addCominsRows,
  applyCominsColumnLayout,
  copyCominsCell,
  copyCominsRow,
  createCominsTableState,
  deleteCominsRows,
  formatCominsCellValue,
  getCominsCellValue,
  getCominsHeaderRows,
  getCominsPageRows,
  getCominsVisibleColumns,
  getCominsVirtualRows,
  moveCominsColumn,
  moveCominsColumnGroup,
  moveCominsRow,
  pasteCominsCell,
  pasteCominsRow,
  queryCominsRows,
  replaceCominsRows,
  serializeCominsColumnLayout,
  setCominsColumnHidden,
  setCominsColumnGroupHidden,
  setCominsColumnGroupWidth,
  setCominsHeaderVisible,
  setCominsPagination,
  setCominsColumnWidth,
  setCominsSortState,
  setCominsTableTheme,
  sortCominsRows,
  updateCominsRows,
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
  return createCominsTableState<PersonRow>({
    columns,
    getRowId: (row) => row.id,
    rows,
  });
}

describe("comins-table basic core", () => {
  it("normalizes column ids from fields and reads nested field values", () => {
    const state = createState();

    expect(state.columns[0]?.id).toBe("name");
    expect(state.columns[2]?.id).toBe("profile.score");
    expect(state.columns[0]?.label).toBe("Name");
    expect(getCominsCellValue(state, rows[0], "profile.score")).toBe(8);
  });

  it("treats incoming row arrays as immutable references", () => {
    const inputRows: PersonRow[] = [
      { active: true, age: 31, id: "a", name: "Alpha", profile: { score: 8 } },
      { active: false, age: 42, id: "b", name: "Beta", profile: { score: 4 } },
    ];
    const state = createCominsTableState<PersonRow>({
      columns,
      getRowId: (row) => row.id,
      rows: inputRows,
    });
    const replacementRows: PersonRow[] = [{ active: true, age: 19, id: "z", name: "Zeta" }];

    expect(state.rows).toBe(inputRows);

    const replaced = replaceCominsRows(state, replacementRows);
    expect(replaced.rows).toBe(replacementRows);

    const updated = updateCominsRows(state, [{ id: "a", patch: { name: "Updated Alpha" } }]);
    expect(updated.rows).not.toBe(inputRows);
    expect(inputRows[0]?.name).toBe("Alpha");
    expect(updated.rows[0]?.name).toBe("Updated Alpha");
  });

  it("supports full refresh, partial update, CRUD, query, and theme updates", () => {
    let state = createState();

    state = addCominsRows(state, [{ age: 27, id: "c", name: "Gamma", profile: { score: 9 } }]);
    state = updateCominsRows(state, [{ id: "b", patch: { active: true, age: 43 } }]);
    state = deleteCominsRows(state, ["a"]);
    state = setCominsTableTheme(state, {
      className: "rounded-md border",
      density: "compact",
      style: { color: "rgb(17, 24, 39)" },
    });

    expect(queryCominsRows(state).map((row) => row.id)).toEqual(["b", "c"]);
    expect(queryCominsRows(state, (row) => row.active === true).map((row) => row.id)).toEqual(["b"]);
    expect(state.theme).toMatchObject({ className: "rounded-md border", density: "compact" });

    state = replaceCominsRows(state, [{ age: 19, id: "z", name: "Zeta" }]);

    expect(queryCominsRows(state)).toEqual([{ age: 19, id: "z", name: "Zeta" }]);
  });

  it("persists header visibility, width, and column order", () => {
    let state = createState();

    state = setCominsColumnWidth(state, "age", 144);
    state = setCominsColumnHidden(state, "name", true);
    state = moveCominsColumn(state, "age", 0);
    state = moveCominsRow(state, "b", 0);

    const layout = serializeCominsColumnLayout(state);
    const restored = applyCominsColumnLayout(createState(), layout);

    expect(layout.order).toEqual(["age", "name", "profile.score"]);
    expect(layout).not.toHaveProperty("rowIds");
    expect(layout).not.toHaveProperty("rows");
    expect(restored.columnState.age?.width).toBe(144);
    expect(restored.columnState.name?.hidden).toBe(true);
    expect(restored.columnOrder).toEqual(["age", "name", "profile.score"]);
    expect(queryCominsRows(restored).map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("normalizes 2-depth column groups without changing flat column tables", () => {
    const flatState = createState();
    const groupedState = createCominsTableState<PersonRow>({
      columnGroups: [
        { children: ["name", "age"], id: "profile", label: "Profile" },
        { children: ["missing", "age", "profile.score"], id: "metrics", label: "Metrics" },
      ],
      columns,
      getRowId: (row) => row.id,
      rows,
    });

    expect(flatState.columnGroups).toEqual([]);
    expect(getCominsHeaderRows(flatState)).toEqual([
      [
        expect.objectContaining({ colSpan: 1, columnId: "name", kind: "column", rowSpan: 1 }),
        expect.objectContaining({ colSpan: 1, columnId: "age", kind: "column", rowSpan: 1 }),
        expect.objectContaining({ colSpan: 1, columnId: "profile.score", kind: "column", rowSpan: 1 }),
      ],
    ]);
    expect(groupedState.columnGroups).toEqual([
      { children: ["name", "age"], id: "profile", label: "Profile" },
      { children: ["profile.score"], id: "metrics", label: "Metrics" },
    ]);
    expect(getCominsHeaderRows(groupedState)).toEqual([
      [
        expect.objectContaining({ colSpan: 2, groupId: "profile", kind: "group", rowSpan: 1 }),
        expect.objectContaining({ colSpan: 1, groupId: "metrics", kind: "group", rowSpan: 1 }),
      ],
      [
        expect.objectContaining({ colSpan: 1, columnId: "name", groupId: "profile", kind: "column", rowSpan: 1 }),
        expect.objectContaining({ colSpan: 1, columnId: "age", groupId: "profile", kind: "column", rowSpan: 1 }),
        expect.objectContaining({
          colSpan: 1,
          columnId: "profile.score",
          groupId: "metrics",
          kind: "column",
          rowSpan: 1,
        }),
      ],
    ]);
  });

  it("persists parent group visibility separately from child column visibility", () => {
    const createGroupedState = () => createCominsTableState<PersonRow>({
      columnGroups: [{ children: ["name", "age"], id: "profile", label: "Profile" }],
      columns,
      getRowId: (row) => row.id,
      rows,
    });
    let state = createGroupedState();

    state = setCominsColumnHidden(state, "age", true);
    state = setCominsColumnGroupHidden(state, "profile", true);

    expect(getCominsVisibleColumns(state).map((column) => column.id)).toEqual(["profile.score"]);

    const layout = serializeCominsColumnLayout(state);
    const restored = applyCominsColumnLayout(createGroupedState(), layout);
    const shown = setCominsColumnGroupHidden(restored, "profile", false);

    expect(layout.groups?.profile?.hidden).toBe(true);
    expect(restored.columnState.age?.hidden).toBe(true);
    expect(shown.columnState.age?.hidden).toBe(true);
    expect(getCominsVisibleColumns(shown).map((column) => column.id)).toEqual(["name", "profile.score"]);
  });

  it("resizes parent groups while preserving child width ratios and respecting min/max constraints", () => {
    let state = createCominsTableState<PersonRow>({
      columnGroups: [{ children: ["name", "age", "profile.score"], id: "profile", label: "Profile" }],
      columns: [
        { field: "name", label: "Name", minWidth: 80, width: 100 },
        { field: "age", label: "Age", maxWidth: 260, width: 200 },
        { field: "profile.score", label: "Score", width: 100 },
      ],
      getRowId: (row) => row.id,
      rows,
    });

    state = setCominsColumnGroupWidth(state, "profile", 600);

    expect(state.columnState.name?.width).toBeCloseTo(170, 5);
    expect(state.columnState.age?.width).toBe(260);
    expect(state.columnState["profile.score"]?.width).toBeCloseTo(170, 5);

    state = setCominsColumnGroupWidth(state, "profile", 180);

    expect(state.columnState.name?.width).toBe(80);
    expect(state.columnState.age?.width).toBe(50);
    expect(state.columnState["profile.score"]?.width).toBe(50);
  });

  it("moves parent groups as a block and prevents child columns from leaving their group", () => {
    let state = createCominsTableState<PersonRow>({
      columnGroups: [{ children: ["name", "age"], id: "profile", label: "Profile" }],
      columns: [
        { field: "name", label: "Name" },
        { field: "age", label: "Age" },
        { field: "profile.score", label: "Score" },
      ],
      getRowId: (row) => row.id,
      rows,
    });

    state = moveCominsColumnGroup(state, "profile", 1);
    expect(state.columnOrder).toEqual(["profile.score", "name", "age"]);

    expect(moveCominsColumn(state, "age", 0).columnOrder).toEqual(["profile.score", "name", "age"]);
    expect(moveCominsColumn(state, "age", 1).columnOrder).toEqual(["profile.score", "age", "name"]);
  });

  it("moves multiple parent groups without splitting children", () => {
    let state = createCominsTableState<PersonRow>({
      columnGroups: [
        { children: ["name", "age"], id: "profile", label: "Profile" },
        { children: ["active", "locked"], id: "status", label: "Status" },
      ],
      columns: [
        { field: "name", label: "Name" },
        { field: "age", label: "Age" },
        { field: "active", label: "Active" },
        { field: "locked", label: "Locked" },
        { field: "profile.score", label: "Score" },
      ],
      getRowId: (row) => row.id,
      rows,
    });

    state = moveCominsColumnGroup(state, "profile", 2);
    expect(state.columnOrder).toEqual(["active", "locked", "name", "age", "profile.score"]);

    state = moveCominsColumnGroup(state, "profile", 5);
    expect(state.columnOrder).toEqual(["active", "locked", "profile.score", "name", "age"]);
  });

  it("supports pagination and virtual row windows for 100000 rows", () => {
    const largeRows = Array.from({ length: 100_000 }, (_, index) => ({
      age: index,
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    const state = createCominsTableState<PersonRow>({
      columns,
      getRowId: (row) => row.id,
      pagination: { pageIndex: 2, pageSize: 25 },
      rows: largeRows,
    });

    const pageRows = getCominsPageRows(state);
    const virtualRows = getCominsVirtualRows(state, {
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

    state = setCominsHeaderVisible(state, false);
    state = setCominsPagination(state, { pageIndex: 1, pageSize: 1 });

    expect(state.showHeader).toBe(false);
    expect(getCominsPageRows(state)).toEqual([
      { active: false, age: 42, id: "b", name: "Beta", profile: { score: 4 } },
    ]);
  });

  it("supports row reorder, row copy-paste, and cell copy-paste", () => {
    let state = addCominsRows(createState(), [{ age: 27, id: "c", name: "Gamma", profile: { score: 9 } }]);

    state = moveCominsRow(state, "c", 0);
    expect(queryCominsRows(state).map((row) => row.id)).toEqual(["c", "a", "b"]);

    const copiedRow = copyCominsRow(state, "a");
    state = pasteCominsRow(state, copiedRow, {
      getNewRowId: (row) => `${row.id}-copy`,
      mode: "append",
    });

    expect(queryCominsRows(state).at(-1)).toEqual({
      active: true,
      age: 31,
      id: "a-copy",
      name: "Alpha",
      profile: { score: 8 },
    });

    const copiedCell = copyCominsCell(state, { columnId: "name", rowId: "b" });
    state = pasteCominsCell(state, { columnId: "name", rowId: "c" }, copiedCell);

    expect(queryCominsRows(state)[0]?.name).toBe("Beta");
    expect(copiedCell.text).toBe("Beta");

    const replaceRow = copyCominsRow(state, "a-copy");
    state = pasteCominsRow(state, replaceRow, { mode: "replace", targetRowId: "b" });

    expect(queryCominsRows(state).find((row) => row.id === "b")).toEqual({
      active: true,
      age: 31,
      id: "b",
      name: "Alpha",
      profile: { score: 8 },
    });
  });

  it("formats cells and sorts rows by a single column", () => {
    let state = createState();

    expect(formatCominsCellValue(state, rows[0], "a", state.columns[1]!)).toBe("31 years");

    state = setCominsSortState(state, { columnId: "age", direction: "desc" });
    expect(getCominsPageRows(state).map((row) => row.name)).toEqual(["Beta", "Alpha"]);

    const sorted = sortCominsRows(createState(), { columnId: "age", direction: "asc" });
    expect(sorted.rows.map((row) => row.name)).toEqual(["Alpha", "Beta"]);
  });

  it("formats repeated row object payloads with the row id index", () => {
    const sharedRow: PersonRow = { active: true, age: 10, id: "shared", name: "Shared" };
    const repeatedRows = Array.from({ length: 3 }, () => sharedRow);
    const state = createCominsTableState<PersonRow>({
      columns: [
        {
          cell: {
            format: ({ row }) => `data:${row.dataIndex} visible:${row.index}`,
          },
          field: "name",
          label: "Name",
        },
      ],
      getRowId: (_row, index) => index,
      rows: repeatedRows,
    });

    expect(formatCominsCellValue(state, repeatedRows[2]!, 2, state.columns[0]!)).toBe("data:2 visible:2");
  });
});
