import { useState } from "react";
import { CominsTable, type CominsTableColumn, type CominsTreeNode } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Item = { id: string; name: string; kind: string };
const columns: CominsTableColumn<Item>[] = [
  { field: "name", label: "Name", minWidth: 340 },
  { field: "kind", label: "Kind", width: 140 },
];
const initialData: CominsTreeNode<Item>[] = [{
  item: { id: "documents", name: "Documents", kind: "Folder" }, expand: true,
  children: [{ item: { id: "guide", name: "Getting started", kind: "Document" } }],
}];

export function TreeSlotsSample() {
  const { text } = usePlaygroundLocale();
  const [data, setData] = useState(initialData);
  const [selectedCount, setSelectedCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  return (
    <FeatureSampleSection id="tree-grid-slots"
      title={text(defineLocalizedText("Tree 노드 슬롯", "Tree node slots"))}
      description={text(defineLocalizedText(
        "왼쪽 이미지, 중앙 콘텐츠와 오른쪽 버튼을 추가합니다. 버튼은 행 선택을 변경하지 않으며, 펼침 버튼과 들여쓰기는 유지됩니다.",
        "Add a leading image, custom content, and a trailing action. Actions preserve row selection; disclosure and indentation remain intact.",
      ))}>
      <CominsTable tree columns={columns} data={data} getRowId={item => item.id} onChangeData={setData}
        rowHeight={48} className="example-table" data-testid="tree-slots-viewport"
        onChangeSelection={selection => setSelectedCount(selection.rowIds.length)}
        treeSlots={{
          leading: ({ item }) => <img src="/comins-symbol.svg" alt={item.kind} width={20} height={20} />,
          content: ({ defaultContent, depth }) => <span>{defaultContent} <small>({depth})</small></span>,
          trailing: ({ item }) => <Button variant="outline" aria-label={`${item.name} ${text(defineLocalizedText("상세", "details"))}`}
            onClick={() => setActionCount(count => count + 1)}>{text(defineLocalizedText("상세", "Details"))}</Button>,
        }} />
      <p className="state-output">
        {text(defineLocalizedText("선택한 행", "Selected rows"))}: <output data-testid="tree-slots-selected">{selectedCount}</output>
        {" · "}{text(defineLocalizedText("버튼 실행", "Actions"))}: <output data-testid="tree-slots-actions">{actionCount}</output>
      </p>
    </FeatureSampleSection>
  );
}
