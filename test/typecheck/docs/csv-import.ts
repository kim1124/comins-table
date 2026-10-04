import { importCominsRowsFromCsv } from "../../../src/core";

type Row = { id: string; score: number };
const rows = importCominsRowsFromCsv<Row>({
  text: 'id,score\r\n"001",42',
  mapRow: ({ cells, headers, rowIndex }) => {
    if (headers?.[0] !== "id" || headers[1] !== "score") throw new Error("Unexpected columns");
    const score = Number(cells[1]);
    if (!cells[0] || !Number.isFinite(score)) throw new Error(`Invalid row ${rowIndex + 1}`);
    return { id: cells[0], score };
  },
});
// rows: [{ id: "001", score: 42 }]
