import { describe, expect, it } from "vitest";

import { exportKmsfRowsToCsv, exportKmsfRowsToJson } from "../src";

type ExportRow = {
  active: boolean;
  id: string;
  meta?: { score: number };
  name: string;
  note?: string | null;
  salary: number;
};

const rows: ExportRow[] = [
  { active: true, id: "a", meta: { score: 8 }, name: "Alpha", note: 'comma, quote " and\nline', salary: 80000 },
  { active: false, id: "b", name: "Beta", note: null, salary: 92000 },
];

const columns = [
  { id: "name", label: "Name", value: (row: ExportRow) => row.name },
  {
    format: (row: ExportRow) => `$${row.salary.toLocaleString("en-US")}`,
    id: "salary",
    label: "Salary",
    value: (row: ExportRow) => row.salary,
  },
  { id: "note", label: "Note", value: (row: ExportRow) => row.note },
  { id: "meta", label: "Meta", value: (row: ExportRow) => row.meta },
  { id: "active", label: "Active", value: (row: ExportRow) => row.active },
];

describe("KMSF export helpers", () => {
  it("exports raw CSV with escaping and empty nullish cells", () => {
    expect(exportKmsfRowsToCsv({ columns, rows })).toBe(
      [
        "Name,Salary,Note,Meta,Active",
        'Alpha,80000,"comma, quote "" and\nline","{""score"":8}",true',
        "Beta,92000,,,false",
      ].join("\n"),
    );
  });

  it("exports formatted CSV with ordered and renamed columns", () => {
    expect(
      exportKmsfRowsToCsv({
        columnOrder: ["salary", "name"],
        columns,
        headerOverrides: { salary: "Annual Salary" },
        rows,
        valueSource: "formatted",
      }),
    ).toBe(["Annual Salary,Name", '"$80,000",Alpha', '"$92,000",Beta'].join("\n"));
  });

  it("exports JSON with the same column order and value source", () => {
    expect(
      exportKmsfRowsToJson({
        columnOrder: ["name", "salary"],
        columns,
        rows: rows.slice(0, 1),
        valueSource: "formatted",
      }),
    ).toBe(JSON.stringify([{ Name: "Alpha", Salary: "$80,000" }], null, 2));
  });
});
