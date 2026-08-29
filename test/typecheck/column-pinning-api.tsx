import {
  CominsTable,
  applyCominsColumnLayout,
  createCominsTableState,
  serializeCominsColumnLayout,
  type CominsColumnLayout,
  type CominsColumnPinned,
  type CominsTableColumn,
  type CominsTableColumnGroup,
} from "../../src";

type Row = {
  id: string;
  name: string;
};

const left = "left" satisfies CominsColumnPinned;
const columns = [
  { field: "name", label: "Name", pinned: left },
  { field: "id", label: "ID", pinned: "right" },
] satisfies Array<CominsTableColumn<Row>>;
const groups = [
  { children: ["name"], id: "identity", label: "Identity", pinned: "left" },
] satisfies CominsTableColumnGroup[];
const oldLayout = {
  columns: { name: { hidden: false, width: 160 } },
  order: ["name", "id"],
} satisfies CominsColumnLayout;
const pinnedLayout = {
  columns: {
    id: { pinned: "right" },
    name: { pinned: "left" },
  },
  groups: { identity: { pinned: "left" } },
  order: ["name", "id"],
} satisfies CominsColumnLayout;
const state = createCominsTableState<Row>({ columns, columnGroups: groups, rows: [] });

applyCominsColumnLayout(state, oldLayout);
applyCominsColumnLayout(state, pinnedLayout);
serializeCominsColumnLayout(state).columns.name?.pinned satisfies CominsColumnPinned | undefined;

void <CominsTable columnGroups={groups} columns={columns} data={[]} />;

const invalidColumn: CominsTableColumn<Row> = {
  field: "name",
  label: "Name",
  // @ts-expect-error Only left and right are supported pin values.
  pinned: "center",
};

void invalidColumn;

const invalidGroup: CominsTableColumnGroup = {
  children: ["name"],
  id: "identity",
  label: "Identity",
  // @ts-expect-error Only left and right are supported pin values.
  pinned: "start",
};

void invalidGroup;
