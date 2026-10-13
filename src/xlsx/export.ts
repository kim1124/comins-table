import writeExcelFile from "write-excel-file/universal";
import type { Cell, CellObject } from "write-excel-file/universal";
import type { CominsXlsxExportOptions, PreparedXlsxSheet, PreparedXlsxValue } from "../core/editing/xlsx-model";
import { CominsXlsxError } from "./errors";
import { cellAddress } from "./workbook";
import { createXlsxTextTable } from "./text";
import { resolveXlsxStyles } from "./styles";
function exportCell(value: PreparedXlsxValue, token: (text: string) => number): CellObject {
  if (value === null) return { type: Number };
  if (typeof value !== "object") return { value: typeof value === "string" ? token(value) : value, type: typeof value === "boolean" ? Boolean : Number };
  const [year, month, day, hours, minutes, seconds, ms] = value.utc;
  const timestamp = Date.UTC(year, month-1, day, hours, minutes, seconds, ms);
  let serial = (timestamp - Date.UTC(1899, 11, 30)) / 86_400_000;
  if (timestamp < Date.UTC(1900, 2, 1)) serial--;
  return { value: serial, type: Number, format: "yyyy-mm-dd hh:mm:ss.000" };
}
export async function encodeCominsXlsxRows<TData>(prepared: PreparedXlsxSheet, name: string, options: CominsXlsxExportOptions<TData>): Promise<Uint8Array> {
  const styles = resolveXlsxStyles(options);
  const text = createXlsxTextTable();
  const data: Cell[][] = [prepared.headers.map((value, index) => ({ ...exportCell(value, value => text.token(value, cellAddress(1, index+1))), ...styles.columns[index]!.header, height: styles.headerHeight })),
    ...prepared.rows.map((row, rowIndex) => row.map((value, index) => ({ ...exportCell(value, value => text.token(value, cellAddress(rowIndex+2, index+1))), ...styles.columns[index]!.body, ...(typeof value === "boolean" ? { format: undefined } : {}), height: styles.rowHeight })))];
  try {
    const blob = await writeExcelFile(data, { sheet: name, columns: styles.columns.map(column => ({ width: column.width })) }, { features: [text.feature] }).toBlob();
    return new Uint8Array(await blob.arrayBuffer());
  } catch { throw new CominsXlsxError("INVALID_WORKBOOK"); }
}
