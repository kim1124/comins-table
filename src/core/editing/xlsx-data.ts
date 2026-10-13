import type { CominsXlsxCellValue, CominsXlsxErrorCode, CominsXlsxExportOptions, CominsXlsxImportRow, PreparedXlsxSheet, PreparedXlsxValue, XlsxCellDescriptor, XlsxErrorLocation } from "./xlsx-model";
import { DEFAULT_XLSX_LIMITS } from "./xlsx-model";

/** Internal, data-only validation failure; adapters wrap this without intercepting user exceptions. */
export class XlsxDataError extends Error {
  public readonly location: XlsxErrorLocation;
  constructor(public readonly code: CominsXlsxErrorCode, location: XlsxErrorLocation = {}) {
    super(`XLSX ${code}`);
    this.name = "XlsxDataError";
    this.location = Object.fromEntries(Object.entries(location).filter(([key]) => ["sheetName", "cellAddress", "rowNumber", "sheetNames"].includes(key)));
  }
}
export function validateXlsxLimit(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new XlsxDataError("INVALID_OPTIONS");
}
function textValue(value: string) {
  if (value.length > 32_767) throw new XlsxDataError("LIMIT_EXCEEDED");
  return value;
}
export function normalizeCominsXlsxCell(cell: XlsxCellDescriptor): CominsXlsxCellValue {
  if (cell.kind === "error") throw new XlsxDataError("CELL_ERROR", cell);
  if (cell.formula && !cell.cachePresent) throw new XlsxDataError("MISSING_FORMULA_RESULT", cell);
  switch (cell.kind) {
    case "blank": return null;
    case "text": return textValue(cell.value);
    case "date": return textValue(cell.dateText);
    case "boolean": return cell.value;
    case "number":
      if (!Number.isFinite(cell.value)) throw new XlsxDataError("UNSUPPORTED_VALUE", cell);
      return cell.value;
  }
}
function prepareValue(value: unknown): PreparedXlsxValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return textValue(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getUTCFullYear();
    if (year < 1900 || year > 9999) throw new XlsxDataError("UNSUPPORTED_VALUE");
    return { kind: "date", utc: [year, value.getUTCMonth() + 1, value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds()] };
  }
  throw new XlsxDataError("UNSUPPORTED_VALUE");
}
export function prepareCominsXlsxExport<TData>(options: CominsXlsxExportOptions<TData>): PreparedXlsxSheet {
  const { columns, rows, columnOrder, headerOverrides, valueSource = "raw", maxCells = DEFAULT_XLSX_LIMITS.maxCells } = options;
  validateXlsxLimit(maxCells);
  if (["metadata", "nodes", "groups"].some(key => Object.hasOwn(options, key)) || !Array.isArray(columns) || !columns.length || !Array.isArray(rows)) throw new XlsxDataError("INVALID_OPTIONS");
  if (valueSource !== "raw" && valueSource !== "formatted") throw new XlsxDataError("INVALID_OPTIONS");
  const byId = new Map(columns.map(column => [column.id, column]));
  const chosen = columnOrder?.length ? columnOrder.flatMap(id => { const column = byId.get(id); return column ? [column] : []; }) : columns;
  if (!chosen.length) throw new XlsxDataError("INVALID_OPTIONS");
  if (chosen.length > 16_384 || rows.length + 1 > 1_048_576 || chosen.length * (rows.length + 1) > maxCells) throw new XlsxDataError("LIMIT_EXCEEDED");
  const headers = chosen.map(column => {
    const override = column.id !== undefined && headerOverrides && Object.hasOwn(headerOverrides, column.id) ? headerOverrides[column.id] : undefined;
    const value = override ?? column.label ?? column.id ?? "";
    if (typeof value !== "string" || typeof column.value !== "function") throw new XlsxDataError("INVALID_OPTIONS");
    return textValue(value);
  });
  return { headers, rows: rows.map((row, index) => chosen.map(column => prepareValue(valueSource === "formatted" && column.format ? column.format(row, index) : column.value(row, index)))) };
}
export function mapCominsXlsxImportRows<TData>(rows: readonly CominsXlsxImportRow[], mapRow: (row: CominsXlsxImportRow) => TData): TData[] {
  return rows.map(row => mapRow(row));
}
