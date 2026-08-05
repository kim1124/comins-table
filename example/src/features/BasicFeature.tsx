import { useState } from "react";

import { CominsTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

export function BasicFeature() {
  const { text } = usePlaygroundLocale();
  const [rows, setRows] = useState(() => createExampleRows(30));

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText("comins-table 기본 예제입니다.", "Basic comins-table example."))}
        id="basic"
        title={text(defineLocalizedText("기본", "Basic"))}
      >
        <CominsTable
          className="example-table"
          columns={createBaseColumns()}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRows}
          pagination={{ pageIndex: 0, pageSize: 30 }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
