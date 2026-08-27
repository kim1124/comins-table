import type { DocsCodeSample } from "./types";
import type { PlaygroundLocale } from "../i18n/types";
import { defineLocalizedText, resolveLocalizedText } from "../i18n/playground-locale";

const codeSampleTitles = {
  "100000-row component virtualization": defineLocalizedText("100000행 컴포넌트 가상화", "100000-row component virtualization"),
  "100000-row virtualization": defineLocalizedText("100000행 가상화", "100000-row virtualization"),
  "Basic table": defineLocalizedText("기본 테이블", "Basic table"),
  "Built-in components": defineLocalizedText("내장 컴포넌트", "Built-in components"),
  "CSV / JSON helper": defineLocalizedText("CSV / JSON 헬퍼", "CSV / JSON helper"),
  "Cell renderer": defineLocalizedText("Cell 렌더러", "Cell renderer"),
  "Context menu payload": defineLocalizedText("Context Menu payload", "Context menu payload"),
  "Controlled CRUD state": defineLocalizedText("Controlled CRUD 상태", "Controlled CRUD state"),
  "Controlled Flat Table ref usage": defineLocalizedText("Controlled Flat Table ref 사용", "Controlled Flat Table ref usage"),
  "Controlled Row Expand": defineLocalizedText("Controlled Row Expand", "Controlled Row Expand"),
  "Controlled Row Grouping": defineLocalizedText("Controlled Row Grouping", "Controlled Row Grouping"),
  "Controlled Tree Grid": defineLocalizedText("Controlled Tree Grid", "Controlled Tree Grid"),
  "Controlled remote infinite scroll": defineLocalizedText("Controlled 원격 Infinite Scroll", "Controlled remote infinite scroll"),
  "Controlled selection and clipboard": defineLocalizedText("Controlled 선택과 Clipboard", "Controlled selection and clipboard"),
  "Core props": defineLocalizedText("Core props", "Core props"),
  "CSS override": defineLocalizedText("CSS 재정의", "CSS override"),
  "DummyJSON Lazy Load": defineLocalizedText("DummyJSON Lazy Load", "DummyJSON Lazy Load"),
  "External pagination state": defineLocalizedText("외부 Pagination 상태", "External pagination state"),
  "Header move and persistence": defineLocalizedText("Header 이동과 저장", "Header move and persistence"),
  "Height container": defineLocalizedText("높이 컨테이너", "Height container"),
  "Install": defineLocalizedText("설치", "Install"),
  "Loading / Empty State": defineLocalizedText("Loading / Empty 상태", "Loading / Empty State"),
  "Ref type": defineLocalizedText("Ref 타입", "Ref type"),
  "Row props": defineLocalizedText("Row props", "Row props"),
  "Shift-assisted multi-column sort": defineLocalizedText("Shift 다중 Column 정렬", "Shift-assisted multi-column sort"),
  "Summary Row configuration": defineLocalizedText("Summary Row 설정", "Summary Row configuration"),
  "Theme class": defineLocalizedText("Theme class", "Theme class"),
  "Tree expansion ref": defineLocalizedText("Tree 펼침 ref", "Tree expansion ref"),
  "Two-level header": defineLocalizedText("2단계 Header", "Two-level header"),
} as const;

export function localizeDocsCodeSamples(samples: DocsCodeSample[], locale: PlaygroundLocale): DocsCodeSample[] {
  return samples.map((sample) => {
    const localizedTitle = codeSampleTitles[sample.title as keyof typeof codeSampleTitles];
    if (!localizedTitle) {
      throw new Error(`playground-localization: missing code sample title for ${sample.title}`);
    }

    return { ...sample, title: resolveLocalizedText(localizedTitle, locale) };
  });
}

export const installSamples: DocsCodeSample[] = [
  {
    code: "npm install comins-table",
    language: "bash",
    title: "Install",
  },
  {
    code: `import { CominsTable } from "comins-table";
import "comins-table/styles.css";

const columns = [
  { id: "name", field: "name", label: "Name", sort: true },
  { id: "role", field: "role", label: "Role" },
];

const data = [
  { id: 1, name: "Kim", role: "Frontend" },
  { id: 2, name: "Lee", role: "Backend" },
];

export function Example() {
  return <CominsTable columns={columns} data={data} />;
}`,
    language: "tsx",
    title: "Basic table",
  },
];

