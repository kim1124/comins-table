import type { DocsCodeSample } from "./types";

export const installSamples: DocsCodeSample[] = [
  {
    code: "npm install comins-table",
    language: "bash",
    title: "설치",
  },
  {
    code: `import { DataTable } from "comins-table";
import "comins-table/styles.css";

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

.table-frame > .comins-table {
  height: 100%;
}`,
    language: "css",
    title: "높이 컨테이너",
  },
];

export const themeSamples: DocsCodeSample[] = [
  {
    code: `import "comins-table/styles.css";

<DataTable
  columns={columns}
  data={rows}
  rowHeight={32}
  theme={{
    className: "comins-table-theme--dark",
    style: {
      "--comins-table-row-height": "32px",
    },
  }}
  virtualized
/>;`,
    language: "tsx",
    title: "Theme class",
  },
  {
    code: `.my-contrast-table {
  --comins-table-accent: #f43f5e;
  --comins-table-accent-foreground: #fff7ed;
  --comins-table-cell-border: #fbbf24;
  --comins-table-header-background: #111827;
  --comins-table-header-border: #f43f5e;
  --comins-table-header-color: #fde68a;
  --comins-table-header-split-border: #fbbf24;
  --comins-table-row-border: #7c2d12;
  --comins-table-row-even-background: #2f0f5f;
  --comins-table-row-odd-background: #fff7ed;
  --comins-table-row-selected-background: #f43f5e;
  font-family: Georgia, "Times New Roman", serif;
}`,
    language: "css",
    title: "CSS override",
  },
];

export const loadingSamples: DocsCodeSample[] = [
  {
    code: `<DataTable
  columns={columns}
  data={isInitialLoading ? [] : rows}
  emptyComponent={<span>표시할 데이터가 없습니다.</span>}
  getRowId={(row) => row.id}
  loading={isInitialLoading || isRefetching}
  loadingComponent={<span>데이터를 갱신하는 중입니다.</span>}
  persistHeaderWhenEmpty
  skeletonRowCount={5}
/>;`,
    language: "tsx",
    title: "Loading / Empty State",
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
    code: `const rows = createVirtualRows(100000);

<DataTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  buffer-size={10}
  pagination={{ pageIndex: 0, pageSize: rows.length }}
  rowHeight={36}
  virtualized
/>;`,
    language: "tsx",
    title: "10만 행 가상 스크롤",
  },
  {
    code: `const rows = createVirtualRows(100000);
const overrides = useState({});

<DataTable
  columns={[
    { field: "name", label: "Column1" },
    { field: "active", label: "Column2", cell: { components: [{ type: "checkbox" }] } },
    { field: "name", label: "Column3", cell: { components: [{ type: "button" }] } },
    { field: "role", label: "Column4", cell: { renderer: ({ row }) => <select defaultValue={row.role}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> } },
    { field: "age", label: "Column5", cell: { components: [{ type: "progress" }] } },
    { field: "name", label: "Column6", cell: { components: [{ type: "virtual-list", items }] } },
    { field: "role", label: "Column7", cell: { components: [{ type: "radio", options }] } },
  ]}
  data={rows}
  getRowId={(_row, index) => index}
  pagination={{ pageIndex: 0, pageSize: rows.length }}
  rowHeight={112}
  virtualized
/>;`,
    language: "tsx",
    title: "컴포넌트 기반 10만 행 가상 스크롤",
  },
];

export const infiniteScrollSamples: DocsCodeSample[] = [
  {
    code: `const [refreshVersion, setRefreshVersion] = useState(0);

const loadRows = useCallback(async ({ offset, limit, signal }) => {
  const params = new URLSearchParams({
    delay: "500",
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  const response = await fetch(\`https://dummyjson.com/users?\${params}\`, { signal });
  const result = await response.json();

  return {
    rows: result.users.map(toPersonRow),
    total: result.total,
  };
}, [refreshVersion]);

const refreshRows = () => setRefreshVersion((current) => current + 1);

<Button onClick={refreshRows}>새로고침</Button>
<DataTable
  columns={columns}
  data={[]}
  getRowId={(row) => row.id}
  lazyLoad
  lazyLoadBatchSize={40}
  lazyLoadThreshold={140}
  onLazyLoad={loadRows}
  pagination={{ pageIndex: 0, pageSize: 240 }}
  virtualized
/>;`,
    language: "tsx",
    title: "Remote infinite scroll",
  },
];

export const lazyLoadSamples: DocsCodeSample[] = [
  {
    code: `const [refreshVersion, setRefreshVersion] = useState(0);

const loadRows = useCallback(async ({ offset, limit, reason, signal }) => {
  const params = new URLSearchParams({
    delay: "700",
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  const response = await fetch(\`https://dummyjson.com/users?\${params}\`, { signal });
  const result = await response.json();

  return {
    rows: result.users.map(toPersonRow),
    total: result.total,
  };
}, [refreshVersion]);

const refreshRows = () => setRefreshVersion((current) => current + 1);

<Button onClick={refreshRows}>새로고침</Button>
<DataTable
  columns={columns}
  data={[]}
  emptyComponent={<span>표시할 데이터가 없습니다.</span>}
  getRowId={(row) => row.id}
  lazyLoad
  lazyLoadBatchSize={30}
  lazyLoadMode="append"
  lazyLoadThreshold={140}
  onLazyLoad={loadRows}
  pagination={{ pageIndex: 0, pageSize: 90 }}
  skeletonRowCount={5}
  virtualized
/>;`,
    language: "tsx",
    title: "DummyJSON Lazy Load",
  },
];

export const paginationSamples: DocsCodeSample[] = [
  {
    code: `const [pageIndex, setPageIndex] = useState(0);
const pageSize = 30;
const pageCount = Math.ceil(rows.length / pageSize);

<Pagination>
  <PaginationButton onClick={() => setPageIndex(0)}>첫 페이지</PaginationButton>
  <PaginationButton onClick={() => setPageIndex((page) => Math.max(0, page - 1))}>이전 페이지</PaginationButton>
  <PaginationButton onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))}>다음 페이지</PaginationButton>
  <PaginationButton onClick={() => setPageIndex(pageCount - 1)}>마지막 페이지</PaginationButton>
</Pagination>
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

export const exportSamples: DocsCodeSample[] = [
  {
    code: `const exportColumns = [
  { id: "name", label: "Column1", value: (row) => row.name },
  { id: "age", label: "Column2", value: (_row, index) => \`Data \${index + 1}\` },
  { id: "role", label: "Column3", value: (row) => row.role },
];

const csv = exportCominsRowsToCsv({ columns: exportColumns, rows });
const json = exportCominsRowsToJson({ columns: exportColumns, rows });`,
    language: "ts",
    title: "CSV / JSON helper",
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

export const refApiSamples: DocsCodeSample[] = [
  {
    code: `type CominsTableRef<TData = unknown> = {
  clearSort: () => void;
  getColumnLayout: () => CominsColumnLayout;
  getSortState: () => CominsSortState | null;
  setColumnLayout: (layout: CominsColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortState: (sort: CominsSortState | null) => void;
};`,
    language: "ts",
    title: "Ref 타입",
  },
  {
    code: `const tableRef = useRef<CominsTableRef<UserRow>>(null);

tableRef.current?.setSelectedRow(0);
tableRef.current?.setSelectedRows([0, 2]);
tableRef.current?.setMoveTargetRow(2, 0);
tableRef.current?.setColumnLayout(savedLayout);
tableRef.current?.clearSort();`,
    language: "tsx",
    title: "Ref 사용",
  },
];
