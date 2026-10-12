import { CominsXlsxError, exportCominsRowsToXlsx, importCominsRowsFromXlsx, inspectCominsXlsx } from "../../../src/xlsx";
import type { CominsXlsxCellValue } from "../../../src/xlsx";
import type { XlsxFileRequest, XlsxFileResponse, XlsxFileResult } from "./xlsx-file.protocol";
// The worker owns parsing/encoding; application callbacks never cross this boundary.
self.onmessage = async (event: MessageEvent<XlsxFileRequest>) => {
  const request = event.data;
  try {
    let result: XlsxFileResult;
    if (request.kind === "inspect") result = { kind: "inspect", value: await inspectCominsXlsx({ bytes: request.bytes }) };
    else if (request.kind === "import") result = { kind: "import", value: await importCominsRowsFromXlsx({ bytes: request.bytes, sheetName: request.sheetName, mapRow: row => row }) };
    else result = { kind: "export", value: await exportCominsRowsToXlsx({ rows: request.rows, columns: request.headers.map((id, index) => ({ id, value: (row: CominsXlsxCellValue[]) => row[index] })) }) };
    const response: XlsxFileResponse = { jobId: request.jobId, status: "ok", result };
    self.postMessage(response);
  } catch (error) {
    const response: XlsxFileResponse = { jobId: request.jobId, status: "error", kind: request.kind, code: error instanceof CominsXlsxError ? error.code : "WORKER_ERROR" };
    self.postMessage(response);
  }
};