export const crudSamples: DocsCodeSample[] = [
  {
    code: `const [rows, setRows] = useState(createExampleRows(100));
const [selection, setSelection] = useState({ rowIndexes: [] });

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  onChangeSelection={setSelection}
  selection={selection}
/>;`,
    language: "tsx",
    title: "Controlled CRUD state",
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
    title: "Height container",
  },
];

export const themeSamples: DocsCodeSample[] = [
  {
    code: `import "comins-table/styles.css";

<CominsTable
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
    code: `const [rows, setRows] = useState<PersonRow[]>([]);
const [loadingMode, setLoadingMode] = useState<"initial" | "ready" | "refetch">("initial");

async function loadRows(mode: "initial" | "ready" | "refetch", empty = false) {
  setLoadingMode(mode);
  if (mode === "initial") setRows([]);

  const response = await fetch(
    \`/api/users?limit=30&skip=\${empty ? 10000 : 0}\`,
  );
  const result = await response.json();
  setRows(result.users.map(toPersonRow));
  setLoadingMode("ready");
}

<CominsTable
  columns={columns}
  data={rows}
  emptyComponent={<span>No rows to display.</span>}
  getRowId={(row) => row.id}
  loading={loadingMode === "initial" || loadingMode === "refetch"}
  loadingComponent={<span>Refreshing rows.</span>}
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
  { id: "name", field: "name", label: "Name", sort: true },
  { id: "role", field: "role", label: "Role" },
  { id: "team", field: "team", label: "Team" },
];

const layout = tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(layout);`,
    language: "tsx",
    title: "Header move and persistence",
  },
  {
    code: `const [sortModel, setSortModel] = useState<CominsSortModel>([]);

<CominsTable
  columns={columns}
  data={rows}
  multiSort
  onChangeSortModel={setSortModel}
  ref={tableRef}
/>;

tableRef.current?.setSortModel([
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);`,
    language: "tsx",
    title: "Shift-assisted multi-column sort",
  },
];

export const headerGroupSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  { id: "name", field: "name", label: "Name" },
  { id: "role", field: "role", label: "Role" },
  { id: "team", field: "team", label: "Team" },
];

const columnGroups = [
  {
    id: "member",
    label: "Member",
    children: ["name", "role", "team"],
  },
];

<CominsTable columns={columns} columnGroups={columnGroups} data={rows} />;`,
    language: "tsx",
    title: "Two-level header",
  },
];

export const bodySamples: DocsCodeSample[] = [
  {
    code: `const rows = createVirtualRows(100000);

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  buffer-size={10}
  pagination={{ pageIndex: 0, pageSize: rows.length }}
  rowHeight={36}
  virtualized
/>;`,
    language: "tsx",
    title: "100000-row virtualization",
  },
  {
    code: `const rows = createVirtualRows(100000);
const overrides = useState({});

<CominsTable
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
    title: "100000-row component virtualization",
  },
];

export const infiniteScrollSamples: DocsCodeSample[] = [
  {
    code: `const [rows, setRows] = useState<PersonRow[]>([]);
const [total, setTotal] = useState(0);
const [initialLoading, setInitialLoading] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [refreshVersion, setRefreshVersion] = useState(0);
const pendingRequestRef = useRef(false);
const activeRequestRef = useRef<AbortController | null>(null);

const fetchBatch = async (offset: number, signal: AbortSignal) => {
  const params = new URLSearchParams({
    limit: "40",
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  const response = await fetch(\`https://dummyjson.com/users?\${params}\`, { signal });
  const result = await response.json();

  return { rows: result.users.map(toPersonRow), total: result.total };
};

const replaceRows = useCallback(async () => {
  activeRequestRef.current?.abort();
  const controller = new AbortController();
  activeRequestRef.current = controller;
  pendingRequestRef.current = true;
  setInitialLoading(true);

  try {
    const result = await fetchBatch(0, controller.signal);
    if (!controller.signal.aborted) {
      setRows(result.rows);
      setTotal(result.total);
    }
  } finally {
    if (activeRequestRef.current === controller) {
      activeRequestRef.current = null;
      pendingRequestRef.current = false;
      setInitialLoading(false);
    }
  }
}, []);

useEffect(() => {
  void replaceRows();
  return () => activeRequestRef.current?.abort();
}, [replaceRows, refreshVersion]);

const appendRows = useCallback(async () => {
  if (pendingRequestRef.current || rows.length >= total) return;

  const controller = new AbortController();
  activeRequestRef.current = controller;
  pendingRequestRef.current = true;
  setLoadingMore(true);

  try {
    const result = await fetchBatch(rows.length, controller.signal);
    setRows((current) => [...current, ...result.rows]);
    setTotal(result.total);
  } finally {
    if (activeRequestRef.current === controller) {
      activeRequestRef.current = null;
      pendingRequestRef.current = false;
      setLoadingMore(false);
    }
  }
}, [rows.length, total]);

<>
  <button onClick={() => setRefreshVersion((current) => current + 1)}>Refresh</button>
  <CominsTable
    key={refreshVersion}
    columns={columns}
    data={rows}
    getRowId={(row) => row.id}
    hasMoreRows={rows.length < total}
    infiniteScroll
    infiniteScrollThreshold={140}
    loading={initialLoading}
    loadingMore={loadingMore}
    onLoadMore={() => void appendRows()}
    pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, 40) }}
    virtualized
  />
</>;`,
    language: "tsx",
    title: "Controlled remote infinite scroll",
  },
];

