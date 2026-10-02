import { describe, expect, it } from "vitest";
import { createCominsTableState, fillCominsCellRange, parseCominsClipboardText, pasteCominsText } from "../src";

const address = (rowId: number, columnId = "a") => ({ rowId, columnId });
const range = (a: number, b: number, first = "a", last = first) => ({ anchor: address(a, first), focus: address(b, last) });
const state = () => createCominsTableState({
  rows: Array.from({ length: 8 }, (_, id) => ({ id, a: String(id), b: id, locked: "unchanged", nested: { value: "old" } })),
  getRowId: row => row.id,
  columns: [
    { field: "a", label: "a" },
    { field: "b", label: "b", cell: { parseClipboard: ({ text }) => { if (!/^\d+$/.test(text)) throw new Error("Invalid number"); return Number(text); } } },
    { field: "locked", label: "locked", cell: { props: { pasteable: false } } },
    { field: "nested.value", label: "nested.value" },
  ],
});

describe("external clipboard text", () => {
  it.each([
    ["a\tb\r\nc\td\r\n", [["a", "b"], ["c", "d"]]],
    ['"a\tb"\t"line\nnext"\t"a""b"', [["a\tb", "line\nnext", 'a"b']]],
    ["a\t\n\t", [["a", ""], ["", ""]]],
    ["", [[""]]],
    ["\n", [[""]]],
    ["=1+1\t<img src=x>", [["=1+1", "<img src=x>"]]],
  ])("parses TSV %j", (text, expected) => expect(parseCominsClipboardText(text as string)).toEqual(expected));
  it("rejects malformed and oversized input before applying any data", () => {
    for (const text of ['"unfinished', '"closed"junk', "a".repeat(1000001), "\t".repeat(100000)]) {
      expect(() => parseCominsClipboardText(text)).toThrow();
    }
  });
  it("uses explicit visible order, typed parsers, nested fields and stable guarded positions", () => {
    const current = state();
    const next = pasteCominsText(current, address(6), "first\t30\tx\tnested\nsecond\t40\ty\tend", [6, 2]);
    expect(next.rows[6]).toEqual({ id: 6, a: "first", b: 30, locked: "unchanged", nested: { value: "nested" } });
    expect(next.rows[2]?.a).toBe("second");
    expect(next.rows[0]).toBe(current.rows[0]);
    expect(current.rows[6]?.a).toBe("6");
  });
  it("aborts the whole batch when a later parser fails", () => {
    const current = state();
    expect(() => pasteCominsText(current, address(0), "new\t100\nother\tbad")).toThrow("Invalid number");
    expect(current.rows[0]?.a).toBe("0");
    expect(current.rows[0]?.b).toBe(0);
  });
  it("clips dataset edges and preserves cells missing from ragged records", () => {
    const next = pasteCominsText(state(), address(6), "x\t10\ny\nz\t20");
    expect(next.rows[6]?.b).toBe(10); expect(next.rows[7]?.b).toBe(7); expect(next.rows).toHaveLength(8);
  });
});

describe("pattern fill", () => {
  it("rejects the entire fill when a destination validator returns false", () => {
    const current = state();
    current.columns[1]!.cell = { validateFill: ({ value }) => typeof value === "number" };
    expect(() => fillCominsCellRange(current, { source: address(0), target: range(1, 2, "a", "b") })).toThrow(/Fill/);
    expect(current.rows[1]).toMatchObject({ a: "1", b: 1 });
    expect(current.rows[2]).toMatchObject({ a: "2", b: 2 });
  });
  it("validates typed candidates against original destination Rows before publishing", () => {
    const current = state();
    const checked: unknown[] = [];
    current.columns[1]!.cell = {
      parseClipboard: () => { throw new Error("Fill must not parse text"); },
      validateFill: ({ row, value, column }) => {
        checked.push([row.id, row.dataIndex, row.data.b, column.id, value]);
        if (row.id === 2) throw new Error("Cannot change row 2");
      },
    };
    expect(() => fillCominsCellRange(current, { source: address(0, "b"), target: range(0, 2, "b") })).toThrow("Cannot change row 2");
    expect(checked).toEqual([[1, 1, 1, "b", 0], [2, 2, 2, "b", 0]]);
    expect(current.rows[1]?.b).toBe(1);
  });
  it("does not validate protected or unchanged destinations", () => {
    const current = state();
    current.columns[0]!.cell = { validateFill: () => { throw new Error("unchanged"); } };
    current.columns[2]!.cell = { props: { pasteable: false }, validateFill: () => { throw new Error("protected"); } };
    expect(fillCominsCellRange(current, { source: address(0), target: range(0, 0) })).toBe(current);
    expect(fillCominsCellRange(current, { source: address(0), target: range(0, 0, "locked") })).toBe(current);
  });
  it("repeats a rectangular source in visible order without automatic series", () => {
    const current = state();
    const next = fillCominsCellRange(current, { source: range(4, 1, "a", "b"), target: range(4, 5, "a", "b") }, [4, 1, 7, 2, 6, 5]);
    expect([4, 1, 7, 2, 6, 5].map(id => next.rows[id]?.b)).toEqual([4, 1, 4, 1, 4, 1]);
    expect(next.rows[0]).toBe(current.rows[0]);
  });
  it("aligns upward repetition to the original source", () => {
    const next = fillCominsCellRange(state(), { source: range(4, 5), target: range(1, 5) });
    expect(next.rows.slice(1, 6).map(row => row.a)).toEqual(["5", "4", "5", "4", "5"]);
  });
  it("keeps legacy single-cell fill, guarded destinations, and no-op row references", () => {
    const current = state();
    expect(fillCominsCellRange(current, { source: address(0), target: range(0, 0) })).toBe(current);
    const next = fillCominsCellRange(current, { source: address(0), target: range(1, 3, "a", "locked") });
    expect(next.rows[2]?.a).toBe("0"); expect(next.rows[2]?.locked).toBe("unchanged");
  });
  it("does not copy protected source values", () => {
    const current = state(); current.columns[0]!.cell = { props: { copyable: false } };
    expect(fillCominsCellRange(current, { source: address(0), target: range(1, 3) })).toBe(current);
  });
});
