import { useMemo, useState } from "react";

import { exportKmsfRowsToCsv, exportKmsfRowsToJson, KmsfDataTable, type KmsfExportColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, type PersonRow } from "../fixtures/people";

type ExportMode = "csv" | "json";

const exportColumns: Array<KmsfExportColumn<PersonRow>> = [
  { id: "name", label: "Column1", value: (row) => row.name },
  { id: "age", label: "Column2", value: (_row, rowIndex) => `Data ${rowIndex + 1}` },
  { id: "role", label: "Column3", value: (row) => row.role },
];

export function ExportFeature() {
  const [mode, setMode] = useState<ExportMode>("csv");
  const rows = useMemo(() => cloneBaseRows(), []);
  const tableColumns = useMemo(() => createBaseColumns(), []);
  const output = useMemo(() => {
    const options = { columns: exportColumns, rows };

    return mode === "csv" ? exportKmsfRowsToCsv(options) : exportKmsfRowsToJson(options);
  }, [mode, rows]);

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="exportKmsfRowsToCsv와 exportKmsfRowsToJson은 현재 data 배열과 column value getter를 받아 dependency-free 문자열을 생성합니다."
        id="export"
        title="Export Helper"
      >
        <div className="table-toolbar">
          <Button aria-pressed={mode === "csv"} onClick={() => setMode("csv")} variant="outline">
            CSV
          </Button>
          <Button aria-pressed={mode === "json"} onClick={() => setMode("json")} variant="outline">
            JSON
          </Button>
          <span className="table-toolbar__state" data-testid="export-mode">
            {mode.toUpperCase()}
          </span>
        </div>
        <KmsfDataTable
          className="example-table"
          columns={tableColumns}
          data={rows}
          data-testid="export-viewport"
          getRowId={(row) => row.id}
          pagination={{ pageIndex: 0, pageSize: 5 }}
          theme={{ density: "compact" }}
        />
        <pre className="state-output" data-testid="export-output">
          {output}
        </pre>
      </FeatureSampleSection>
    </section>
  );
}
