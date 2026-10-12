import { expect, it, vi } from "vitest";
// @ts-expect-error Owned ZIP/XML fixture generator.
import { fixture, archive, workbookFiles } from "./fixtures/xlsx/build-fixtures.mjs";
import { importCominsRowsFromXlsx, inspectCominsXlsx } from "../src/xlsx";
import { parseXlsxXml, validateXlsxXml } from "../src/xlsx/xml";
it("rejects overlapping array/shared ranges before repetitive validation or mapping", async () => {
  const cells = '<row r="1"><c r="A1"><f t="array" ref="A1:B1">1</f><v>1</v></c><c r="B1"><f t="array" ref="A1:B1">2</f><v>2</v></c></row>';
  const mapRow = vi.fn(); await expect(importCominsRowsFromXlsx({ bytes: await fixture({ cells, dimension: "A1:B1" }), hasHeader: false, mapRow })).rejects.toMatchObject({ code: "INVALID_WORKBOOK" }); expect(mapRow).not.toHaveBeenCalled();
  const valid = cells.replace('ref="A1:B1">2', 'ref="B1">2').replace('ref="A1:B1">1', 'ref="A1">1');
  expect(await importCominsRowsFromXlsx({ bytes: await fixture({ cells: valid, dimension: "A1:B1" }), hasHeader: false, mapRow: r => r.cells })).toEqual([[1,2]]);
});
it("caps retained metadata nodes at the exact node boundary", () => {
  const bytes = new TextEncoder().encode('<r><e/><e/></r>');
  expect(parseXlsxXml(bytes, 3).children).toHaveLength(2);
  expect(() => parseXlsxXml(bytes, 2)).toThrow(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
});
it("validates unselected XML without a retained node tree", async () => {
  const bytes = new TextEncoder().encode('<r>' + '<e/>'.repeat(300000) + '</r>');
  expect(validateXlsxXml(bytes)).toBeUndefined();
  expect((await inspectCominsXlsx({ bytes: await archive([...workbookFiles(), ['unused.xml', bytes]]) })).sheets[0]?.name).toBe("Sheet1");
  expect(() => validateXlsxXml(new TextEncoder().encode('<!DOCTYPE r><r/>'))).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
});
