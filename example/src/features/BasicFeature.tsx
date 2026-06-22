import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function BasicFeature() {
  const [rows, setRows] = useState(() => createExampleRows(100));

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="@kmsf/data-table 기본 예제입니다."
        id="basic"
        title="기본"
      >
        <KmsfDataTable
          className="example-table"
          columns={createBaseColumns()}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRows}
          pagination={{ pageIndex: 0, pageSize: 10 }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
