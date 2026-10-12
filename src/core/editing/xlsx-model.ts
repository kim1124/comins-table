import type { CominsExportRowsOptions } from "../model";

export type CominsXlsxCellValue = string | number | boolean | null;
export type CominsXlsxImportRow = {
  cells: readonly CominsXlsxCellValue[];
  headers: readonly string[] | null;
  rowIndex: number;
  sheetRowNumber: number;
};
export type CominsXlsxImportLimits = { maxBytes?: number; maxUncompressedBytes?: number; maxCells?: number };
export type CominsXlsxImportOptions<TData> = {
  bytes: Uint8Array | ArrayBuffer;
  sheetName?: string;
  hasHeader?: boolean;
  limits?: CominsXlsxImportLimits;
  mapRow: (row: CominsXlsxImportRow) => TData;
};
export type CominsXlsxInspectOptions = Pick<CominsXlsxImportOptions<unknown>, "bytes" | "limits">;
export type CominsXlsxExportOptions<TData> = Omit<CominsExportRowsOptions<TData>, "metadata"> & {
  metadata?: never;
  sheetName?: string;
  maxCells?: number;
};
export type CominsXlsxSheetInfo = { name: string; visibility: "visible" | "hidden" | "veryHidden" };
export type CominsXlsxWorkbookInfo = { sheets: readonly CominsXlsxSheetInfo[] };
export type CominsXlsxErrorCode = "INVALID_OPTIONS" | "UNSUPPORTED_FILE" | "INVALID_WORKBOOK" | "LIMIT_EXCEEDED" | "SHEET_SELECTION_REQUIRED" | "SHEET_NOT_FOUND" | "MERGED_CELLS" | "MISSING_FORMULA_RESULT" | "CELL_ERROR" | "UNSUPPORTED_VALUE";
export type XlsxErrorLocation = { sheetName?: string; cellAddress?: string; rowNumber?: number; sheetNames?: readonly string[] };
export type PreparedXlsxValue = CominsXlsxCellValue | { kind: "date"; utc: readonly [number, number, number, number, number, number, number] };
export type PreparedXlsxSheet = { headers: readonly string[]; rows: readonly (readonly PreparedXlsxValue[])[] };
type XlsxCellBase = { formula: boolean; cachePresent?: boolean } & XlsxErrorLocation;
export type XlsxCellDescriptor = XlsxCellBase & (
  | { kind: "blank" | "error" }
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "date"; dateText: string }
);
export const DEFAULT_XLSX_LIMITS = { maxBytes: 10 * 1024 * 1024, maxUncompressedBytes: 50 * 1024 * 1024, maxCells: 100_000 } as const;
