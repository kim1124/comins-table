import { CominsXlsxError, inspectCominsXlsx, importCominsRowsFromXlsx, exportCominsRowsToXlsx } from "../../../src/xlsx";
type Row = { id: string; score: number; active: boolean };
async function roundTrip() {
  const bytes = await exportCominsRowsToXlsx<Row>({
    rows: [{ id: "001", score: 0, active: false }],
    styles: { header: { backgroundColor: "#1D4ED8", textColor: "#FFFFFF" },
      columns: { score: { width: 16, body: { format: "#,##0.00", align: "right" } } } },
    columns: [
      { id: "id", value: row => row.id },
      { id: "score", value: row => row.score },
      { id: "active", value: row => row.active },
    ],
  });
  const workbook = await inspectCominsXlsx({ bytes });
  try {
    return await importCominsRowsFromXlsx<Row>({
      bytes, sheetName: workbook.sheets.find(sheet => sheet.visibility === "visible")?.name,
      mapRow: ({ cells, headers }) => {
        const [id, score, active] = cells;
        if (headers?.join(",") !== "id,score,active" || typeof id !== "string" || typeof score !== "number" || typeof active !== "boolean") throw new Error("Invalid application row");
        return { id, score, active };
      },
    });
  } catch (error) {
    if (error instanceof CominsXlsxError) throw new Error(`File error: ${error.code}`);
    throw error;
  }
}
void roundTrip;
