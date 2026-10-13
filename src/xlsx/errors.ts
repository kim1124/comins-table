import { XlsxDataError } from "../core/editing/xlsx-data";
import type { CominsXlsxErrorCode, XlsxErrorLocation } from "../core/editing/xlsx-model";
/** File/format failures contain location information, never engine diagnostics or cell data. */
export class CominsXlsxError extends Error {
  readonly sheetName?: string;
  readonly cellAddress?: string;
  readonly rowNumber?: number;
  readonly sheetNames?: readonly string[];
  constructor(public readonly code: CominsXlsxErrorCode, location: XlsxErrorLocation = {}) {
    super(`XLSX ${code}`);
    this.name = "CominsXlsxError";
    this.sheetName = location.sheetName;
    this.cellAddress = location.cellAddress;
    this.rowNumber = location.rowNumber;
    this.sheetNames = location.sheetNames?.slice();
  }
}
export function rethrowXlsxDataError(error: unknown): never {
  if (error instanceof XlsxDataError) throw new CominsXlsxError(error.code, error.location);
  throw error;
}
