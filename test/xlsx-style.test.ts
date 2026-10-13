import { expect, it } from "vitest";
import { exportCominsRowsToXlsx, importCominsRowsFromXlsx } from "../src/xlsx";
import { readBoundedXlsxContainer } from "../src/xlsx/zip";
import { child, children, parseXlsxXml } from "../src/xlsx/xml";
const columns = [{ id: "text", value: (r: [string, number]) => r[0] }, { id: "amount", value: (r: [string, number]) => r[1] }];
const limits = { maxBytes: 10e6, maxUncompressedBytes: 50e6, maxCells: 100000 };
it("writes the default header theme and keeps literal formula-like strings", async () => {
  const bytes = await exportCominsRowsToXlsx({ columns, rows: [["=1+1", 12.5]] });
  const files = (await readBoundedXlsxContainer(bytes, limits)).files;
  expect(new TextDecoder().decode(files.get("xl/styles.xml"))).toContain("F3F4F6");
  expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells })).toEqual([["=1+1", 12.5]]);
});
it("applies owned styles by column id after reordering without changing raw types", async () => {
  const styles = Object.freeze({ theme: "plain" as const, header: Object.freeze({ backgroundColor: "#123456", textColor: "#FFFFFF", fontWeight: "bold" as const }), columns: Object.freeze({ amount: Object.freeze({ width: 24, body: Object.freeze({ format: '#,##0.00', align: "right" as const, borderColor: "#AABBCC", borderStyle: "thin" as const }) }) }) });
  const bytes = await exportCominsRowsToXlsx({ columns, rows: [["001", 1234.5]], columnOrder: ["amount", "text"], styles });
  const files = (await readBoundedXlsxContainer(bytes, limits)).files;
  const stylesheet = new TextDecoder().decode(files.get("xl/styles.xml"));
  expect(stylesheet).toContain("123456"); expect(stylesheet).toContain("AABBCC"); expect(stylesheet).toContain("#,##0.00");
  const sheet = parseXlsxXml(files.get("xl/worksheets/sheet1.xml")!);
  expect(children(child(sheet,"cols")!,"col")[0]!.attrs).toMatchObject({ min: "1", width: "24" });
  expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells })).toEqual([[1234.5, "001"]]);
});
it.each([{ theme: "unknown" }, { header: { textColor: 'red"/>' } }, { body: { fontSize: NaN } }, { columns: { amount: { width: 1000 } } }, { header: { columnSpan: 2 } }, { body: { format: '\u0000' } }, { features: [] }])("rejects unsafe or unsupported style options %j", async styles => {
  await expect(exportCominsRowsToXlsx({ columns, rows: [], styles } as never)).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
});
it("escapes number format XML and preserves text/empty trailing cells", async () => {
  const bytes = await exportCominsRowsToXlsx({ rows: [[1, "", null]], columns: [0,1,2].map(i => ({ id: String(i), value: (r: (number|string|null)[]) => r[i] })), styles: { columns: { "0": { body: { format: '0 "<&>"' } } } } });
  const files = (await readBoundedXlsxContainer(bytes, limits)).files;
  expect(new TextDecoder().decode(files.get("xl/styles.xml"))).toContain("&lt;");
  expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells })).toEqual([[1,"",null]]);
});
it("preserves empty, prototype-named, escaped OOXML and Unicode text exactly", async () => {
  const texts = ["", "constructor", "__proto__", "toString", "_x0041_", "한글 😀", " leading ", "a\rb\nc\td", "\u0000", "�", "\ud800", "<&>\"'", "__comins_text_0"];
  const bytes = await exportCominsRowsToXlsx({ rows: texts, columns: [{ id: "text", value: r => r }] });
  expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells[0] })).toEqual(texts);
});

it("writes only child elements inside worksheet rows", async () => {
  const bytes = await exportCominsRowsToXlsx({ rows: [["first", 42, "last"], ["", null, "end"]], columns: [0,1,2].map(i => ({ id: String(i), value: (r: unknown[]) => r[i] })) });
  const files = (await readBoundedXlsxContainer(bytes, limits)).files;
  const sheet = parseXlsxXml(files.get("xl/worksheets/sheet1.xml")!);
  const data = child(sheet, "sheetData")!;
  expect(data.text.trim()).toBe("");
  for (const row of children(data,"row")) {
    expect(row.text.trim()).toBe("");
    expect(children(row,"c").map(cell => cell.attrs.r)).toHaveLength(3);
  }
});
it.each(["global", "column"])("preserves blank and boolean values with %s number formats", async scope => {
  const values = [null, undefined, false, true, 0, 12.5, "", "001"];
  const styles = scope === "global" ? { body: { format: "#,##0.00" } } : { columns: { value: { body: { format: "#,##0.00" } } } };
  const bytes = await exportCominsRowsToXlsx({ rows: values.map((value, i) => ({ id: String(i), value })), columns: [{ id: "id", value: r => r.id }, { id: "value", value: r => r.value }], styles });
  expect(await importCominsRowsFromXlsx({ bytes, mapRow: r => r.cells[1] })).toEqual(values.map(value => value ?? null));
});
