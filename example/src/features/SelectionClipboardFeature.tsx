import { useMemo, useState } from "react";

import {
  CominsTable,
  type CominsSelectionState,
  type CominsTableColumn,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { cloneBaseRows, type PersonRow } from "../fixtures/people";

function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    range: null,
    rowIds: [],
  };
}

export function SelectionClipboardFeature() {
  const [rows, setRows] = useState(cloneBaseRows);
  const [selection, setSelection] = useState<CominsSelectionState>(createEmptySelection);
  const [sampleVersion, setSampleVersion] = useState(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: "Name", minWidth: 120 },
      { field: "age", label: "Age", minWidth: 100 },
      { field: "role", label: "Role", minWidth: 120 },
      {
        cell: {
          props: {
            copyable: false,
            pasteable: false,
          },
        },
        field: "locked",
        label: "Protected",
        minWidth: 120,
      },
    ],
    [],
  );
  const resetSample = () => {
    setRows(cloneBaseRows());
    setSelection(createEmptySelection());
    setSampleVersion((current) => current + 1);
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Row/Cell/Range selection과 Ctrl/Cmd+C, Ctrl/Cmd+V를 controlled data 및 onChangeSelection과 연결합니다."
        id="selection-clipboard"
        title="Selection & Clipboard"
      >
        <div className="table-toolbar">
          <Button onClick={resetSample} variant="outline">
            예제 초기화
          </Button>
          <span className="table-toolbar__state">
            Ctrl/Cmd로 Row 추가 선택 · Shift로 범위 선택 · Cell drag로 Range 선택
          </span>
        </div>
        <pre className="state-output" data-testid="selection-state">
          {JSON.stringify(selection, null, 2)}
        </pre>
        <CominsTable
          key={sampleVersion}
          cellSelection
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="selection-clipboard-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRows}
          onChangeSelection={setSelection}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
