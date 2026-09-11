import { CominsTable, useCominsViewport, createCominsViewportData, type CominsViewportTableProps, type CominsTreeTableProps } from "../../src";

type Row = { id: number; name: string };
const columns = [{ field: "name", label: "Name" }];
const snapshot = createCominsViewportData<Row>({ revision: "query", rowCount: 1_000_000 });
const viewportProps: CominsViewportTableProps<Row> = { columns, data: snapshot, getRowId: row => row.id, viewportDatasource: { revision: "query" }, onViewportRequest: () => {} };
const treeProps: CominsTreeTableProps<Row> = { tree: true, data: [{ item: { id: 1, name: "One" } }], columns, getRowId: row => row.id, treeRowDrag: { allowReparent: true, canDrop: ({ source, destination }) => source.rowId !== destination.parentId }, onBeforeRowDrag: ({ event }) => !event.defaultPrevented };
export function ViewportApiExample() {
  const viewport = useCominsViewport<Row>({ rowCount: 1000, queryKey: "all", getRows: async ({ startIndex, endIndex, signal }) => signal.aborted ? [] : Array.from({ length: endIndex - startIndex }, (_, i) => ({ id: startIndex + i, name: "Row" })) });
  return <><CominsTable {...viewport.tableProps} columns={columns} getRowId={row => row.id} getRowHeight={() => "auto"} /><CominsTable {...treeProps} getRowHeight={({ row }) => row.data.id ? "auto" : 40} /></>;
}
// @ts-expect-error Viewport requires sparse snapshot data.
const invalidArray = <CominsTable {...viewportProps} data={[]} />;
// @ts-expect-error Viewport does not combine with pagination.
const invalidPagination = <CominsTable {...viewportProps} pagination={{ pageSize: 10 }} />;
// @ts-expect-error Viewport is virtualized.
const invalidVirtual = <CominsTable {...viewportProps} virtualized={false} />;
// @ts-expect-error Viewport does not combine with Tree.
const invalidTree = <CominsTable {...viewportProps} tree />;
// @ts-expect-error Existing rowHeight remains numeric.
const invalidHeight = <CominsTable data={[]} columns={columns} rowHeight="auto" />;
void [invalidArray, invalidPagination, invalidVirtual, invalidTree, invalidHeight];
