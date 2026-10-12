import { useMemo, useState } from "react";
import { CominsTable, type CominsColumnFilterModel, type CominsTableColumn, type CominsValueFilterPanelRenderParams } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: string; status: string | null; region: string };
const sample: Row[] = [
  { id: "v1", status: "Ready", region: "KR" }, { id: "v2", status: "READY", region: "KR" },
  { id: "v3", status: "Ready", region: "US" }, { id: "v4", status: "Blocked", region: "US" },
  { id: "v5", status: "Blocked", region: "US" }, { id: "v6", status: null, region: "KR" },
];
function CustomPanel({ params: p, custom }: { params: CominsValueFilterPanelRenderParams<Row>; custom: boolean }) {
  return <section data-testid="value-filter-custom-panel">
    <input {...p.getSearchInputProps()} placeholder="Search" />
    <label><input {...p.getSelectAllProps()} />Select matching values</label>
    <ul className="value-filter-list">{p.visibleOptions.map(option => <li key={option.id} {...p.getOptionContainerProps(option)}>
      {custom ? <div {...p.getOptionProps(option, { element: "custom", props: { className: "value-filter-check" } })}>{option.selected ? "☑" : "☐"}</div>
        : <input {...p.getOptionProps(option)} />}
      {p.renderOption(option)}<small>{option.count}</small>
    </li>)}</ul>
    <button {...p.getClearProps()}>Clear</button> <button {...p.getCloseProps()}>Close</button>
  </section>;
}
export function ValueListFilteringSample() {
  const { text } = usePlaygroundLocale();
  const [model, setModel] = useState<CominsColumnFilterModel>([]);
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);
  const [variant, setVariant] = useState("builtin");
  const [scale, setScale] = useState("sample");
  const [removed, setRemoved] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const data = useMemo(() => scale === "sample" ? sample.filter(row => !removed || row.status?.toLowerCase() !== "ready")
    : Array.from({ length: 10_000 }, (_, index) => ({ id: String(index), status: `Value ${String(index % (scale === "100" ? 100 : 10_000)).padStart(5, "0")}`, region: index % 2 ? "US" : "KR" })), [scale, removed]);
  const columns = useMemo<CominsTableColumn<Row>[]>(() => [
    { id: "status", field: "status", label: "status", sort: true, filter: {
      kind: "text", mode: "values",
      getOptionLabel: value => value === null ? text(defineLocalizedText("값 없음", "(Empty)")) : String(value),
      trigger: variant === "custom" ? { render: p => <div {...p.getTriggerProps({ element: "custom", props: { className: "value-filter-trigger" } })}>Filter status{p.active ? " •" : ""}</div> } : { props: { className: "value-filter-trigger" } },
      option: { props: { className: "value-filter-option", style: { borderRadius: 4 } },
        render: variant === "builtin" ? undefined : ({ option }) => <span className="value-filter-badge" data-value={option.value}>{option.label}</span> },
      panel: variant === "panel" || variant === "custom" ? { props: { className: "value-filter-panel" }, render: p => <CustomPanel params={p} custom={variant === "custom"} /> } : undefined,
    } },
    { id: "region", field: "region", label: "region", filter: { kind: "text", mode: "values" } },
  ], [variant, text]);
  return <FeatureSampleSection id="column-filtering-values" title={text(defineLocalizedText("값 목록 필터", "Value list filter"))}
    description={text(defineLocalizedText("즉시 적용, 다른 열 기반 건수, 검색 결과 전체 선택과 커스텀 UI를 확인합니다.", "Immediate filtering, faceted counts, search-scoped selection and custom UI."))}>
    <div className="value-filter-toolbar">
      <label>{text(defineLocalizedText("표시", "UI"))}<select data-testid="value-filter-variant" value={variant} onChange={e => setVariant(e.currentTarget.value)}>
        <option value="builtin">Built-in + styles</option><option value="badge">Badge</option><option value="panel">ul/li panel</option><option value="custom">Custom controls</option>
      </select></label>
      <label>{text(defineLocalizedText("데이터", "Data"))}<select data-testid="value-filter-scale" value={scale} onChange={e => setScale(e.currentTarget.value)}>
        <option value="sample">6 rows</option><option value="100">10,000 rows / 100 values</option><option value="10000">10,000 rows / 10,000 values</option>
      </select></label>
      <label><input data-testid="value-filter-readonly" type="checkbox" checked={readonly} onChange={e => setReadonly(e.currentTarget.checked)} />Readonly</label>
      <button type="button" data-testid="value-filter-data" onClick={() => setRemoved(value => !value)}>{removed ? "Restore Ready" : "Remove Ready"}</button>
    </div>
    <pre data-testid="value-filter-model" className="state-output">{JSON.stringify(model)}</pre>
    <div className="value-filter-table"><CominsTable className="example-table" data-testid="value-filter-table" data={data} columns={columns}
      getRowId={row => row.id} columnFiltering={{ model, openColumnId, onChangeModel: readonly ? undefined : setModel, onChangeOpenColumnId: setOpenColumnId }}
      summary={{ columns: { status: "count" } }} virtualized /></div>
  </FeatureSampleSection>;
}
