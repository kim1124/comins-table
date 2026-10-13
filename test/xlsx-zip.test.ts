import { describe, expect, it } from "vitest";
// Fixture uses a maintained ZIP writer and independently authored OOXML.
// @ts-expect-error Test-only JavaScript fixture generator.
import { archive, fixture, workbookFiles } from "./fixtures/xlsx/build-fixtures.mjs";
import { ZipWriter, ZipReader, Uint8ArrayReader, Uint8ArrayWriter } from "@zip.js/zip.js/index-native.js";
import { readBoundedXlsxContainer } from "../src/xlsx/zip";
import { inspectCominsXlsxContainer, readCominsXlsxSheetMetadata } from "../src/xlsx/workbook";
const limits = { maxBytes: 10 * 1024 * 1024, maxUncompressedBytes: 50 * 1024 * 1024, maxCells: 100000 };
describe("XLSX verified input boundary", () => {
  it("accepts exact input/inflation limits and rejects one byte over", async () => {
    const bytes = await archive([["a.xml", "<a/>"], ["b.xml", "<b/>"]]);
    expect((await readBoundedXlsxContainer(bytes, { ...limits, maxBytes: bytes.length, maxUncompressedBytes: 8 })).files.size).toBe(2);
    await expect(readBoundedXlsxContainer(bytes, { ...limits, maxBytes: bytes.length - 1 })).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    await expect(readBoundedXlsxContainer(bytes, { ...limits, maxUncompressedBytes: 7 })).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("checks the real default compressed and inflated boundaries", async () => {
    const base = await archive([["pad.bin", new Uint8Array()]], 0);
    const bytes = await archive([["pad.bin", new Uint8Array(limits.maxBytes - base.length)]], 0);
    expect(bytes.length).toBe(limits.maxBytes); await expect(readBoundedXlsxContainer(bytes, limits)).resolves.toHaveProperty("files");
    await expect(readBoundedXlsxContainer(await archive([["pad.bin", new Uint8Array(limits.maxBytes - base.length + 1)]], 0), limits)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    const inflated = await archive([["pad.bin", new Uint8Array(limits.maxUncompressedBytes)]]);
    expect((await readBoundedXlsxContainer(inflated, limits)).files.get("pad.bin")?.length).toBe(limits.maxUncompressedBytes);
    await expect(readBoundedXlsxContainer(await archive([["pad.bin", new Uint8Array(limits.maxUncompressedBytes + 1)]]), limits)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("rejects encrypted input and forged declared sizes using library-generated archives", async () => {
    const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, dataDescriptor: false });
    await writer.add("encrypted.bin", new Uint8ArrayReader(new Uint8Array([1,2,3])), { password: "fixture-only" });
    await expect(readBoundedXlsxContainer(await writer.close(), limits)).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    const valid = await archive([["payload.bin", "owned malformed-size fixture"]], 0);
    const reader = new ZipReader(new Uint8ArrayReader(valid), { useWebWorkers: false });
    const [entry] = await reader.getEntries(); if (!entry || entry.directory) throw new Error("Missing file entry");
    const forged = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, dataDescriptor: false });
    await forged.add("payload.bin", new Uint8ArrayReader(new TextEncoder().encode("owned malformed-size fixture")), { passThrough: true, compressionMethod: 0, uncompressedSize: 1, signature: entry.signature });
    await reader.close();
    await expect(readBoundedXlsxContainer(await forged.close(), limits)).rejects.toMatchObject({ code: "INVALID_WORKBOOK" });
  });
  it("counts actual inflation of all entries, including unrelated ones", async () => {
    const bytes = await archive([...workbookFiles(), ["unused.bin", new Uint8Array(50 * 1024 * 1024)]]);
    await expect(readBoundedXlsxContainer(bytes, limits)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("reads only the supplied view and leaves bytes unchanged", async () => {
    const bytes = await fixture(); const whole = new Uint8Array(bytes.length + 20); whole.set(bytes, 10); const before = whole.slice();
    expect(inspectCominsXlsxContainer(await readBoundedXlsxContainer(whole.subarray(10, 10 + bytes.length), limits))).toEqual({ sheets: [{ name: "Sheet1", visibility: "visible" }] });
    expect(whole).toEqual(before);
  });
  it("rejects non-ZIP, truncated archives and original CRC corruption", async () => {
    for (const bytes of [new TextEncoder().encode("<html>table</html>"), (await fixture()).slice(0, 60)]) await expect(readBoundedXlsxContainer(bytes, limits)).rejects.toMatchObject({ code: "INVALID_WORKBOOK" });
    const text = "owned CRC fixture"; const bytes = await archive([["a.txt", text]], 0); const needle = new TextEncoder().encode(text);
    const index = bytes.findIndex((_, i) => needle.every((byte: number, j: number) => bytes[i+j] === byte)); expect(index).toBeGreaterThan(0); bytes[index] ^= 1;
    await expect(readBoundedXlsxContainer(bytes, limits)).rejects.toMatchObject({ code: "INVALID_WORKBOOK" });
  });
  it("requires exact visible sheet selection and rejects all-hidden workbooks", async () => {
    const container = await readBoundedXlsxContainer(await fixture({ sheets: [{ name: "A", state: "visible" }, { name: "B", state: "visible" }, { name: "Hidden", state: "hidden" }] }), limits);
    expect(() => readCominsXlsxSheetMetadata(container, undefined, limits.maxCells)).toThrow(expect.objectContaining({ code: "SHEET_SELECTION_REQUIRED", sheetNames: ["A", "B"] }));
    for (const name of ["Hidden", "missing", "a"]) expect(() => readCominsXlsxSheetMetadata(container, name, limits.maxCells)).toThrow(expect.objectContaining({ code: "SHEET_NOT_FOUND" }));
    expect(readCominsXlsxSheetMetadata(container, "B", limits.maxCells).name).toBe("B");
    const hidden = await readBoundedXlsxContainer(await fixture({ sheets: [{ name: "H", state: "veryHidden" }] }), limits);
    expect(() => readCominsXlsxSheetMetadata(hidden, undefined, limits.maxCells)).toThrow(expect.objectContaining({ code: "SHEET_NOT_FOUND" }));
  });
  it("rejects malformed XML, DTD, missing relations, macros and unsafe paths", async () => {
    for (const [path, value] of [["xl/workbook.xml", "<workbook>"], ["xl/workbook.xml", '<!DOCTYPE workbook [<!ENTITY x SYSTEM "https://example.invalid">]><workbook/>'], ["xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'], ["xl/vbaProject.bin", "macro"], ["../bad", "bad"]]) {
      const files = workbookFiles().filter(([name]: string[]) => name !== path); files.push([path, value]);
      await expect((async () => inspectCominsXlsxContainer(await readBoundedXlsxContainer(await archive(files), limits)))()).rejects.toHaveProperty("code");
    }
  });
  it("rejects merges and exaggerated dimensions without allocating rectangular rows", async () => {
    for (const options of [{ merge: '<mergeCells><mergeCell ref="A1:B1"/></mergeCells>' }, { dimension: "A1:XFD1048576" }]) {
      const c = await readBoundedXlsxContainer(await fixture(options), limits);
      expect(() => readCominsXlsxSheetMetadata(c, undefined, limits.maxCells)).toThrow(expect.objectContaining({ code: options.merge ? "MERGED_CELLS" : "LIMIT_EXCEEDED" }));
    }
  });
});
