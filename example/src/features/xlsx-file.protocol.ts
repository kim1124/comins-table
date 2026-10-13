import type { CominsXlsxExportStyles, CominsXlsxCellValue, CominsXlsxErrorCode, CominsXlsxImportRow, CominsXlsxWorkbookInfo } from "../../../src/xlsx";
export type XlsxFileRequest = { jobId: number } & (
  | { kind: "inspect"; bytes: Uint8Array }
  | { kind: "import"; bytes: Uint8Array; sheetName?: string }
  | { kind: "export"; headers: string[]; rows: CominsXlsxCellValue[][]; styles?: CominsXlsxExportStyles }
);
export type XlsxFileResult =
  | { kind: "inspect"; value: CominsXlsxWorkbookInfo }
  | { kind: "import"; value: CominsXlsxImportRow[] }
  | { kind: "export"; value: Uint8Array };
export type XlsxFileResponse = { jobId: number } & (
  | { status: "ok"; result: XlsxFileResult }
  | { status: "error"; kind: XlsxFileRequest["kind"]; code: CominsXlsxErrorCode | "WORKER_ERROR" }
);
