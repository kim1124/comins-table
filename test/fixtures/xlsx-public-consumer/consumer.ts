import { CominsXlsxError, exportCominsRowsToXlsx, importCominsRowsFromXlsx, inspectCominsXlsx, type CominsXlsxImportRow } from "comins-table/xlsx";
export async function smoke() {
  const bytes = await exportCominsRowsToXlsx({ rows: Array.from({ length: 1000 }, (_, i) => ({ id: String(i + 1).padStart(3, "0"), score: i, active: i % 2 !== 0 })), columns: [
    { id: "id", value: r => r.id }, { id: "score", value: r => r.score }, { id: "active", value: r => r.active }
  ], styles: { header: { backgroundColor: "#123456" }, columns: { score: { width: 20, body: { format: "#,##0.00" } } } } });
  const info = await inspectCominsXlsx({ bytes });
  const rows = await importCominsRowsFromXlsx({ bytes, mapRow: r => ({ id: r.cells[0], score: r.cells[1], active: r.cells[2] }) });
  if (info.sheets[0]?.name !== "Sheet1" || rows[0]?.id !== "001" || rows[0]?.score !== 0 || rows[0]?.active !== false) throw new Error("Typed roundtrip failed");
  if (rows.length !== 1000 || rows[999]?.score !== 999) throw new Error("Large typed roundtrip failed");
  return rows.slice(0, 1);
}
const payload: CominsXlsxImportRow = { cells: ["001", 0, false, null], headers: null, rowIndex: 0, sheetRowNumber: 1 };
// @ts-expect-error Engine Workbook is not a byte input.
void importCominsRowsFromXlsx({ bytes: { Sheets: {}, SheetNames: [] }, mapRow: () => 1 });
// @ts-expect-error Metadata is not part of the XLSX contract.
void exportCominsRowsToXlsx({ rows: [], columns: [], metadata: {} });
void [CominsXlsxError, payload];
