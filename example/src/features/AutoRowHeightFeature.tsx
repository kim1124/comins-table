import { useMemo, useState } from "react";
import { CominsTable, type CominsTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: number; text: string };
function ExpandingContent({ value }: { value: unknown }) {
  const { text } = usePlaygroundLocale();
  const [expanded, setExpanded] = useState(false);
  return <div><button type="button" data-testid="renderer-resize" onClick={() => setExpanded(value => !value)}>{text(defineLocalizedText("콘텐츠 펼침 전환", "Toggle content"))}</button><div>{String(value)}{expanded ? " Dynamic renderer content.".repeat(12) : ""}</div></div>;
}
const columns: CominsTableColumn<Row>[] = [
  { field: "id", label: "id", width: 100, pinned: "left" },
  { field: "text", label: "text", width: 400, cell: { renderer: ({ value, row }) => <div style={{ whiteSpace: "normal", lineHeight: "20px" }}>{row.id === 0 ? <ExpandingContent value={value} /> : String(value)}</div> } },
];
const auto = () => "auto" as const;
const id = (row: Row) => row.id;
export function AutoRowHeightFeature() {
  const { text } = usePlaygroundLocale();
  const [long, setLong] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [detail, setDetail] = useState(false);
  const activeColumns = useMemo(() => columns.map(column => column.field === "text" ? { ...column, width: narrow ? 240 : 400 } : column), [narrow]);
  const data = useMemo(() => Array.from({ length: 100_000 }, (_, id) => ({ id, text: `Row ${id}. ` + "Variable content wraps naturally. ".repeat((id % 5) + (long ? 12 : 1)) })), [long]);
  return <section className="feature-panel">
    <FeatureSampleSection id="auto-row-height" title={text(defineLocalizedText("Row 자동 높이", "Automatic row height"))} description={text(defineLocalizedText("Renderer 콘텐츠를 측정하여 100,000개 Row의 가변 높이 가상화를 처리합니다.", "Renderer content determines variable heights across 100,000 virtual rows."))}>
      <div className="table-toolbar">
        <button type="button" data-testid="auto-height-content" onClick={() => setLong(value => !value)}>{text(defineLocalizedText("콘텐츠 길이 변경", "Change content length"))}</button>
        <button type="button" data-testid="auto-height-width" onClick={() => setNarrow(value => !value)}>{text(defineLocalizedText("너비 변경", "Change width"))}</button>
        <label><input type="checkbox" data-testid="auto-height-detail" checked={detail} onChange={event => setDetail(event.target.checked)} />{text(defineLocalizedText("Row Detail", "Row Detail"))}</label>
      </div>
      <div style={{ height: 420, width: narrow ? 420 : 760, maxWidth: "100%" }}>
        <CominsTable data={data} columns={activeColumns} expandedRowIds={detail ? [0] : []} renderRowDetail={() => <div style={{ height: 120 }}>{text(defineLocalizedText("독립적으로 측정하는 Detail 콘텐츠", "Independently measured detail content"))}</div>} getRowId={id} getRowHeight={auto} estimatedRowHeight={56} rowProps={{ draggable: false }} virtualized data-testid="auto-height-viewport" />
      </div>
    </FeatureSampleSection>
  </section>;
}
