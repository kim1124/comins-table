import { CominsXlsxError, exportCominsRowsToXlsx, importCominsRowsFromXlsx, inspectCominsXlsx, type CominsXlsxImportRow } from "comins-table/xlsx";
export async function smoke() {
  const bytes = await exportCominsRowsToXlsx({ rows: [{ id: "001", score: 0, active: false }], columns: [
    { id: "id", value: r => r.id }, { id: "score", value: r => r.score }, { id: "active", value: r => r.active }
  ] });
  const info = await inspectCominsXlsx({ bytes });
  const rows = await importCominsRowsFromXlsx({ bytes, mapRow: r => ({ id: r.cells[0], score: r.cells[1], active: r.cells[2] }) });
  if (info.sheets[0]?.name !== "Sheet1" || rows[0]?.id !== "001" || rows[0]?.score !== 0 || rows[0]?.active !== false) throw new Error("Typed roundtrip failed");
  return rows;
}
const payload: CominsXlsxImportRow = { cells: ["001", 0, false, null], headers: null, rowIndex: 0, sheetRowNumber: 1 };
// @ts-expect-error Engine Workbook is not a byte input.
void importCominsRowsFromXlsx({ bytes: { Sheets: {}, SheetNames: [] }, mapRow: () => 1 });
// @ts-expect-error Metadata is not part of the XLSX contract.
void exportCominsRowsToXlsx({ rows: [], columns: [], metadata: {} });
void [CominsXlsxError, payload];
