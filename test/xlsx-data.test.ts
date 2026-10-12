import { describe, expect, it } from "vitest";
import { mapCominsXlsxImportRows, normalizeCominsXlsxCell, prepareCominsXlsxExport } from "../src/core/editing/xlsx-data";

describe("XLSX neutral data contracts", () => {
  it("preserves normal types and falsey cached formula results", () => {
    expect(normalizeCominsXlsxCell({ kind: "number", value: 0, formula: true, cachePresent: true })).toBe(0);
    expect(normalizeCominsXlsxCell({ kind: "boolean", value: false, formula: true, cachePresent: true })).toBe(false);
    expect(normalizeCominsXlsxCell({ kind: "text", value: "", formula: true, cachePresent: true })).toBe("");
    expect(normalizeCominsXlsxCell({ kind: "text", value: "00123", formula: false })).toBe("00123");
    expect(normalizeCominsXlsxCell({ kind: "blank", formula: false })).toBeNull();
    expect(normalizeCominsXlsxCell({ kind: "date", dateText: "2026-10-12", formula: true, cachePresent: true })).toBe("2026-10-12");
  });
  it("rejects missing caches and errors instead of fabricating values", () => {
    expect(() => normalizeCominsXlsxCell({ kind: "number", value: 0, formula: true, cachePresent: false })).toThrow(expect.objectContaining({ code: "MISSING_FORMULA_RESULT" }));
    expect(() => normalizeCominsXlsxCell({ kind: "error", formula: false })).toThrow(expect.objectContaining({ code: "CELL_ERROR" }));
    expect(() => normalizeCominsXlsxCell({ kind: "number", value: Infinity, formula: false })).toThrow(expect.objectContaining({ code: "UNSUPPORTED_VALUE" }));
  });
  it("keeps original cell values out of validation error locations", () => {
    try { normalizeCominsXlsxCell({ kind: "text", value: "private", formula: true, cachePresent: false, cellAddress: "A2", rowNumber: 2 }); }
    catch (error) { expect(error).toHaveProperty("location", { cellAddress: "A2", rowNumber: 2 }); return; }
    throw new Error("Expected validation error");
  });
  it("preserves source/order/header and raw/formatted semantics", () => {
    const row = Object.freeze({ n: 2500, text: "=SUM(1,2)" });
    const columns = [{ id: "text", label: "Text", value: (r: typeof row) => r.text }, { id: "n", value: (r: typeof row) => r.n, format: () => "2,500" }];
    expect(prepareCominsXlsxExport({ rows: [row], columns, columnOrder: ["n", "text"], headerOverrides: { n: "Number" } })).toEqual({ headers: ["Number", "Text"], rows: [[2500, "=SUM(1,2)"]] });
    expect(prepareCominsXlsxExport({ rows: [row], columns, valueSource: "formatted" }).rows).toEqual([["=SUM(1,2)", "2,500"]]);
    expect(row).toEqual({ n: 2500, text: "=SUM(1,2)" });
  });
  it("copies Date into UTC fields without modifying it", () => {
    const date = new Date("2026-10-12T00:01:02.345Z"); const before = date.getTime();
    const result = prepareCominsXlsxExport({ rows: [date], columns: [{ value: d => d }] });
    expect(result.rows).toEqual([[{ kind: "date", utc: [2026, 10, 12, 0, 1, 2, 345] }]]);
    expect(date.getTime()).toBe(before);
  });
  it("rejects metadata even through structurally compatible variables", () => {
    const prepared = { rows: [1], columns: [{ value: (r: number) => r }], metadata: { __rowId: () => "a" } };
    // @ts-expect-error XLSX rejects structure metadata at type and runtime boundaries.
    expect(() => prepareCominsXlsxExport(prepared)).toThrow(expect.objectContaining({ code: "INVALID_OPTIONS" }));
  });
  it("checks cells, text length and unsupported values without truncating", () => {
    const columns = [{ value: (r: unknown) => r }];
    expect(prepareCominsXlsxExport({ rows: [null, undefined, ""], columns, maxCells: 4 }).rows).toEqual([[null], [null], [""]]);
    expect(() => prepareCominsXlsxExport({ rows: [1, 2], columns, maxCells: 2 })).toThrow(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
    expect(() => prepareCominsXlsxExport({ rows: ["😀".repeat(16384)], columns })).toThrow(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
    for (const value of [1n, {}, [], NaN, new Date(NaN)]) expect(() => prepareCominsXlsxExport({ rows: [value], columns })).toThrow(expect.objectContaining({ code: "UNSUPPORTED_VALUE" }));
    expect(() => prepareCominsXlsxExport({ rows: [], columns: [] })).toThrow(expect.objectContaining({ code: "INVALID_OPTIONS" }));
    expect(() => prepareCominsXlsxExport({ rows: [], columns, maxCells: 0 })).toThrow(expect.objectContaining({ code: "INVALID_OPTIONS" }));
  });
  it("maps readonly validated rows and propagates application errors", () => {
    const rows = [{ cells: Object.freeze(["001", 0, false, null]), headers: Object.freeze(["id", "n", "active", "date"]), rowIndex: 0, sheetRowNumber: 2 }];
    expect(mapCominsXlsxImportRows(rows, r => ({ id: r.cells[0], n: r.cells[1], active: r.cells[2], row: r.sheetRowNumber }))).toEqual([{ id: "001", n: 0, active: false, row: 2 }]);
    const error = new Error("application mapping failed");
    expect(() => mapCominsXlsxImportRows(rows, () => { throw error; })).toThrow(error);
    expect(() => prepareCominsXlsxExport({ rows: [1], columns: [{ value: () => { throw error; } }] })).toThrow(error);
  });
});
