import { BasicCrudFeature } from "./BasicCrudFeature";
import { BasicFeature } from "./BasicFeature";
import { BodyFeature } from "./BodyFeature";
import { CellFeature } from "./CellFeature";
import { ColumnGroupFeature } from "./ColumnGroupFeature";
import { ComponentFeature } from "./ComponentFeature";
import { ContextMenuFeature } from "./ContextMenuFeature";
import { ExportFeature } from "./ExportFeature";
import { HeaderFeature } from "./HeaderFeature";
import { InfiniteScrollFeature } from "./InfiniteScrollFeature";
import { LazyLoadFeature } from "./LazyLoadFeature";
import { LoadingStateFeature } from "./LoadingStateFeature";
import { PaginationFeature } from "./PaginationFeature";
import { RowFeature } from "./RowFeature";
import { SizeFeature } from "./SizeFeature";
import { ThemeFeature } from "./ThemeFeature";
import type { FeatureDefinition, FeatureId } from "./types";

export const featureRegistry: FeatureDefinition[] = [
  {
    Component: BasicFeature,
    description: "Basic Comins Table example page.",
    id: "basic",
    label: "Basic",
    options: [
      { description: "Column definitions rendered by the table.", example: "[{ label: 'Name', field: 'name' }]", name: "columns" },
      { description: "Row array rendered by the table.", example: "createExampleRows(100)", name: "data" },
      { description: "Stable row id resolver.", example: "(row) => row.id", name: "getRowId" },
      { description: "Data change callback connected to external useState.", example: "onChangeData={setRows}", name: "onChangeData" },
      { description: "Table density and base styling.", example: "{ density: 'compact' }", name: "theme" },
    ],
    summary: "Basic data, columns, getRowId, and theme example.",
  },
  {
    Component: BasicCrudFeature,
    description: "Example page for add, update, delete, and query actions around the selected row.",
    id: "basic-crud",
    label: "CRUD",
    options: [
      { description: "Source array for row add, update, and delete actions.", example: "useState(createExampleRows(100))", name: "data" },
      { description: "Selection state change callback.", example: "onChangeSelection={syncSelection}", name: "onChangeSelection" },
      { description: "Marks the clicked row as the update target.", example: "onClickRow={({ row }) => ...}", name: "onClickRow" },
    ],
    summary: "Add, update, delete, reset, and query example around the selected row.",
  },
  {
    Component: SizeFeature,
    description: "Example page for manual table height and parent-sized table containers.",
    id: "size",
    label: "Sizing",
    options: [
      { description: "Container with manually assigned height.", example: "height: 320px", name: "manual height" },
      { description: "Table that follows the parent element size.", example: "height: 100%", name: "parent size" },
    ],
    summary: "Manual height and parent container sizing example.",
  },
  {
    Component: ThemeFeature,
    description: "Example page for switching table styling with CSS variables and theme classes.",
    id: "theme",
    label: "Theme",
    options: [
      { description: "Sample theme class included in the distributed CSS.", example: "comins-table-theme--skyblue", name: "theme.className" },
      { description: "CSS variable override.", example: "{ '--comins-table-header-split-border': '#278aa7' }", name: "theme.style" },
      { description: "Row height value used by virtualization calculations.", example: "rowHeight={32}", name: "rowHeight" },
    ],
    summary: "Basic, Dark, Skyblue, Mint, Gray, Orange sample themes and rowHeight contract example.",
  },
  {
    Component: LoadingStateFeature,
    description: "Example page for initial loading, refetch loading, empty data, header, and body states.",
    id: "loading",
    label: "Loading / Empty State",
    options: [
      { description: "State that distinguishes initial loading from refetch loading.", example: "loading={isLoading}", name: "loading" },
      { description: "Number of skeleton rows rendered during initial loading.", example: "skeletonRowCount={5}", name: "skeletonRowCount" },
      { description: "Fallback rendered when there is no data.", example: "emptyComponent={<Empty />}", name: "emptyComponent" },
      { description: "Overlay rendered over existing rows.", example: "loadingComponent={<Spinner />}", name: "loadingComponent" },
    ],
    summary: "Initial skeleton, refetch overlay, empty state, and header persistence example.",
  },
  {
    Component: HeaderFeature,
    description: "Example page for header formatting, sorting, styling, classes, and layout persistence.",
    id: "header",
    label: "Header Basics",
    options: [
      { description: "Column definitions for header label, sorting, and formatting.", example: "{ label, field, sort }", name: "columns" },
      { description: "Controls whether headers are rendered.", example: "showHeader={showHeader}", name: "showHeader" },
      { description: "Saves column order and width.", example: "getColumnLayout()", name: "getColumnLayout" },
      { description: "Restores or resets column order and width.", example: "setColumnLayout(layout)", name: "setColumnLayout" },
      { description: "Callback for column resize and reorder state changes.", example: "onChangeColumnLayout={setColumnLayout}", name: "onChangeColumnLayout" },
    ],
    summary: "Header basics, hide/show behavior, and column layout persistence example.",
  },
  {
    Component: ColumnGroupFeature,
    description: "Example page for two-level header groups, parent movement, parent resize, and child column visibility.",
    id: "column-groups",
    label: "Header Groups",
    options: [
      { description: "Connects parent headers to child column ids.", example: "columnGroups=[{ children: [...] }]", name: "columnGroups" },
      { description: "Keeps child width ratios when resizing the parent header.", example: "resize group header", name: "group resize" },
      { description: "Moves child columns together when dragging the parent header.", example: "drag group header", name: "group reorder" },
      { description: "Removes child columns from the columns prop.", example: "columns.filter(...)", name: "child visibility" },
    ],
    summary: "Two-level header groups, parent movement, parent resize, and child column visibility example.",
  },
  {
    Component: PaginationFeature,
    description: "Example page for controlling pageIndex and pageSize through the pagination prop.",
    id: "pagination",
    label: "Pagination",
    options: [
      { description: "Current page index and page size.", example: "{ pageIndex, pageSize }", name: "pagination" },
      { description: "External page movement buttons.", example: "setPageIndex(next)", name: "pagination controls" },
      { description: "Stable row ids across page movement.", example: "getRowId={(row) => row.id}", name: "getRowId" },
    ],
    summary: "pageIndex, pageSize, and external page control example for regular datasets.",
  },
  {
    Component: BodyFeature,
    description: "Example page for large datasets and virtualized body rendering.",
    id: "body",
    label: "Virtualization",
    options: [
      { description: "Enables virtual scrolling.", example: "virtualized", name: "virtualized" },
      { description: "Large row array.", example: "createRows(100_000)", name: "data" },
      { description: "Page size that includes the full row set.", example: "{ pageSize: rows.length }", name: "pagination" },
    ],
    summary: "Virtual scrolling example against 100000 rows.",
  },
  {
    Component: InfiniteScrollFeature,
    description: "Example page that appends offset/limit batches from a remote API when scroll nears the bottom.",
    id: "infinite-scroll",
    label: "Infinite Scroll",
    options: [
      { description: "Enables append-mode lazy loading.", example: "lazyLoad", name: "lazyLoad" },
      { description: "Remote API batch size.", example: "lazyLoadBatchSize={40}", name: "lazyLoadBatchSize" },
      { description: "Distance from the bottom that triggers loading.", example: "lazyLoadThreshold={140}", name: "lazyLoadThreshold" },
      { description: "Calls the remote API with offset, limit, and signal.", example: "onLazyLoad={fetchRows}", name: "onLazyLoad" },
    ],
    summary: "Infinite scroll example that appends remote API batches.",
  },
  {
    Component: LazyLoadFeature,
    description: "Example page that fetches offset/limit row batches from a remote datasource through onLazyLoad.",
    id: "lazy-load",
    label: "Lazy Load",
    options: [
      { description: "Enables append-mode lazy loading.", example: "lazyLoad", name: "lazyLoad" },
      { description: "Number of rows fetched per request.", example: "lazyLoadBatchSize={30}", name: "lazyLoadBatchSize" },
      { description: "Distance from the bottom that triggers loading.", example: "lazyLoadThreshold={140}", name: "lazyLoadThreshold" },
      { description: "The currently supported append mode.", example: 'lazyLoadMode="append"', name: "lazyLoadMode" },
      { description: "Receives offset, limit, and signal, then returns rows and total.", example: "onLazyLoad={fetchRows}", name: "onLazyLoad" },
    ],
    summary: "Append-mode lazy-load example connected to a DummyJSON-style remote API.",
  },
  {
    Component: CellFeature,
    description: "Example page for cell formatting, events, styles, renderers, and context menus.",
    id: "cell",
    label: "Cells",
    options: [
      { description: "Cell custom renderer", example: "cell.renderer={({ row, value }) => ...}", name: "cell.renderer" },
      { description: "Checks the cell click payload.", example: "onClickCell={({ row, column }) => ...}", name: "onClickCell" },
      { description: "Cell context menu callback", example: "onContextMenuCell={...}", name: "onContextMenuCell" },
      { description: "Column-level className, style, copy, and paste options.", example: "columns[].cell.props", name: "cell.props" },
    ],
    summary: "Cell formatting, styling, events, and context menu example.",
  },
  {
    Component: ComponentFeature,
    description: "Example page for built-in components and custom renderers in headers and cells.",
    id: "component",
    label: "Components",
    options: [
      { description: "Lightweight components rendered inside a header.", example: "header.components=[{ type:'button' }]", name: "header.components" },
      { description: "Lightweight components rendered inside a cell.", example: "cell.components=[{ type:'checkbox' }]", name: "cell.components" },
      { description: "Popover menu dedicated to headers.", example: "header.components=[{ type:'menu', items }]", name: "header menu" },
      { description: "Multi-item virtual list inside a cell.", example: "cell.components=[{ type:'virtual-list', items }]", name: "cell virtual-list" },
      { description: "Custom React renderer.", example: "header.renderer / cell.renderer", name: "renderer" },
      { description: "Input commits the next value on Enter or Blur.", example: "onValueChange -> setRows(next)", name: "input commit" },
      { description: "Virtual List preview, More expansion, and Search filtering.", example: "{ limit: 5, more, searchable }", name: "virtual-list UX" },
    ],
    summary: "Button, Input, Checkbox, Radio, Select, Toggle, Progress, Header Menu, Cell Virtual List, and custom renderer example.",
  },
  {
    Component: RowFeature,
    description: "Example page for row styling, events, drag movement, disabled state, and customization.",
    id: "row",
    label: "Rows",
    options: [
      { description: "Row click, double click, context menu callback", example: "onClickRow / onDoubleClickRow", name: "row events" },
      { description: "Row styling, disabled state, and drag availability.", example: "rowProps={{ className, disabled, draggable }}", name: "rowProps" },
      { description: "Moves row position from outside the table.", example: "setMoveTargetRow(targetIdx, sourceIdx)", name: "setMoveTargetRow" },
    ],
    summary: "Row style, drag, disabled, and custom behavior example.",
  },
  {
    Component: ContextMenuFeature,
    description: "Example page for selection and callback payloads on row or cell right-clicks.",
    id: "context-menu",
    label: "Context Menu",
    options: [
      { description: "Row right-click callback.", example: "onContextMenuRow={...}", name: "onContextMenuRow" },
      { description: "Cell right-click callback.", example: "onContextMenuCell={...}", name: "onContextMenuCell" },
    ],
    summary: "Single-row selection and callback-driven context menu data on row or cell right-click.",
  },
  {
    Component: ExportFeature,
    description: "Example page for helpers that convert rows and export column definitions to CSV or JSON strings.",
    id: "export",
    label: "Export Helper",
    options: [
      { description: "Creates a CSV string.", example: "exportCominsRowsToCsv({ columns, rows })", name: "exportCominsRowsToCsv" },
      { description: "Creates a JSON string.", example: "exportCominsRowsToJson({ columns, rows })", name: "exportCominsRowsToJson" },
      { description: "Overrides output order and header names.", example: "{ columnOrder, headerOverrides }", name: "export options" },
    ],
    summary: "CSV and JSON export helper output example.",
  },
];

export function findFeature(id: FeatureId) {
  return featureRegistry.find((feature) => feature.id === id) ?? featureRegistry[0]!;
}
