import { mapCominsXlsxImportRows, prepareCominsXlsxExport, validateXlsxLimit } from "./core/editing/xlsx-data";
import { DEFAULT_XLSX_LIMITS } from "./core/editing/xlsx-model";
import type { CominsXlsxExportOptions, CominsXlsxImportLimits, CominsXlsxImportOptions, CominsXlsxInspectOptions, CominsXlsxWorkbookInfo } from "./core/editing/xlsx-model";
import { CominsXlsxError, rethrowXlsxDataError } from "./xlsx/errors";
import { readBoundedXlsxContainer } from "./xlsx/zip";
import { inspectCominsXlsxContainer, readCominsXlsxSheetMetadata } from "./xlsx/workbook";
export { CominsXlsxError } from "./xlsx/errors";
export type { CominsXlsxCellValue, CominsXlsxErrorCode, CominsXlsxExportOptions, CominsXlsxImportLimits, CominsXlsxImportOptions, CominsXlsxImportRow, CominsXlsxInspectOptions, CominsXlsxSheetInfo, CominsXlsxWorkbookInfo } from "./core/editing/xlsx-model";
function limits(input: CominsXlsxImportLimits | undefined): Required<CominsXlsxImportLimits> {
  const result = { ...DEFAULT_XLSX_LIMITS, ...input };
  try { for (const value of Object.values(result)) validateXlsxLimit(value); } catch (error) { rethrowXlsxDataError(error); }
  return result;
}
export async function inspectCominsXlsx(options: CominsXlsxInspectOptions): Promise<CominsXlsxWorkbookInfo> {
  return inspectCominsXlsxContainer(await readBoundedXlsxContainer(options.bytes, limits(options.limits)));
}
export async function importCominsRowsFromXlsx<TData>(options: CominsXlsxImportOptions<TData>): Promise<TData[]> {
  if (typeof options.mapRow !== "function" || (options.hasHeader !== undefined && typeof options.hasHeader !== "boolean") || (options.sheetName !== undefined && (typeof options.sheetName !== "string" || !options.sheetName))) throw new CominsXlsxError("INVALID_OPTIONS");
  const budget = limits(options.limits);
  const container = await readBoundedXlsxContainer(options.bytes, budget);
  const metadata = readCominsXlsxSheetMetadata(container, options.sheetName, budget.maxCells);
  const { decodeCominsXlsxRows } = await import("./xlsx/engine");
  const rows = await decodeCominsXlsxRows(container, metadata, options.hasHeader ?? true);
  return mapCominsXlsxImportRows(rows, options.mapRow);
}
export async function exportCominsRowsToXlsx<TData>(options: CominsXlsxExportOptions<TData>): Promise<Uint8Array> {
  const name = options.sheetName ?? "Sheet1";
  if (typeof name !== "string" || !name || name.length > 31 || /[\\/\[\]:*?\x00-\x1f]/.test(name) || name.startsWith("'") || name.endsWith("'")) throw new CominsXlsxError("INVALID_OPTIONS");
  let prepared;
  try { prepared = prepareCominsXlsxExport(options); } catch (error) { rethrowXlsxDataError(error); }
  const { encodeCominsXlsxRows } = await import("./xlsx/engine");
  return encodeCominsXlsxRows(prepared, name);
}
