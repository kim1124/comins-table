import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

export function BasicFeature() {
  const [rows, setRows] = useState(() => cloneBaseRows());

  return (
    <section className="feature-panel">
      <div className="feature-controls">
        <span className="state-pill">data prop 제어</span>
        <span className="state-pill">밀도:compact</span>
        <span className="state-pill">행 스타일:Owner</span>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeData={setRows}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
