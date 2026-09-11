import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsSelectionState,
  type CominsTableColumn,
  type CominsTableRef,
  type CominsCopyTarget,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { ContextMenu } from "../components/ui/context-menu";
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
  const tableRef = useRef<CominsTableRef<PersonRow>>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [copiedText, setCopiedText] = useState("");
  const [readSelection, setReadSelection] = useState("");
  const copy = async (target: CominsCopyTarget = "auto") => {
    try { setCopiedText(await tableRef.current?.copySelection(target) ?? ""); }
    catch { setCopiedText(text(defineLocalizedText("클립보드에 접근할 수 없습니다.", "Clipboard access is unavailable."))); }
  };
  const [rows, setRows] = useState(() => createExampleRows(30));
  const [selection, setSelection] = useState<CominsSelectionState>(createEmptySelection);
  const [sampleVersion, setSampleVersion] = useState(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "id", label: "id", width: 120, cell: {
        renderer: ({ row }) => <label><input type="checkbox" aria-label={`Select Row ${row.id}`}
          checked={selection.rowIds.includes(row.id)}
          onClick={event => event.stopPropagation()}
          onChange={event => {
            const ids = new Set(tableRef.current?.getSelection().rowIds);
            if (event.target.checked) ids.add(row.id); else ids.delete(row.id);
            tableRef.current?.setSelectedRows(rows.flatMap((row, index) => ids.has(row.id) ? [index] : []));
          }} /> {String(row.id)}</label>,
        props: { copyable: false, pasteable: false },
      } },
      { field: "name", label: "name", minWidth: 120 },
      { field: "age", label: "age", minWidth: 100 },
      { field: "role", label: "role", minWidth: 120 },
      {
        cell: {
          props: {
            copyable: false,
            pasteable: false,
          },
        },
        field: "locked",
        label: "locked",
        minWidth: 120,
      },
    ],
    [selection.rowIds, rows],
  );
  const resetSample = () => {
    setRows(createExampleRows(30));
    setSelection(createEmptySelection());
    setSampleVersion((current) => current + 1);
    setCopiedText(""); setReadSelection(""); setMenu(null);
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
          <Button onClick={() => tableRef.current?.setSelectedRows([0, 1, 2, 3, 4])} variant="outline">{text(defineLocalizedText("Row 5개 선택", "Select 5 Rows"))}</Button>
          <Button onClick={() => setReadSelection(JSON.stringify({ rows: tableRef.current?.getSelectedRows(), cells: tableRef.current?.getSelectedCells() }, null, 2))} variant="outline">{text(defineLocalizedText("선택 데이터 조회", "Read selected data"))}</Button>
          <Button onClick={() => void copy()} variant="outline">{text(defineLocalizedText("선택 복사", "Copy selection"))}</Button>
          <span className="table-toolbar__state">
            {text(defineLocalizedText(
              "체크박스로 Row 선택 · Ctrl/Cmd·Shift·드래그로 Cell 선택 · 복사: 여러 Cell → Row → 단일 Cell",
              "Checkboxes select Rows · Ctrl/Cmd, Shift or drag select Cells · Copy: multiple Cells → Rows → single Cell",
            ))}
          </span>
        </div>
        <pre className="state-output state-output--selection" data-testid="selection-state">
          {JSON.stringify(selection, null, 2)}
        </pre>
        <CominsTable
          key={sampleVersion}
          ref={tableRef}
          rowSelectionOnClick={false}
          clipboard
          onContextMenuCell={({ event }) => {
            event.preventDefault();
            setMenu({ x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 160) });
          }}
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
        <pre className="state-output" data-testid="selection-read-result">{readSelection}</pre>
        <pre className="state-output" data-testid="selection-copy-result">{copiedText}</pre>
        {menu ? <ContextMenu aria-label={text(defineLocalizedText("선택 복사 메뉴", "Selection copy menu"))}
          style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 100 }} onClose={() => setMenu(null)}
          items={[
            { label: text(defineLocalizedText("선택 복사", "Copy selection")), onSelect: () => void copy() },
            { label: text(defineLocalizedText("선택 Cell 복사", "Copy selected Cells")), onSelect: () => void copy("cells") },
            { label: text(defineLocalizedText("선택 Row 복사", "Copy selected Rows")), onSelect: () => void copy("rows") },
          ]} /> : null}
      </FeatureSampleSection>
    </section>
  );
}
