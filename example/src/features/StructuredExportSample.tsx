import { useMemo, useState } from "react";
import { CominsTable, type CominsRowId, type CominsTableColumn, type CominsTreeNode } from "../../../src";
import { createCominsGroupedExportOptions, createCominsTreeExportOptions, exportCominsRowsToCsv, exportCominsRowsToJson, type CominsExportColumn } from "../../../src/core";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Item = { id: string; name: string; score: number; groupId: string };
const guide: Item = { id: "guide", name: "Guide", score: 42, groupId: "docs" };
const logo: Item = { id: "logo", name: "Logo", score: 90, groupId: "media" };
const initialTree: CominsTreeNode<Item>[] = [{
  item: { id: "folder", name: "Documents", score: 0, groupId: "docs" }, expand: true,
  children: [{ item: guide }, { item: logo }],
}];
// Deliberately interleaved input: the export follows groups, then source order within each group.
const groupedRows: Item[] = [logo, guide, { id: "notes", name: "Notes", score: 75, groupId: "docs" }];
const groups = [{ id: "docs", label: "Documents" }, { id: "empty", label: "Empty" }, { id: "media", label: "Media" }];
const getRowId = (item: Item) => item.id;
const getRowGroupId = (item: Item) => item.groupId;
const columns: CominsTableColumn<Item>[] = [
  { field: "name", label: "Name", minWidth: 220 },
  { field: "score", label: "Score", width: 100 },
];
const exportColumns: CominsExportColumn<Item>[] = [
  { id: "name", label: "Name", value: item => item.name },
  { id: "score", label: "Score", value: item => item.score },
];

export function StructuredExportSample() {
  const { text } = usePlaygroundLocale();
  const [structure, setStructure] = useState<"tree" | "group">("tree");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [tree, setTree] = useState(initialTree);
  const [expandedGroups, setExpandedGroups] = useState<CominsRowId[]>(["docs", "media"]);
  const options = useMemo(() => structure === "tree"
    ? createCominsTreeExportOptions({ columns: exportColumns, nodes: tree, getRowId })
    : createCominsGroupedExportOptions({ columns: exportColumns, rows: groupedRows, groups, getGroupId: group => group.id, getRowGroupId, getRowId }),
  [structure, tree]);
  const csv = useMemo(() => exportCominsRowsToCsv(options), [options]);
  const output = useMemo(() => format === "csv" ? csv : exportCominsRowsToJson(options), [csv, format, options]);

  return <FeatureSampleSection id="structured-export"
    title={text(defineLocalizedText("Tree·Group 내보내기", "Tree and Group export"))}
    description={text(defineLocalizedText(
      "Tree는 접힌 자식까지 전체 노드를 내보냅니다. Group은 지정된 그룹 순서를 따르며 빈 그룹·제목·집계 행은 CSV에 추가하지 않습니다. 업무 열 뒤의 __ 관리 열을 확인하십시오.",
      "Tree exports include collapsed descendants. Group exports follow explicit group order without empty-group, heading or aggregate rows. Inspect the __ management columns after the business columns.",
    ))}>
    <div className="table-toolbar">
      <Button variant="outline" aria-pressed={structure === "tree"} onClick={() => setStructure("tree")}>Tree</Button>
      <Button variant="outline" aria-pressed={structure === "group"} onClick={() => setStructure("group")}>Group</Button>
      <Button variant="outline" aria-pressed={format === "csv"} onClick={() => setFormat("csv")}>CSV</Button>
      <Button variant="outline" aria-pressed={format === "json"} onClick={() => setFormat("json")}>JSON</Button>
      <a className="ui-button ui-button--outline ui-button--default"
        download={`comins-${structure}.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>
        {text(defineLocalizedText("CSV 다운로드", "Download CSV"))}
      </a>
    </div>
    {structure === "tree"
      ? <CominsTable key="tree" tree className="example-table" columns={columns} data={tree}
        getRowId={getRowId} onChangeData={setTree} data-testid="structured-tree-viewport" theme={{ density: "compact" }} />
      : <CominsTable key="group" className="example-table" columns={columns} data={groupedRows}
        getRowId={getRowId} data-testid="structured-group-viewport" theme={{ density: "compact" }}
        rowGrouping={{ groups, getGroupId: group => group.id, getGroupLabel: group => group.label, getRowGroupId,
          expandedGroupIds: expandedGroups, onChangeExpandedGroupIds: setExpandedGroups }} />}
    <p role="status">{text(defineLocalizedText(
      `${options.rows.length}개 행 내보내기 · 접기/펼치기와 무관 · 다운로드는 CSV`,
      `Exporting ${options.rows.length} rows · independent of expansion · downloads are CSV`,
    ))}</p>
    <pre className="state-output" data-testid="structured-export-output">{output}</pre>
  </FeatureSampleSection>;
}