export const lazyLoadSamples: DocsCodeSample[] = [
  {
    code: `const [rows, setRows] = useState<PersonRow[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);

const loadRows = useCallback(async ({ offset, limit, reason, signal }) => {
  reason === "scroll" ? setLoadingMore(true) : setLoading(true);
  const params = new URLSearchParams({
    delay: "700",
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  try {
    const response = await fetch(\`https://dummyjson.com/users?\${params}\`, { signal });
    const result = await response.json();
    const nextRows = result.users.map(toPersonRow);
    setRows((current) => reason === "scroll" ? [...current, ...nextRows] : nextRows);
    setTotal(result.total);
  } finally {
    reason === "scroll" ? setLoadingMore(false) : setLoading(false);
  }
}, []);

const refreshRows = () => {
  const controller = new AbortController();
  setRows([]);
  setTotal(0);
  void loadRows({ limit: 30, offset: 0, reason: "refresh", signal: controller.signal });
};

<Button onClick={refreshRows}>Refresh</Button>
<CominsTable
  columns={columns}
  data={rows}
  emptyComponent={<span>No rows to display.</span>}
  getRowId={(row) => row.id}
  hasMoreRows={rows.length < total}
  lazyLoad
  lazyLoadBatchSize={30}
  lazyLoadMode="append"
  lazyLoadThreshold={140}
  loading={loading}
  loadingMore={loadingMore}
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
  <PaginationButton onClick={() => setPageIndex(0)}>First page</PaginationButton>
  <PaginationButton onClick={() => setPageIndex((page) => Math.max(0, page - 1))}>Previous page</PaginationButton>
  <PaginationButton onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))}>Next page</PaginationButton>
  <PaginationButton onClick={() => setPageIndex(pageCount - 1)}>Last page</PaginationButton>
</Pagination>
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  pagination={{ pageIndex, pageSize }}
/>;`,
    language: "tsx",
    title: "External pagination state",
  },
];

