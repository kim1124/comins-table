import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, createRows, type PersonRow } from "../fixtures/people";

export function BodyFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => cloneBaseRows());

  return (
    <section className="feature-panel">
      <div className="feature-controls">
        <Button onClick={() => setRows(createRows(100_000))} variant="secondary">
          10만 행 로드
        </Button>
        <Button onClick={() => setRows(createRows(1_000_000))} variant="secondary">
          100만 행 로드
        </Button>
        <span data-testid="virtual-row-count">{rows.length}</span>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        pagination={{ pageIndex: 0, pageSize: rows.length }}
        theme={{ density: "compact" }}
        virtualized
      />
    </section>
  );
}
