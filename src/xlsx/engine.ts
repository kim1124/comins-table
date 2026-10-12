import * as XLSX from "xlsx";
import type { CominsXlsxCellValue, CominsXlsxImportRow, PreparedXlsxSheet, PreparedXlsxValue, XlsxCellDescriptor } from "../core/editing/xlsx-model";
import { normalizeCominsXlsxCell } from "../core/editing/xlsx-data";
import { CominsXlsxError, rethrowXlsxDataError } from "./errors";
import { cellAddress, type XlsxCellMetadata, type XlsxSheetMetadata } from "./workbook";
import { encodeVerifiedXlsxContainer, type VerifiedXlsxContainer } from "./zip";
const DAY = 86_400_000;
function descriptor(meta: XlsxCellMetadata | undefined, cell: XLSX.CellObject | undefined, sheet: XlsxSheetMetadata, formats: readonly number[], address: string, row: number): XlsxCellDescriptor {
  const base = { formula: meta?.formula ?? false, cachePresent: meta?.cachePresent ?? false, sheetName: sheet.name, cellAddress: address, rowNumber: row };
  if (meta?.type === "e" || cell?.t === "e") return { ...base, kind: "error" };
  if (meta && !base.formula && !meta.cachePresent && !meta.inlinePresent) return { ...base, kind: "blank" };
  if (base.formula && !base.cachePresent) return { ...base, kind: "blank" };
  if (meta?.type === "str" && meta.cachePresent && meta.value === "") return { ...base, kind: "text", value: "" };
  if (!cell || cell.t === "z") {
    if (meta?.cachePresent) throw new CominsXlsxError("INVALID_WORKBOOK", base);
    return { ...base, kind: "blank" };
  }
  if (cell.t === "b") {
    if (meta?.value !== undefined && !["0", "1", "true", "false"].includes(meta.value.trim())) throw new CominsXlsxError("INVALID_WORKBOOK", base);
    return { ...base, kind: "boolean", value: meta?.value !== undefined ? ["1", "true"].includes(meta.value.trim()) : cell.v === true };
  }
  if (cell.t === "s") return { ...base, kind: "text", value: String(cell.v ?? "") };
  if (cell.t !== "n" || typeof cell.v !== "number") throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
  let number = cell.v;
  let fallback = "General";
  if (meta?.type === "d") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(meta.value ?? "");
    if (!match) throw new CominsXlsxError("INVALID_WORKBOOK", base);
    const fields = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 0), Number(match[5] ?? 0), Number(match[6] ?? 0), Number((match[7] ?? "").padEnd(3,"0"))] as const;
    const timestamp = Date.UTC(fields[0], fields[1]-1, fields[2], fields[3], fields[4], fields[5], fields[6]);
    const date = new Date(timestamp);
    if (fields[0] < 1900 || fields[0] > 9999 || date.getUTCFullYear() !== fields[0] || date.getUTCMonth()+1 !== fields[1] || date.getUTCDate() !== fields[2] || fields[3] > 23 || fields[4] > 59 || fields[5] > 59) throw new CominsXlsxError("INVALID_WORKBOOK", base);
    number = (timestamp - (sheet.date1904 ? Date.UTC(1904,0,1) : Date.UTC(1899,11,30))) / DAY;
    if (!sheet.date1904 && timestamp < Date.UTC(1900,2,1)) number--;
    fallback = match[4] ? `yyyy-mm-dd hh:mm:ss${match[7] ? ".000" : ""}` : "yyyy-mm-dd";
  }
  const format = meta?.style !== undefined && formats[meta.style] === 14 ? "yyyy-mm-dd" : !cell.z || cell.z === "General" ? fallback : cell.z;
  try {
    if (XLSX.SSF.is_date(format)) {
      if (!Number.isFinite(number) || number < 0) throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
      if (format === "yyyy-mm-dd hh:mm:ss.000") {
        const day = Math.floor(number); const millis = Math.round((number-day) * DAY);
        const parsed = XLSX.SSF.parse_date_code(day + (millis === DAY ? 1 : 0), { date1904: sheet.date1904 });
        if (!parsed || parsed.y > 9999) throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
        const time = millis % DAY; const pad = (value: number, width = 2) => String(value).padStart(width,"0");
        // Preserve millisecond Date precision instead of SSF's 15-digit serial truncation.
        const dateText = `${pad(parsed.y,4)}-${pad(parsed.m)}-${pad(parsed.d)} ${pad(Math.floor(time/3600000))}:${pad(Math.floor(time/60000)%60)}:${pad(Math.floor(time/1000)%60)}.${pad(time%1000,3)}`;
        return { ...base, kind: "date", dateText };
      }
      let dateNumber = number; let date1904 = sheet.date1904;
      // SSF excludes time fractions on 9999-12-31 in the 1900 system.
      // Equivalent 1904 serials preserve calendar fields; conditions/elapsed values cannot be shifted.
      if (!date1904 && number > 2958465 && number < 2958466) {
        if (/\[(?:[<>=]|[hms]+\])/i.test(String(format))) throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
        dateNumber -= 1462; date1904 = true;
      }
      const parsed = XLSX.SSF.parse_date_code(dateNumber, { date1904 });
      if (!parsed || parsed.y > 9999) throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
      const dateText: unknown = XLSX.SSF.format(format, dateNumber, { date1904 });
      if (typeof dateText !== "string" || !dateText) throw new CominsXlsxError("UNSUPPORTED_VALUE", base);
      return { ...base, kind: "date", dateText };
    }
  } catch { throw new CominsXlsxError("UNSUPPORTED_VALUE", base); }
  return { ...base, kind: "number", value: cell.v };
}
export async function decodeCominsXlsxRows(container: VerifiedXlsxContainer, metadata: XlsxSheetMetadata, hasHeader: boolean): Promise<CominsXlsxImportRow[]> {
  let sheet: XLSX.WorkSheet;
  try {
    const book = XLSX.read(await encodeVerifiedXlsxContainer(container), { type: "array", sheets: [metadata.name], cellNF: true, cellDates: false, cellHTML: false, cellFormula: false, sheetStubs: true });
    sheet = book.Sheets[metadata.name]!; if (!sheet) throw new Error();
  } catch { throw new CominsXlsxError("INVALID_WORKBOOK", { sheetName: metadata.name }); }
  const formats = metadata.formatIds; const values: CominsXlsxCellValue[][] = [];
  try {
    for (let row = 1; row <= metadata.rows; row++) {
      const cells: CominsXlsxCellValue[] = [];
      for (let col = 1; col <= metadata.cols; col++) {
        const address = cellAddress(row, col);
        cells.push(normalizeCominsXlsxCell(descriptor(metadata.cells.get(address), sheet[address] as XLSX.CellObject | undefined, metadata, formats, address, row)));
      }
      values.push(cells);
    }
  } catch (error) { rethrowXlsxDataError(error); }
  const headers = hasHeader && values.length ? values.shift()!.map(v => v === null ? "" : String(v)) : null;
  return values.map((cells, rowIndex) => ({ cells, headers, rowIndex, sheetRowNumber: rowIndex + (hasHeader ? 2 : 1) }));
}
function exportCell(value: PreparedXlsxValue): XLSX.CellObject | undefined {
  if (value === null) return undefined;
  if (typeof value === "string") return { t: "s", v: value };
  if (typeof value === "number") return { t: "n", v: value };
  if (typeof value === "boolean") return { t: "b", v: value };
  const [year, month, day, hours, minutes, seconds, ms] = value.utc;
  const timestamp = Date.UTC(year, month-1, day, hours, minutes, seconds, ms);
  let serial = (timestamp - Date.UTC(1899, 11, 30)) / DAY;
  if (timestamp < Date.UTC(1900, 2, 1)) serial--;
  return { t: "n", v: serial, z: "yyyy-mm-dd hh:mm:ss.000" };
}
export function encodeCominsXlsxRows(prepared: PreparedXlsxSheet, name: string): Uint8Array {
  const sheet: XLSX.WorkSheet = { "!ref": `A1:${cellAddress(prepared.rows.length+1, prepared.headers.length)}` };
  [prepared.headers, ...prepared.rows].forEach((row, index) => row.forEach((value, col) => { const cell = exportCell(value); if (cell) sheet[cellAddress(index+1, col+1)] = cell; }));
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, name);
  try { return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx", compression: true, bookSST: false })); }
  catch { throw new CominsXlsxError("INVALID_WORKBOOK"); }
}
