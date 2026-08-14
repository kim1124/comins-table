import { useMemo, useState } from "react";

import {
  CominsTable,
  type CominsSelectionState,
  type CominsTableColumn,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    range: null,
    rowIds: [],
  };
}

export function SelectionClipboardFeature() {
  const { text } = usePlaygroundLocale();
  const [rows, setRows] = useState(() => createExampleRows(30));
  const [selection, setSelection] = useState<CominsSelectionState>(createEmptySelection);
  const [sampleVersion, setSampleVersion] = useState(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 120 },
      { field: "age", label: text(defineLocalizedText("나이", "Age")), minWidth: 100 },
      { field: "role", label: text(defineLocalizedText("역할", "Role")), minWidth: 120 },
      {
        cell: {
          props: {
            copyable: false,
            pasteable: false,
          },
        },
        field: "locked",
        label: text(defineLocalizedText("보호됨", "Protected")),
        minWidth: 120,
      },
    ],
    [text],
  );
  const resetSample = () => {
    setRows(createExampleRows(30));
    setSelection(createEmptySelection());
    setSampleVersion((current) => current + 1);
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Row/Cell/Range selection과 Ctrl/Cmd+C, Ctrl/Cmd+V를 controlled data 및 onChangeSelection과 연결합니다.",
          "Connect Row, Cell, and Range selection plus Ctrl/Cmd+C and Ctrl/Cmd+V to controlled data and onChangeSelection.",
        ))}
        id="selection-clipboard"
        title={text(defineLocalizedText("선택과 Clipboard", "Selection & Clipboard"))}
      >
        <div className="table-toolbar">
          <Button onClick={resetSample} variant="outline">
            {text(defineLocalizedText("예제 초기화", "Reset example"))}
          </Button>
          <span className="table-toolbar__state">
            {text(defineLocalizedText(
              "Ctrl/Cmd로 Row 추가 선택 · Shift로 범위 선택 · Cell drag로 Range 선택",
              "Ctrl/Cmd adds Rows · Shift selects a range · Drag Cells to select a Range",
            ))}
          </span>
        </div>
        <pre className="state-output state-output--selection" data-testid="selection-state">
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
