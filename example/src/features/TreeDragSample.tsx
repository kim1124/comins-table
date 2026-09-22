import { useMemo, useState } from "react";
import { CominsTable, type CominsAfterTreeRowDragPayload, type CominsTreeNode } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: string; name: string };
const node = (id: string, children?: CominsTreeNode<Row>[]): CominsTreeNode<Row> => ({ item: { id, name: id }, children, expand: id !== "a-2" });
const initial = [node("root-a", [node("a-1"), node("a-2", [node("hidden-child")])]), node("root-b", [node("b-1")])];
const columns = [{ field: "name", label: "name", width: 500, sort: true }] as const;
const id = (row: Row) => row.id;
export function TreeDragSample() {
  const { text } = usePlaygroundLocale();
  const [data, setData] = useState(initial);
  const [reparent, setReparent] = useState(true);
  const [autoHeight, setAutoHeight] = useState(true);
  const [result, setResult] = useState<CominsAfterTreeRowDragPayload<Row> | null>(null);
  const config = useMemo(() => ({ allowReparent: reparent }), [reparent]);
  return <FeatureSampleSection id="tree-row-drag" title={text(defineLocalizedText("Tree Row 이동", "Tree row movement"))} description={text(defineLocalizedText("모든 깊이의 형제 이동과 선택적인 부모 변경을 지원합니다. Space·방향키·Enter로도 조작할 수 있습니다.", "Reorder siblings at any depth, with optional parent changes. Space, arrow keys and Enter also move rows."))}>
    <div className="table-toolbar"><Button aria-pressed={reparent} onClick={() => setReparent(value => !value)} data-testid="tree-allow-reparent" variant="outline">{text(defineLocalizedText("부모 변경 허용", "Allow parent changes"))}</Button><Button aria-pressed={autoHeight} onClick={() => setAutoHeight(value => !value)} data-testid="tree-auto-height" variant="outline">{text(defineLocalizedText("자동 높이", "Automatic height"))}</Button><button data-testid="tree-many-rows" onClick={() => { setData([node("root-a", Array.from({ length: 200 }, (_, index) => node(`child-${index}`)))]); setResult(null); }}>{text(defineLocalizedText("많은 형제 노드", "Many siblings"))}</button></div>
    <div style={{ height: 340 }}><CominsTable tree getRowHeight={autoHeight ? () => "auto" : undefined} virtualized data={data} columns={columns} getRowId={id} treeRowDrag={config} onChangeData={setData} onAfterDragRow={setResult} data-testid="tree-drag-viewport" /></div>
    <output data-testid="tree-drag-result">{result ? JSON.stringify({ rowId: result.row.id, result: result.result, destination: result.target?.tree }) : text(defineLocalizedText("이동 대기", "Ready to move"))}</output>
  </FeatureSampleSection>;
}
