import { useState } from "react";
import type { Root } from "react-dom/client";
import { CominsTable, type CominsTableColumn } from "comins-retention-source";

type Row = { id: string; status: string };
let ownedRows: Row[] | null = null;
let dataReference: WeakRef<Row[]>;
let rowReferences: WeakRef<Row>[] = [];
let calls = 0;
const columns: CominsTableColumn<Row>[] = [{ id: "status", field: "status", label: "Status", filter: { kind: "text", mode: "values" } }];
const changed = () => { calls++; };
const ignoreOpen = () => {};
function ValueFilterRefConsumer() {
  const [data] = useState(() => ownedRows!);
  return <CominsTable data={data} columns={columns} columnFiltering={{ model: [], openColumnId: "status", onChangeModel: changed, onChangeOpenColumnId: ignoreOpen }} />;
}

let groupChanged: (() => void) | null = null;
let detailChanged: (() => void) | null = null;
const groups = [{ id: "ready", label: "Ready" }, { id: "blocked", label: "Blocked" }];
function createGroupChangeHandler(data: Row[]) {
  return () => { calls++; if (data.length !== 1000) throw new Error("Unexpected owned rows"); };
}
function GroupDisclosureRefConsumer() {
  const [data] = useState(() => ownedRows!);
  return <CominsTable data={data} columns={columns} rowGrouping={{ groups,
    getGroupId: group => group.id, getRowGroupId: row => row.status === "Ready" ? "ready" : "blocked",
    label: { render: group => group.label }, expandedGroupIds: [], onChangeExpandedGroupIds: groupChanged!,
  }} />;
}

function RowDetailRefConsumer() {
  const [data] = useState(() => ownedRows!);
  return <CominsTable data={data} columns={columns} getRowId={row => row.id}
    expandedRowIds={[]} onChangeExpandedRowIds={detailChanged!}
    rowDetail={{ render: () => <div>Row detail</div> }} virtualized style={{ height: 280 }} />;
}

export function startValueFilterRefConsumer(root: Root, profile: "value-filter-ref" | "row-group-ref" | "row-detail-ref" = "value-filter-ref") {
  ownedRows = Array.from({ length: 1000 }, (_, index) => ({ id: `value-ref-${index}`, status: index % 2 ? "Blocked" : "Ready" }));
  dataReference = new WeakRef(ownedRows);
  rowReferences = ownedRows.map(row => new WeakRef(row));
  if (profile === "row-group-ref") groupChanged = createGroupChangeHandler(ownedRows);
  if (profile === "row-detail-ref") detailChanged = createGroupChangeHandler(ownedRows);
  root.render(profile === "row-group-ref" ? <GroupDisclosureRefConsumer /> : profile === "row-detail-ref" ? <RowDetailRefConsumer /> : <ValueFilterRefConsumer />);
  return {
    inspect: () => ({ calls, dataAlive: Boolean(dataReference.deref()), aliveRows: rowReferences.reduce((count, row) => count + Number(Boolean(row.deref())), 0) }),
    unmount() {
      root.unmount();
      // 애플리케이션 소유 참조를 비우고 진단에는 WeakRef만 남긴다.
      ownedRows = null;
      groupChanged = null;
      detailChanged = null;
    },
  };
}
export type ValueFilterRefController = ReturnType<typeof startValueFilterRefConsumer>;
