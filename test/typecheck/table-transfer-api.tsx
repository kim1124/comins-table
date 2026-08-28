import {
  CominsTable,
  createCominsTableTransferCoordinator,
  transferCominsGroupBetweenTables,
  transferCominsRowBetweenTables,
  type CominsRowGroupingConfig,
  type CominsTableTransferEndpoint,
  type CominsTableTransferIntent,
} from "../../src";

type Row = {
  groupId: string;
  id: string;
  name: string;
};

type Group = {
  id: string;
  label: string;
};

const columns = [{ field: "name", label: "Name" }];
const rows: Row[] = [{ groupId: "a", id: "1", name: "One" }];
const groups: Group[] = [{ id: "a", label: "A" }];
const flatCoordinator = createCominsTableTransferCoordinator<Row>({
  onTransfer: (result) => {
    result.kind satisfies "group" | "row";
    result.source.data satisfies Row[];
    result.source.groups satisfies never[] | undefined;
  },
  onTransferRejected: (rejection) => {
    rejection.reason satisfies "duplicate-id";
    rejection.conflict.kind satisfies "group" | "row";
  },
});
const groupedCoordinator = createCominsTableTransferCoordinator<Row, Group>({
  onTransfer: (result) => {
    result.target.data satisfies Row[];
    result.target.groups satisfies Group[] | undefined;
  },
});
const grouping = {
  getGroupId: (group: Group) => group.id,
  getRowGroupId: (row: Row) => row.groupId,
  groupDraggable: true,
  groups,
  setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
} satisfies CominsRowGroupingConfig<Row, Group>;

void (
  <CominsTable
    columns={columns}
    data={rows}
    getRowId={(row) => row.id}
    rowProps={{ draggable: true }}
    tableTransfer={{
      canTransfer: (intent) => intent.kind === "row" && intent.row.id.length > 0,
      coordinator: flatCoordinator,
      rejectionFeedback: {
        duration: 1800,
        renderTooltip: (rejection) => <span>{rejection.reason}</span>,
      },
      resolveConflict: (conflict) => conflict.kind === "row" ? "overwrite" : "reject",
      scope: "people",
      tableId: "flat-a",
    }}
  />
);

void (
  <CominsTable
    columns={columns}
    data={rows}
    getRowId={(row) => row.id}
    rowGrouping={grouping}
    tableTransfer={{
      canTransfer: (intent: CominsTableTransferIntent<Row, Group>) =>
        intent.kind === "group" ? intent.group.label.length > 0 : true,
      coordinator: groupedCoordinator,
      scope: "people",
      tableId: "group-a",
    }}
  />
);

const flatSource: CominsTableTransferEndpoint<Row> = {
  data: rows,
  getRowId: (row) => row.id,
  tableId: "flat-a",
};
const flatTarget: CominsTableTransferEndpoint<Row> = {
  data: [],
  getRowId: (row) => row.id,
  tableId: "flat-b",
};

transferCominsRowBetweenTables({
  source: flatSource,
  sourceRowId: "1",
  target: flatTarget,
});

const groupedSource: CominsTableTransferEndpoint<Row, Group> = {
  data: rows,
  getGroupId: (group) => group.id,
  getRowGroupId: (row) => row.groupId,
  getRowId: (row) => row.id,
  groups,
  setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
  tableId: "group-a",
};
const groupedTarget = { ...groupedSource, data: [], tableId: "group-b" };

transferCominsGroupBetweenTables({
  source: groupedSource,
  sourceGroupId: "a",
  target: groupedTarget,
});

// @ts-expect-error Transfer cannot be combined with infinite loading.
void <CominsTable columns={columns} data={rows} infiniteScroll onLoadMore={() => undefined} tableTransfer={{ coordinator: flatCoordinator, scope: "people", tableId: "flat-a" }} />;

// @ts-expect-error Filtered Tables cannot participate in Transfer.
void <CominsTable columnFiltering={{ model: [] }} columns={columns} data={rows} tableTransfer={{ coordinator: flatCoordinator, scope: "people", tableId: "flat-a" }} />;

// @ts-expect-error Tree Tables cannot participate in Transfer.
void <CominsTable columns={columns} data={[]} getRowId={(row: Row) => row.id} tableTransfer={{ coordinator: flatCoordinator, scope: "people", tableId: "flat-a" }} tree />;

// @ts-expect-error A grouped Table requires a Coordinator with the same Group type.
void <CominsTable columns={columns} data={rows} rowGrouping={grouping} tableTransfer={{ coordinator: flatCoordinator, scope: "people", tableId: "group-a" }} />;
