import { useState } from "react";
import { CominsTable, type CominsRowId, type CominsTableColumn } from "../../../src";

type Group = { id: string; label: string };
type Row = { amount: number; groupId: string; id: string; name: string };

const initialRows: Row[] = [{ amount: 10, groupId: "east", id: "a", name: "Alpha" }];
const columns: Array<CominsTableColumn<Row>> = [
  { field: "name", label: "Name" },
  { field: "amount", label: "Amount" },
];

export function RowGroupingDocumentationExample() {
  const [groups, setGroups] = useState<Group[]>([
    { id: "east", label: "East" },
    { id: "empty", label: "Empty" },
  ]);
  const [rows, setRows] = useState(initialRows);
  const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>([]);

  return (
    <CominsTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      onChangeData={setRows}
      rowGrouping={{
        expandedGroupIds,
        getGroupId: (group) => group.id,
        getGroupLabel: (group) => group.label,
        getRowGroupId: (row) => row.groupId,
        groupDraggable: true,
        groups,
        onChangeExpandedGroupIds: setExpandedGroupIds,
        onChangeGroups: setGroups,
        setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
      }}
      rowProps={{ draggable: true }}
    />
  );
}
