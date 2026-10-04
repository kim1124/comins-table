import {
  createCominsTreeExportOptions,
  createCominsGroupedExportOptions,
  exportCominsRowsToCsv,
  exportCominsRowsToJson,
  type CominsExportColumn,
} from "../../../src/core";

type Item = { id: string; name: string; group: string };
const parent: Item = { id: "folder", name: "Documents", group: "files" };
const child: Item = { id: "guide", name: "Guide", group: "files" };
const columns: CominsExportColumn<Item>[] = [
  { id: "name", label: "Name", value: row => row.name },
];
const tree = createCominsTreeExportOptions({
  columns,
  nodes: [{ item: parent, expand: false, children: [{ item: child }] }],
  getRowId: item => item.id,
});
const treeCsv = exportCominsRowsToCsv(tree);
// Name,__rowId,__parentId,__depth
// Documents,folder,,0
// Guide,guide,folder,1

const grouped = createCominsGroupedExportOptions({
  columns,
  rows: [parent, child],
  groups: [{ id: "files" }],
  getGroupId: group => group.id,
  getRowGroupId: item => item.group,
  getRowId: item => item.id,
});
const groupedCsv = exportCominsRowsToCsv(grouped);
// Name,__rowId,__groupId
// Documents,folder,files
// Guide,guide,files
const groupedJson = exportCominsRowsToJson(grouped);
void [treeCsv, groupedCsv, groupedJson];
