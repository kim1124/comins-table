import { describe, expect, it } from "vitest";
import * as core from "../src/core";

const cells = (row: { cells: readonly string[] }) => [...row.cells];

describe("CSV Import", () => {
  it("maps ordinary rows with headers and zero-based data indexes without inferring values", () => {
    const rows = core.importCominsRowsFromCsv({
      text: "id,name,score\r\n001,한글,12\r\n002, Other ,0\r\n",
      mapRow: ({ cells, headers, rowIndex }) => ({ id: cells[0], name: cells[1], score: Number(cells[2]), headers, rowIndex }),
    });
    expect(rows).toEqual([
      { id: "001", name: "한글", score: 12, headers: ["id", "name", "score"], rowIndex: 0 },
      { id: "002", name: " Other ", score: 0, headers: ["id", "name", "score"], rowIndex: 1 },
    ]);
  });

  it("preserves escaped quotes, commas, embedded newlines and trailing empty fields", () => {
    expect(core.importCominsRowsFromCsv({
      text: 'name,note,extra\n"a,b","one\r\ntwo ""quoted""",\nplain,"",', mapRow: cells,
    })).toEqual([["a,b", 'one\r\ntwo "quoted"', ""], ["plain", "", ""]]);
  });

  it.each(["\n", "\r", "\r\n"])("accepts %j record endings without adding a terminal row", ending => {
    expect(core.importCominsRowsFromCsv({ text: `a,b${ending}x,y${ending}`, mapRow: cells })).toEqual([["x", "y"]]);
  });

  it("strips only the leading BOM and supports headerless files", () => {
    expect(core.importCominsRowsFromCsv({
      text: '\uFEFF"001",\uFEFFvalue\n002,other', hasHeader: false,
      mapRow: ({ cells, headers, rowIndex }) => ({ cells, headers, rowIndex }),
    })).toEqual([
      { cells: ["001", "\uFEFFvalue"], headers: null, rowIndex: 0 },
      { cells: ["002", "other"], headers: null, rowIndex: 1 },
    ]);
  });

  it.each(["", "\uFEFF", "id,name", "id,name\n"])("returns no data for empty or header-only input %j", text => {
    expect(core.importCominsRowsFromCsv({ text, mapRow: cells })).toEqual([]);
  });

  it("preserves actual blank records and explicit empty quoted cells", () => {
    expect(core.importCominsRowsFromCsv({ text: 'name\n\n""\n', mapRow: cells })).toEqual([[""], [""]]);
    expect(core.importCominsRowsFromCsv({ text: '""', hasHeader: false, mapRow: cells })).toEqual([[""]]);
  });

  it.each(['name\nok\n"unclosed', 'name\nok\n"closed"suffix', 'name\nok\nun"quoted', 'a,b\n1,2\n3', 'a\n1\n2,3'])(
    "rejects malformed input before invoking application mapping: %j", text => {
      const mapped: string[][] = [];
      expect(() => core.importCominsRowsFromCsv({ text, mapRow: row => { mapped.push([...row.cells]); return row.cells; } })).toThrow(SyntaxError);
      expect(mapped).toEqual([]);
    },
  );

  it("bounds text and cell counts before application mapping, including header cells", () => {
    const mapped: string[][] = [];
    const mapRow = (row: { cells: readonly string[] }) => { mapped.push([...row.cells]); return row.cells; };
    expect(() => core.importCominsRowsFromCsv({ text: "h\n12", maxCharacters: 3, mapRow })).toThrow(RangeError);
    expect(() => core.importCominsRowsFromCsv({ text: "a,b\n1,2", maxCells: 3, mapRow })).toThrow(RangeError);
    expect(mapped).toEqual([]);
    expect(core.importCominsRowsFromCsv({ text: "a,b\n1,2", maxCells: 4, maxCharacters: 7, mapRow: cells })).toEqual([["1", "2"]]);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid limits %j even for empty input", limit => {
    expect(() => core.importCominsRowsFromCsv({ text: "", maxCharacters: limit, mapRow: cells })).toThrow(RangeError);
    expect(() => core.importCominsRowsFromCsv({ text: "", maxCells: limit, mapRow: cells })).toThrow(RangeError);
  });

  it("enforces default bounds when the caller omits limits", () => {
    expect(() => core.importCominsRowsFromCsv({ text: "a".repeat(1_000_001), mapRow: cells })).toThrow(RangeError);
    expect(() => core.importCominsRowsFromCsv({ text: ",".repeat(100_000), hasHeader: false, mapRow: cells })).toThrow(RangeError);
  });

  it("treats dangerous-looking headers and formula text as data rather than property writes or code", () => {
    expect(core.importCominsRowsFromCsv({
      text: '__proto__,constructor,constructor\n=1+1,<b>x</b>,001',
      mapRow: ({ headers, cells }) => ({ headers, cells }),
    })).toEqual([{ headers: ["__proto__", "constructor", "constructor"], cells: ["=1+1", "<b>x</b>", "001"] }]);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("propagates application mapping errors without returning a partial result", () => {
    const failure = new Error("Invalid score");
    expect(() => core.importCominsRowsFromCsv({ text: "score\n1\nbad", mapRow: ({ cells }) => {
      const score = Number(cells[0]);
      if (!Number.isFinite(score)) throw failure;
      return { score };
    } })).toThrow(failure);
  });

  it("round trips raw values through the existing CSV exporter", () => {
    const text = core.exportCominsRowsToCsv({
      rows: [{ id: "001", note: 'line\n"quoted",value' }],
      columns: [{ id: "id", value: row => row.id }, { id: "note", value: row => row.note }],
    });
    expect(core.importCominsRowsFromCsv({ text, mapRow: cells })).toEqual([["001", 'line\n"quoted",value']]);
  });
});
