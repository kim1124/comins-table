import { useMemo, useState } from "react";
import { CominsTable, useCominsViewport, type CominsTableColumn, type CominsViewportRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: number; text: string };
const columns: CominsTableColumn<Row>[] = [
  { field: "id", label: "id", width: 100, pinned: "left" },
  { field: "text", label: "text", width: 450, cell: { renderer: ({ value }) => <div style={{ whiteSpace: "normal", lineHeight: "20px" }}>{String(value)}</div> } },
];
const id = (row: Row) => row.id;
const auto = () => "auto" as const;

export function ViewportFeature() {
  const { text } = usePlaygroundLocale();
  const [automatic, setAutomatic] = useState(true);
  const [query, setQuery] = useState(0);
  const [slow, setSlow] = useState(false);
  const [fail, setFail] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const activeColumns = useMemo(() => columns.map(column => column.field === "text" ? { ...column, cell: { renderer: ({ value }: { value: unknown }) => <div style={{ whiteSpace: automatic ? "normal" : "nowrap", lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value)}{expandedContent ? " Additional content changes the measured row height.".repeat(6) : ""}</div> } } : column), [automatic, expandedContent]);
  const getRows = async ({ startIndex, endIndex, signal }: CominsViewportRequest): Promise<Row[]> => {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new Error("Cancelled")); return; }
      const cancel = () => { clearTimeout(timer); reject(new Error("Cancelled")); };
      const timer = window.setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, slow ? 350 : 40);
      signal.addEventListener("abort", cancel, { once: true });
    });
    if (fail) throw new Error("Example request failure");
    return Array.from({ length: endIndex - startIndex }, (_, offset) => {
      const index = startIndex + offset;
      return { id: index, text: `Result ${query}, row ${index}. ` + "Content determines the height. ".repeat(index % 5 + 1) };
    });
  };
  const viewport = useCominsViewport({ rowCount: 1_000_000, queryKey: query, getRows });
  return <section className="feature-panel">
    <FeatureSampleSection id="viewport-datasource" title={text(defineLocalizedText("Viewport 데이터 조회", "Viewport loading"))} description={text(defineLocalizedText("전체 1,000,000건 중 현재 화면 주변 구간만 조회합니다.", "Load only the current region from a million-row dataset."))}>
      <div className="table-toolbar">
        <label><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} data-testid="viewport-auto-height" />{text(defineLocalizedText("자동 높이", "Auto height"))}</label>
        <label><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} />{text(defineLocalizedText("느린 응답", "Slow response"))}</label>
        <label><input type="checkbox" checked={fail} onChange={event => setFail(event.target.checked)} data-testid="viewport-fail" />{text(defineLocalizedText("오류 응답", "Fail requests"))}</label>
        <button type="button" data-testid="viewport-reset" onClick={() => setQuery(value => value + 1)}>{text(defineLocalizedText("검색 결과 변경", "Change query"))}</button>
        <button type="button" data-testid="viewport-content" onClick={() => setExpandedContent(value => !value)}>{text(defineLocalizedText("콘텐츠 길이 변경", "Change content length"))}</button>
        <span data-testid="viewport-cache-state">{text(defineLocalizedText("보관 중", "Cached"))}: {viewport.data.blocks.reduce((count, block) => count + block.rows.length, 0)}{" / 1,000,000"}</span>
      </div>
      <div style={{ height: 420 }}>
        <CominsTable {...viewport.tableProps} columns={activeColumns} getRowId={id} getRowHeight={automatic ? auto : undefined} estimatedRowHeight={56} data-testid="viewport-datasource-viewport" />
      </div>
    </FeatureSampleSection>
  </section>;
}
