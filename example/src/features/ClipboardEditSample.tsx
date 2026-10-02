import { useMemo, useRef, useState } from "react";
import { CominsTable, type CominsTableColumn, type CominsTableRef } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: number; column1: string | number; column2: number; column3: string | number; column4: string };
const createRows = (): Row[] => Array.from({ length: 1000 }, (_, id) => ({ id, column1: `Data ${id + 1}`, column2: id + 1, column3: `Value ${id + 1}`, column4: `Locked ${id + 1}` }));
const rowId = (row: Row) => row.id;
export function ClipboardEditSample() {
  const { text } = usePlaygroundLocale();
  const [rows, setRows] = useState(createRows);
  const [error, setError] = useState("");
  const [commits, setCommits] = useState(0);
  const [autoHeight, setAutoHeight] = useState(true);
  const [version, setVersion] = useState(0);
  const ref = useRef<CominsTableRef<Row>>(null);
  const columns = useMemo<CominsTableColumn<Row>[]>(() => [
    { field: "column1", label: "column1", width: 200, pinned: "left", sort: true },
    { field: "column2", label: "column2", width: 180, sort: true, cell: { parseClipboard: ({ text }) => {
      if (!text.trim() || !Number.isFinite(Number(text))) throw new Error("column2: enter a finite number.");
      return Number(text);
    }, validateFill: ({ value }) => {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("column2: enter a finite number.");
    } } },
    { field: "column3", label: "column3", width: 260 },
    { field: "column4", label: "column4", width: 200, pinned: "right", cell: { props: { pasteable: false } } },
  ], []);
  return <FeatureSampleSection id="clipboard-edit" title={text(defineLocalizedText("외부 붙여넣기와 Fill Handle", "External paste & Fill Handle"))}
    description={text(defineLocalizedText("아래 TSV를 복사하여 Cell에 붙여넣습니다. 두 값 원본은 column1·column2만 변경합니다. 끝의 탭은 빈 다음 셀이므로 해당 값을 지웁니다. column2는 숫자만 허용하며 column4와 5번째 Row는 보호됩니다. 범위 모서리를 드래그하면 패턴이 반복됩니다. 첫 번째와 마지막 Column은 고정되어 있으며 두꺼운 세로선은 고정 영역의 경계입니다.", "Copy the TSV below into a Cell. The two-value source updates only column1 and column2. A trailing tab represents an empty next cell and clears that value. column2 accepts numbers; column4 and the fifth Row are protected. Drag a range corner to repeat its pattern. The first and last Columns are pinned; the thicker vertical lines mark their boundaries."))}>
    <div className="table-toolbar">
      <Button variant="outline" onClick={() => { setRows(createRows()); setCommits(0); setError(""); setVersion(value => value + 1); }}>{text(defineLocalizedText("편집 예제 초기화", "Reset editing example"))}</Button>
      <Button variant="outline" onClick={() => ref.current?.fillSelection("down")}>{text(defineLocalizedText("아래로 채우기", "Fill down"))}</Button>
      <Button variant="outline" onClick={() => ref.current?.fillSelection("right")}>{text(defineLocalizedText("오른쪽으로 채우기", "Fill right"))}</Button>
      <Button aria-pressed={autoHeight} onClick={() => setAutoHeight(value => !value)} variant="outline">{text(defineLocalizedText("자동 높이", "Automatic height"))}</Button>
      <span data-testid="clipboard-edit-commits">{text(defineLocalizedText("데이터 반영", "Data commits"))}: {commits}</span>
    </div>
    <label className="clipboard-tsv-source">
      <span>{text(defineLocalizedText("두 값만 붙여넣기 (column1·column2)", "Paste two values (column1 and column2)"))}</span>
      <textarea aria-label={text(defineLocalizedText("두 값 TSV 원본", "Two-value TSV source"))} rows={1} wrap="off" defaultValue={'Sheet 1\t100'} />
    </label>
    <label className="clipboard-tsv-source">
      <span>{text(defineLocalizedText("여러 행·줄바꿈 포함 붙여넣기", "Paste multiple Rows and multiline values"))}</span>
      <textarea aria-label={text(defineLocalizedText("붙여넣기 TSV 원본", "Paste TSV source"))} rows={3} wrap="off" defaultValue={'Sheet 1\t100\t"First line\nSecond line"\nSheet 2\t200\tValue'} />
    </label>
    <p role="status" data-testid="clipboard-edit-error">{error}</p>
    <CominsTable key={version} ref={ref} clipboard clipboardPaste fillHandle cellSelection rowSelectionOnClick={false}
      columns={columns} data={rows} getRowId={rowId} data-testid="clipboard-edit-viewport" className="example-table" virtualized
      getRowHeight={autoHeight ? () => "auto" : undefined} estimatedRowHeight={36} rowProps={{ draggable: false, disabled: row => row.id === 4 }}
      onClipboardError={error => setError(error.message)} onChangeData={next => { setRows(next); setError(""); setCommits(value => value + 1); }} />
  </FeatureSampleSection>;
}

export function ClipboardEditFeature() {
  return <section className="feature-panel"><ClipboardEditSample /></section>;
}