export const cellSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  {
    id: "status",
    field: "status",
    label: "Status",
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

export const selectionClipboardSamples: DocsCodeSample[] = [
  {
    code: `const [rows, setRows] = useState(initialRows);
const [selection, setSelection] = useState<CominsSelectionState>({
  cell: null,
  range: null,
  rowIds: [],
});

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age" },
  {
    field: "locked",
    label: "Protected",
    cell: { props: { copyable: false, pasteable: false } },
  },
];

<CominsTable
  cellSelection
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  onChangeSelection={setSelection}
/>;

<pre>{JSON.stringify(selection, null, 2)}</pre>;`,
    language: "tsx",
    title: "Controlled selection and clipboard",
  },
];

export const componentSamples: DocsCodeSample[] = [
  {
    code: `const columns = [
  {
    id: "done",
    field: "done",
    label: "Done",
    cell: {
      components: [{ type: "checkbox", checkedField: "done" }],
    },
  },
];`,
    language: "tsx",
    title: "Built-in components",
  },
];

export const rowSamples: DocsCodeSample[] = [
  {
    code: `<CominsTable
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

export const rowExpandSamples: DocsCodeSample[] = [
  {
    code: `const [expandedRowIds, setExpandedRowIds] = useState<readonly string[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  expandedRowIds={expandedRowIds}
  getRowDetailHeight={({ row }) => (row.id === "large" ? 480 : "auto")}
  getRowId={(row) => row.id}
  onChangeExpandedRowIds={setExpandedRowIds}
  renderRowDetail={({ row }) => <Detail row={row.data} />}
/>;`,
    language: "tsx",
    title: "Controlled Row Expand",
  },
];

export const rowGroupingSamples: DocsCodeSample[] = [
  {
    code: `const [groups, setGroups] = useState([
  { id: "east", label: "East" },
  { id: "empty", label: "Empty" },
  { id: "west", label: "West" },
]);
const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  multiSort
  onChangeData={setRows}
  rowGrouping={{
    aggregations: { amount: "sum", id: "count" },
    expandedGroupIds,
    getGroupId: (group) => group.id,
    getGroupLabel: (group) => group.label,
    getGroupRowProps: ({ isEmpty }) => ({
      className: isEmpty ? "empty-group-row" : undefined,
      style: {
        "--comins-table-group-row-background": isEmpty ? "#e2e8f0" : "#d1d5db",
      } as React.CSSProperties,
    }),
    getRowGroupId: (row) => row.groupId,
    groupDraggable: true,
    groups,
    onChangeExpandedGroupIds: setExpandedGroupIds,
    onChangeGroups: setGroups,
    setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
  }}
  rowProps={{ draggable: true }}
  virtualized
/>;`,
    language: "tsx",
    title: "Controlled Row Grouping",
  },
];

export const summaryRowSamples: DocsCodeSample[] = [
  {
    code: `<CominsTable
  columns={columns}
  data={rows}
  summary={{
    className: "summary-row",
    columns: {
      item: { aggregate: "count", colSpan: 2 },
      amount: {
        aggregate: "sum",
        className: "summary-amount",
        format: ({ value }) => \`₩\${Number(value).toLocaleString()}\`,
      },
    },
  }}
/>;`,
    language: "tsx",
    title: "Summary Row configuration",
  },
];

export const treeGridSamples: DocsCodeSample[] = [
  {
    code: `const tableRef = useRef<CominsTableRef<PersonRow>>(null);
const [data, setData] = useState([
  {
    item: { id: "engineering", name: "Engineering", age: 60, role: "Owner" },
    expand: false,
    children: [
      { item: { id: "platform", name: "Platform Team", age: 32, role: "Editor" } },
    ],
  },
]);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={data}
  defaultExpandAll
  getRowId={(item) => item.id}
  onChangeData={setData}
  summary={{ columns: { age: "sum" } }}
  tree
  virtualized
/>;`,
    language: "tsx",
    title: "Controlled Tree Grid",
  },
  {
    code: `tableRef.current?.expand(["engineering", "platform"]);
tableRef.current?.fold(["platform"]);
tableRef.current?.expand();
tableRef.current?.fold();`,
    language: "tsx",
    title: "Tree expansion ref",
  },
];

export const contextMenuSamples: DocsCodeSample[] = [
  {
    code: `<CominsTable
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
    code: `type CominsTableProps<T> = {
  columns: CominsTableColumn<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  onChangeData?: (nextData: T[]) => void;
  virtualized?: boolean;
};`,
    language: "ts",
    title: "Core props",
  },
];

export const refApiSamples: DocsCodeSample[] = [
  {
    code: `type CominsTableRef<TData = unknown> = {
  clearSort: () => void;
  expand: (nodeIds?: readonly CominsRowId[]) => void;
  fold: (nodeIds?: readonly CominsRowId[]) => void;
  getColumnLayout: () => CominsColumnLayout;
  getSortModel: () => CominsSortModel;
  getSortState: () => CominsSortState | null;
  setColumnLayout: (layout: CominsColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortModel: (sortModel: CominsSortModel) => void;
  setSortState: (sort: CominsSortState | null) => void;
};`,
    language: "ts",
    title: "Ref type",
  },
  {
    code: `const tableRef = useRef<CominsTableRef<UserRow>>(null);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  onChangeSelection={setSelection}
  onChangeSortModel={setSortModel}
/>;

tableRef.current?.setSelectedRow(0);
tableRef.current?.setSelectedRows([0, 2]);
tableRef.current?.setMoveTargetRow(2, 0);
tableRef.current?.setSortModel([
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);
tableRef.current?.clearSort();

const savedLayout = tableRef.current?.getColumnLayout();
if (savedLayout) {
  tableRef.current?.setColumnLayout(savedLayout);
}`,
    language: "tsx",
    title: "Controlled Flat Table ref usage",
  },
];
