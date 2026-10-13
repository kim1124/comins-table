import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Independently authored OOXML fixture.
import { archive, fixture, workbookFiles, MAIN } from "./fixtures/xlsx/build-fixtures.mjs";
import { exportCominsRowsToXlsx, importCominsRowsFromXlsx, inspectCominsXlsx } from "../src/xlsx";
import { readBoundedXlsxContainer } from "../src/xlsx/zip";
import { parseXlsxXml, child, children } from "../src/xlsx/xml";
const rows = (bytes: Uint8Array, extra = {}) => importCominsRowsFromXlsx({ bytes, hasHeader: false, mapRow: row => row.cells, ...extra });
const cell = (r: string, t: string, v: string, f = "") => `<c r="${r}" t="${t}">${f}<v>${v}</v></c>`;
describe("public XLSX codec", () => {
  it("keeps normal and cached formula values in their original types", async () => {
    const cells = `<row r="1">${cell("A1","n","0","<f>1-1</f>")}${cell("B1","b","0","<f>FALSE()</f>")}${cell("C1","str","","<f>&quot;&quot;</f>")}${cell("D1","inlineStr","","").replace('<v></v>', '<is><t>00123</t></is>')}</row>`;
    expect(await rows(await fixture({ cells, dimension: "A1:D1" }))).toEqual([[0, false, "", "00123"]]);
  });
  it("validates all cells before invoking mapper, including omitted/shared/array formula caches", async () => {
    for (const cells of ['<row r="1"><c r="A1"><f>1+1</f></c></row>', `<row r="1">${cell("A1","n","1",'<f t="shared" si="0" ref="A1:B1">1</f>')}<c r="B1"><f t="shared" si="0"/></c></row>`, `<row r="1">${cell("A1","n","1",'<f t="array" ref="A1:B1">1</f>')}</row>`, `<row r="1">${cell("A1","e","#DIV/0!")}</row>`]) {
      const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ cells, dimension: "A1:B1" }), hasHeader: false, mapRow })).rejects.toHaveProperty("code"); expect(mapRow).not.toHaveBeenCalled();
    }
    const cells = `<row r="1">${cell("A1","n","1",'<f t="array" ref="A1:B1">1</f>')}${cell("B1","b","0")}</row>`;
    expect(await rows(await fixture({ cells, dimension: "A1:B1" }))).toEqual([[1,false]]);
  });
  it("uses stored dates and file formats for 1900/1904, serial60 and custom date formula", async () => {
    const styles = `<styleSheet xmlns="${MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>`;
    const cells = '<row r="1"><c r="A1" s="1"><v>60</v></c><c r="B1" s="2"><f>60.5</f><v>60.5</v></c><c r="C1"><v>60</v></c></row>';
    expect(await rows(await fixture({ styles, cells, dimension: "A1:C1" }))).toEqual([["1900-02-29", "1900-02-29 12:00:00", 60]]);
    expect(await rows(await fixture({ styles, cells: '<row r="1"><c r="A1" s="1"><v>0</v></c></row>', dimension: "A1", date1904: true }))).toEqual([["1904-01-01"]]);
  });
  it("imports ISO date cells and empty inline strings without timezone shifts", async () => {
    const cells = '<row r="1"><c r="A1" t="d"><v>2026-10-12T01:02:03Z</v></c><c r="B1" t="inlineStr"><is><t></t></is></c></row>';
    expect(await rows(await fixture({ cells, dimension: "A1:B1" }))).toEqual([["2026-10-12 01:02:03", ""]]);
  });
  it("rejects malformed typed cells and duplicate value records before mapping", async () => {
    for (const cells of ['<row r="1"><c r="A1" t="b"><v>2</v></c></row>', '<row r="1"><c r="A1" t="n"><v>not-a-number</v></c></row>', '<row r="1"><c r="A1"><v>1</v><v>2</v></c></row>']) {
      const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ cells, dimension: "A1" }), hasHeader: false, mapRow })).rejects.toHaveProperty("code"); expect(mapRow).not.toHaveBeenCalled();
    }
  });
  it("pads A1-to-last actual cell, keeps duplicate headers/hidden rows and skips trailing styled blanks", async () => {
    const cells = '<row r="1"><c r="B1" t="inlineStr"><is><t>ID</t></is></c><c r="C1" t="inlineStr"><is><t>ID</t></is></c></row><row r="3" hidden="1"><c r="C3" t="inlineStr"><is><t>001</t></is></c></row><row r="9"><c r="A9" s="0"/></row>';
    expect(await importCominsRowsFromXlsx({ bytes: await fixture({ cells, dimension: "A1:C9" }), mapRow: r => r })).toEqual([
      { cells: [null,null,null], headers: ["","ID","ID"], rowIndex: 0, sheetRowNumber: 2 },
      { cells: [null,null,"001"], headers: ["","ID","ID"], rowIndex: 1, sheetRowNumber: 3 }
    ]);
    expect(await rows(await fixture({ cells: "", dimension: "A1" }))).toEqual([]);
    expect(await importCominsRowsFromXlsx({ bytes: await fixture({ cells: '<row r="1"><c r="A1" t="str"><v>ID</v></c></row>', dimension: "A1" }), mapRow: r => r })).toEqual([]);
  });
  it("writes literal formula-like text, numbers/boolean and UTC Date without input mutation", async () => {
    const date = new Date("2026-10-12T01:02:03.004Z"); const before = date.getTime();
    const input = Object.freeze(["=1+1", "+2", "-3", "@name", 25, false, null, date]);
    const bytes = await exportCominsRowsToXlsx({ rows: [input], columns: input.map((_, i) => ({ id: String(i), value: r => r[i] })) });
    const container = await readBoundedXlsxContainer(bytes, { maxBytes: 10e6, maxUncompressedBytes: 50e6, maxCells: 100000 });
    const xml = parseXlsxXml(container.files.get("xl/worksheets/sheet1.xml")!);
    const dataCells = children(children(child(xml,"sheetData")!,"row")[1]!,"c");
    expect(dataCells.slice(0,4).every(c => ["str", "s", "inlineStr"].includes(c.attrs.t!) && !child(c,"f"))).toBe(true);
    expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells })).toEqual([["=1+1", "+2", "-3", "@name", 25, false, null, "2026-10-12 01:02:03.004"]]);
    expect(date.getTime()).toBe(before);
  });
  it("rejects partially parsed numbers and shared string indexes before mapping", async () => {
    for (const text of ["123oops", "0x10", "1,2", "1e2oops"]) for (const formula of ["", "<f>1</f>"]) {
      const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ cells: `<row r="1">${cell("A1","n",text,formula)}</row>`, dimension: "A1" }), hasHeader: false, mapRow })).rejects.toMatchObject({ code: "INVALID_WORKBOOK" }); expect(mapRow).not.toHaveBeenCalled();
    }
    for (const index of ["0oops", "0.5"]) {
      const files = workbookFiles({ cells: `<row r="1">${cell("A1","s",index)}</row>`, dimension: "A1" });
      files.push(["xl/sharedStrings.xml", `<sst xmlns="${MAIN}" count="1" uniqueCount="1"><si><t>Secret</t></si></sst>`]);
      const entry = files.find(([name]: string[]) => name === "[Content_Types].xml"); entry[1] = entry[1].replace("</Types>", '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>');
      const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await archive(files), hasHeader: false, mapRow })).rejects.toMatchObject({ code: "INVALID_WORKBOOK" }); expect(mapRow).not.toHaveBeenCalled();
    }
  });
  it("keeps physically empty typed cells distinct from false and empty text", async () => {
    for (const type of ["b", "str", "inlineStr", "n"]) expect(await rows(await fixture({ cells: `<row r="1"><c r="A1" t="${type}"/>${cell("B1","n","1")}</row>`, dimension: "A1:B1" }))).toEqual([[null,1]]);
    expect(await rows(await fixture({ cells: `<row r="1">${cell("A1","b","true")}${cell("B1","b","false")}</row>`, dimension: "A1:B1" }))).toEqual([[true,false]]);
  });
  it("wraps formatter diagnostics in owned errors without leaking the raw diagnostic", async () => {
    const styles = `<styleSheet xmlns="${MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd .0000"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>`;
    const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ styles, cells: '<row r="1"><c r="A1" s="1"><v>45200.5</v></c></row>', dimension: "A1" }), hasHeader: false, mapRow })).rejects.toMatchObject({ name: "CominsXlsxError", code: "UNSUPPORTED_VALUE", cellAddress: "A1" }); expect(mapRow).not.toHaveBeenCalled();
  });
  it("accepts Strict OOXML namespaces but rejects an arbitrary namespace", async () => {
    const strict = (value: string) => value.replaceAll(MAIN, "http://purl.oclc.org/ooxml/spreadsheetml/main").replaceAll("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "http://purl.oclc.org/ooxml/officeDocument/relationships");
    const bytes = await archive(workbookFiles().map(([name,xml]: string[]) => [name,strict(xml)]));
    expect(await rows(bytes)).toEqual([["ID"],["00123"]]);
    const invalid = await archive(workbookFiles().map(([name,xml]: string[]) => [name,xml.replaceAll(MAIN,"https://example.invalid/namespace")]));
    await expect(rows(invalid)).rejects.toMatchObject({ code: "INVALID_WORKBOOK" });
  });
  it("roundtrips the last supported Date including its time fraction", async () => {
    const bytes = await exportCominsRowsToXlsx({ rows: [new Date("9999-12-31T12:34:56.000Z")], columns: [{ id: "date", value: d => d }] });
    expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells })).toEqual([["9999-12-31 12:34:56.000"]]);
  });
  it("rejects negative fractional date serials before mapping", async () => {
    const styles = `<styleSheet xmlns="${MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss.000"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>`;
    const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ styles, cells: '<row r="1"><c r="A1" s="1"><v>-0.0000000001</v></c></row>', dimension: "A1" }), hasHeader: false, mapRow })).rejects.toMatchObject({ code: "UNSUPPORTED_VALUE" }); expect(mapRow).not.toHaveBeenCalled();
  });
  it("requires exact visible sheet selection and propagates user exceptions", async () => {
    const bytes = await fixture({ sheets: [{ name: "A", state: "visible" }, { name: "B", state: "visible" }] });
    expect((await inspectCominsXlsx({ bytes })).sheets.map(s => s.name)).toEqual(["A","B"]);
    await expect(rows(bytes)).rejects.toMatchObject({ code: "SHEET_SELECTION_REQUIRED" });
    expect(await rows(bytes, { sheetName: "B" })).toEqual([["ID"],["00123"]]);
    const error = new Error("application"); await expect(importCominsRowsFromXlsx({ bytes, sheetName: "A", mapRow: () => { throw error; } })).rejects.toBe(error);
    await expect(exportCominsRowsToXlsx({ rows: [1], columns: [{ value: () => { throw error; } }] })).rejects.toBe(error);
  });
  it("rejects invalid options, worksheets, budgets and source values", async () => {
    for (const sheetName of ["", "bad/name", "x".repeat(32), "'bad", "bad'"]) await expect(exportCominsRowsToXlsx({ rows: [], columns: [{ value: () => 1 }], sheetName })).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
    const bytes = await fixture();
    await expect(rows(bytes, { limits: { maxCells: 1 } })).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    await expect(rows(bytes, { limits: { maxBytes: 0 } })).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
  });
});
