import type { DocsCodeSample } from "./types";

export const installSamples: DocsCodeSample[] = [
  {
    code: "npm install @kmsf/data-table",
    language: "bash",
    title: "설치",
  },
  {
    code: `import { DataTable } from "@kmsf/data-table";
import "@kmsf/data-table/styles.css";

const columns = [
  { id: "name", field: "name", label: "이름", sort: true },
  { id: "role", field: "role", label: "역할" },
];

const data = [
  { id: 1, name: "Kim", role: "Frontend" },
  { id: 2, name: "Lee", role: "Backend" },
];

export function Example() {
  return <DataTable columns={columns} data={data} />;
}`,
    language: "tsx",
    title: "기본 테이블",
  },
];

export const crudSamples: DocsCodeSample[] = [
  {
    code: `const [rows, setRows] = useState(createExampleRows(100));
const [selection, setSelection] = useState({ rowIndexes: [] });

<DataTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  onChangeSelection={setSelection}
  selection={selection}
/>;`,
    language: "tsx",
    title: "CRUD 상태 연결",
  },
];

export const sizeSamples: DocsCodeSample[] = [
  {
    code: `.table-frame {
  height: 320px;
  min-height: 300px;
}

.table-frame > .kmsf-data-table {
  height: 100%;
}`,
    language: "css",
    title: "높이 컨테이너",
  },
];

export const themeSamples: DocsCodeSample[] = [
  {
    code: `import "@kmsf/data-table/styles.css";

<DataTable
  columns={columns}
  data={rows}
  rowHeight={32}
  theme={{
    className: "kmsf-data-table-theme--dark",
    style: {
      "--kmsf-data-table-row-height": "32px",
    },
  }}
  virtualized
/>;`,
    language: "tsx",
    title: "Theme class",
  },
  {
    code: `.my-contrast-table {
  --kmsf-data-table-accent: #f43f5e;
  --kmsf-data-table-accent-foreground: #fff7ed;
  --kmsf-data-table-cell-border: #fbbf24;
  --kmsf-data-table-header-background: #111827;
  --kmsf-data-table-header-border: #f43f5e;
  --kmsf-data-table-header-color: #fde68a;
  --kmsf-data-table-header-split-border: #fbbf24;
  --kmsf-data-table-row-border: #7c2d12;
  --kmsf-data-table-row-even-background: #2f0f5f;
  --kmsf-data-table-row-odd-background: #fff7ed;
  --kmsf-data-table-row-selected-background: #f43f5e;
  font-family: Georgia, "Times New Roman", serif;
}`,
    language: "css",
    title: "CSS override",
  },
];

export const headerSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  { id: "name", field: "name", label: "이름", sort: true },
  { id: "role", field: "role", label: "역할" },
  { id: "team", field: "team", label: "팀" },
];

const layout = tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(layout);`,
    language: "tsx",
    title: "Header 이동과 저장",
  },
];

export const headerGroupSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  { id: "name", field: "name", label: "이름" },
  { id: "role", field: "role", label: "역할" },
  { id: "team", field: "team", label: "팀" },
];

const columnGroups = [
  {
    id: "member",
    label: "구성원",
    children: ["name", "role", "team"],
  },
];

<DataTable columns={columns} columnGroups={columnGroups} data={rows} />;`,
    language: "tsx",
    title: "2중 Header",
  },
];

export const bodySamples: DocsCodeSample[] = [
  {
    code: `const rows = createVirtualRows(100_000);

<DataTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  pagination={{ pageIndex: 0, pageSize: rows.length }}
  virtualized
/>;`,
    language: "tsx",
    title: "10만 행 가상 스크롤",
  },
];

export const paginationSamples: DocsCodeSample[] = [
  {
    code: `const [pageIndex, setPageIndex] = useState(0);
const pageSize = 30;

<DataTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  pagination={{ pageIndex, pageSize }}
/>;`,
    language: "tsx",
    title: "외부 pagination 상태",
  },
];

export const cellSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  {
    id: "status",
    field: "status",
    label: "상태",
    cell: {
      renderer: ({ value }) => <strong className="status-badge">{value}</strong>,
      props: {
        className: ({ value }) =>
          value === "Owner" ? "cell-role-owner" : "cell-role-muted",
      },
    },
  },
];`,
    language: "tsx",
    title: "Cell renderer",
  },
];

export const componentSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  {
    id: "done",
    field: "done",
    label: "완료",
    cell: {
      components: [{ type: "checkbox", checkedField: "done" }],
    },
  },
];`,
    language: "tsx",
    title: "내장 컴포넌트",
  },
];

export const rowSamples: DocsCodeSample[] = [
  {
    code: `<DataTable
  columns={columns}
  data={rows}
  rowProps={{
    className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
    disabled: (row) => row.locked === true,
    draggable: (row) => row.locked !== true,
    style: (row) => (row.active ? { background: "#2f0f5f" } : undefined),
  }}
/>;`,
    language: "tsx",
    title: "Row props",
  },
];

export const contextMenuSamples: DocsCodeSample[] = [
  {
    code: `<DataTable
  columns={columns}
  data={rows}
  onContextMenuRow={({ event, row }) => {
    event.preventDefault();
    openMenu(row);
  }}
  onContextMenuCell={({ column, row }) => {
    setTarget({ column, row });
  }}
/>;`,
    language: "tsx",
    title: "Context menu payload",
  },
];

export const apiSamples: DocsCodeSample[] = [
  {
    code: `type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  onChangeData?: (nextData: T[]) => void;
  virtualized?: boolean;
};`,
    language: "ts",
    title: "주요 Props",
  },
];
