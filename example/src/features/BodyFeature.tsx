import { useState } from "react";
import { Database } from "lucide-react";

import { KmsfDataTable } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, createRows, type PersonRow } from "../fixtures/people";

export function BodyFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => createExampleRows(100));

  return (
    <section className="feature-panel">
      <FeatureControls
        actions={
          <>
            <ActionButton icon={<Database />} onClick={() => setRows(createRows(100_000))}>
              10만 행 로드
            </ActionButton>
            <ActionButton icon={<Database />} onClick={() => setRows(createRows(1_000_000))}>
              100만 행 로드
            </ActionButton>
          </>
        }
        options={<span data-testid="virtual-row-count">{rows.length}</span>}
      />
      <div className="evidence-grid">
        <span data-testid="body-proof-virtualization">
          virtualized:true / rows:{rows.length} / Lazy-load:후속
        </span>
        <span>Header/Body table split 유지</span>
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
