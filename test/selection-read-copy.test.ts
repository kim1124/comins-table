import { describe, expect, it } from "vitest";
import { createCominsTableState, selectCell, selectCellRange, selectRows } from "../src/core";
import { copySelectionData, selectedCellValues, selectedRowData } from "../src/selection-data";

const rows = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `row ${i}`, value: i, secret: "private" }));
const create = () => selectRows(createCominsTableState({ rows, getRowId: row => row.id, columns: [
  { label: "name", field: "name" }, { label: "value", field: "value" }, { label: "secret", field: "secret", cell: { props: { copyable: false } } },
] }), rows.map(row => row.id));

describe("independent selection reads and copy", () => {
  it("copies three cells ahead of five selected rows without changing either selection", () => {
    const state = selectCellRange(create(), { anchor: { rowId: "0", columnId: "name" }, focus: { rowId: "2", columnId: "name" } });
    expect(selectedRowData(state)).toEqual(rows);
    expect(selectedCellValues(state)).toHaveLength(3);
    expect(copySelectionData(state)?.text).toBe("row 0\nrow 1\nrow 2");
    expect(state.selection.rowIds).toHaveLength(5);
  });
  it("prefers selected rows over one cell, with an explicit cells override", () => {
    const state = selectCell(create(), { rowId: "0", columnId: "value" });
    expect(copySelectionData(state)?.target).toBe("rows");
    expect(copySelectionData(state)?.text).toBe(rows.map(row => `${row.name}\t${row.value}\t`).join("\n"));
    expect(copySelectionData(state, "cells")?.text).toBe("0");
  });
  it("preserves holes between discontiguous cells without copying unselected values", () => {
    let state = selectCell(create(), { rowId: "0", columnId: "name" });
    state = selectCell(state, { rowId: "2", columnId: "value" }, { multi: true });
    expect(copySelectionData(state)?.text).toBe("row 0\t\n\t\n\t2");
    expect(copySelectionData(state)?.data.rows[1]).toEqual([null, null]);
  });
  it("reads only loaded rows and honors explicit visual ordering", () => {
    const state = selectCellRange(create(), { anchor: { rowId: "2", columnId: "name" }, focus: { rowId: "0", columnId: "name" } });
    expect(copySelectionData(state, "cells", ["2", "1", "0"])?.text).toBe("row 2\nrow 1\nrow 0");
    expect(selectedRowData({ ...state, selection: { ...state.selection, rowIds: ["missing", "0"] } })).toEqual([rows[0]]);
  });
  it("quotes TSV delimiters and neutralizes string formulas while retaining raw values", () => {
    const state = selectCell(createCominsTableState({ rows: [{ id: "x", value: '=HYPERLINK("x")\nnext' }], getRowId: row => row.id, columns: [{ label: "value", field: "value" }] }), { rowId: "x", columnId: "value" });
    const result = copySelectionData(state)!;
    expect(result.text).toBe('"\'=HYPERLINK(""x"")\nnext"');
    expect(result.data.rows[0]![0]!.value).toBe('=HYPERLINK("x")\nnext');
  });
});
