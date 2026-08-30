import { BasicCrudFeature } from "./BasicCrudFeature";
import { BasicFeature } from "./BasicFeature";
import { BodyFeature } from "./BodyFeature";
import { CellFeature } from "./CellFeature";
import { ColumnGroupFeature } from "./ColumnGroupFeature";
import { ColumnFilteringFeature } from "./ColumnFilteringFeature";
import { ColumnPinningFeature } from "./ColumnPinningFeature";
import { ComponentFeature } from "./ComponentFeature";
import { ContextMenuFeature } from "./ContextMenuFeature";
import { CrossTableDragFeature } from "./CrossTableDragFeature";
import { ExportFeature } from "./ExportFeature";
import { HeaderFeature } from "./HeaderFeature";
import { InfiniteScrollFeature } from "./InfiniteScrollFeature";
import { LazyLoadFeature } from "./LazyLoadFeature";
import { LoadingStateFeature } from "./LoadingStateFeature";
import { PaginationFeature } from "./PaginationFeature";
import { RefApiFeature } from "./RefApiFeature";
import { RowFeature } from "./RowFeature";
import { RowExpandFeature } from "./RowExpandFeature";
import { RowGroupingFeature } from "./RowGroupingFeature";
import { SelectionClipboardFeature } from "./SelectionClipboardFeature";
import { SizeFeature } from "./SizeFeature";
import { SummaryRowFeature } from "./SummaryRowFeature";
import { ThemeFeature } from "./ThemeFeature";
import { TreeGridFeature } from "./TreeGridFeature";
import { resolveFeatureDefinition, type FeatureDefinitionSource, type FeatureId } from "./types";
import { defineLocalizedText } from "../i18n/playground-locale";
import type { PlaygroundLocale } from "../i18n/types";

export const featureRegistry: FeatureDefinitionSource[] = [
  {
    Component: BasicFeature,
    description: defineLocalizedText(
      "Comins Table의 기본 data, Column, Row ID와 Theme 구성을 확인하는 예제입니다.",
      "Basic Comins Table example page.",
    ),
    id: "basic",
    label: defineLocalizedText("기본", "Basic"),
    options: [
      { description: defineLocalizedText("Table이 렌더링할 Column 정의입니다.", "Column definitions rendered by the table."), example: "[{ label: 'Name', field: 'name' }]", name: "columns" },
      { description: defineLocalizedText("Table 렌더링을 위해 항상 동일하게 생성되는 30개 Row 배열입니다.", "Deterministic 30-row array rendered by the table."), example: "createExampleRows(30)", name: "data" },
      { description: defineLocalizedText("안정적인 Row ID를 결정하는 resolver입니다.", "Stable row id resolver."), example: "(row) => row.id", name: "getRowId" },
      { apiKind: "event", description: defineLocalizedText("외부 useState에 연결된 data 변경 callback입니다.", "Data change callback connected to external useState."), example: "onChangeData={setRows}", name: "onChangeData" },
      { description: defineLocalizedText("Table 밀도와 기본 styling을 지정합니다.", "Table density and base styling."), example: "{ density: 'compact' }", name: "theme" },
    ],
    summary: defineLocalizedText("기본 data, columns, getRowId와 theme 연결 예제입니다.", "Basic data, columns, getRowId, and theme example."),
  },
  {
    Component: BasicCrudFeature,
    description: defineLocalizedText("선택된 Row를 기준으로 추가, 수정, 삭제와 초기화 동작을 확인하는 예제입니다.", "Example page for add, update, delete, and reset actions around the selected row."),
    id: "basic-crud",
    label: defineLocalizedText("CRUD", "CRUD"),
    options: [
      { description: defineLocalizedText("추가, 수정과 삭제를 위해 항상 동일하게 생성되는 30개 Row source입니다.", "Deterministic 30-row source for add, update, and delete actions."), example: "useState(createExampleRows(30))", name: "data" },
      { apiKind: "event", description: defineLocalizedText("Selection state 변경을 전달하는 callback입니다.", "Selection state change callback."), example: "onChangeSelection={syncSelection}", name: "onChangeSelection" },
      { apiKind: "event", description: defineLocalizedText("클릭한 Cell의 Row를 수정 대상으로 지정합니다.", "Marks the clicked cell's row as the update target."), example: "onClickCell={({ row }) => ...}", name: "onClickCell" },
      { apiKind: "event", description: defineLocalizedText("클릭한 Row를 수정 대상으로 지정합니다.", "Marks the clicked row as the update target."), example: "onClickRow={({ row }) => ...}", name: "onClickRow" },
    ],
    summary: defineLocalizedText("선택된 Row를 기준으로 추가, 수정, 삭제와 초기화를 수행하는 예제입니다.", "Add, update, delete, and reset example around the selected row."),
  },
  {
    Component: SizeFeature,
    description: defineLocalizedText("수동 Table 높이와 parent 크기를 따르는 Table container를 확인하는 예제입니다.", "Example page for manual table height and parent-sized table containers."),
    id: "size",
    label: defineLocalizedText("크기", "Sizing"),
    options: [
      { description: defineLocalizedText("높이를 직접 지정한 container입니다.", "Container with manually assigned height."), example: "height: 320px", name: "manual height" },
      { description: defineLocalizedText("Parent element의 크기를 따르는 Table입니다.", "Table that follows the parent element size."), example: "height: 100%", name: "parent size" },
    ],
    summary: defineLocalizedText("수동 높이와 parent container 크기 연동 예제입니다.", "Manual height and parent container sizing example."),
  },
  {
    Component: ThemeFeature,
    description: defineLocalizedText("CSS variable과 Theme class로 Table styling을 전환하는 예제입니다.", "Example page for switching table styling with CSS variables and theme classes."),
    id: "theme",
    label: defineLocalizedText("테마", "Theme"),
    options: [
      { description: defineLocalizedText("배포 CSS에 포함된 sample Theme class입니다.", "Sample theme class included in the distributed CSS."), example: "comins-table-theme--skyblue", name: "theme.className" },
      { description: defineLocalizedText("CSS variable 값을 덮어씁니다.", "CSS variable override."), example: "{ '--comins-table-header-split-border': '#278aa7' }", name: "theme.style" },
      { description: defineLocalizedText("가상화 계산에 사용하는 Row 높이입니다.", "Row height value used by virtualization calculations."), example: "rowHeight={32}", name: "rowHeight" },
    ],
    summary: defineLocalizedText("Basic, Dark, Skyblue, Mint, Gray, Orange sample Theme과 rowHeight 계약 예제입니다.", "Basic, Dark, Skyblue, Mint, Gray, Orange sample themes and rowHeight contract example."),
  },
  {
    Component: LoadingStateFeature,
    description: defineLocalizedText("Infinite Scroll과 같은 원격 API로 초기 loading, 재조회, 빈 응답, Header와 Body 상태를 확인하는 예제입니다.", "Example page using the same remote API as Infinite Scroll for initial loading, refetch, empty responses, header, and body states."),
    id: "loading",
    label: defineLocalizedText("Loading / Empty 상태", "Loading / Empty State"),
    options: [
      { description: defineLocalizedText("초기 loading과 재조회 loading을 구분하는 상태입니다.", "State that distinguishes initial loading from refetch loading."), example: "loading={isLoading}", name: "loading" },
      { description: defineLocalizedText("초기 loading 중 렌더링할 skeleton Row 수입니다.", "Number of skeleton rows rendered during initial loading."), example: "skeletonRowCount={5}", name: "skeletonRowCount" },
      { description: defineLocalizedText("Data가 없을 때 렌더링하는 fallback입니다.", "Fallback rendered when there is no data."), example: "emptyComponent={<Empty />}", name: "emptyComponent" },
      { description: defineLocalizedText("기존 Row 위에 렌더링하는 overlay입니다.", "Overlay rendered over existing rows."), example: "loadingComponent={<Spinner />}", name: "loadingComponent" },
    ],
    summary: defineLocalizedText("원격 초기 skeleton, 매핑된 Row 재조회 overlay, 실제 빈 응답과 준비 상태 예제입니다.", "Remote initial skeleton, mapped-row refetch overlay, real empty response, and ready-state example."),
  },
  {
    Component: HeaderFeature,
    description: defineLocalizedText("Header formatting, 정렬, styling, class와 layout 저장을 확인하는 예제입니다.", "Example page for header formatting, sorting, styling, classes, and layout persistence."),
    id: "header",
    label: defineLocalizedText("헤더 기본", "Header Basics"),
    options: [
      { description: defineLocalizedText("Header label, 정렬과 formatting을 지정하는 Column 정의입니다.", "Column definitions for header label, sorting, and formatting."), example: "{ label, field, sort }", name: "columns" },
      { description: defineLocalizedText("Shift 키로 여러 Column의 우선순위 정렬을 활성화합니다.", "Enables Shift-assisted priority sorting across multiple Columns."), example: "multiSort", name: "multiSort" },
      { apiKind: "event", description: defineLocalizedText("순서가 포함된 전체 sort model을 관찰합니다.", "Observes the complete ordered sort model."), example: "onChangeSortModel={setSortModel}", name: "onChangeSortModel" },
      { description: defineLocalizedText("Header 렌더링 여부를 제어합니다.", "Controls whether headers are rendered."), example: "showHeader={showHeader}", name: "showHeader" },
      { description: defineLocalizedText("Header 좌측 이동 Handle 표시 여부입니다.", "Controls the left-side Header move handle."), example: "showColumnMoveHandle={false}", name: "showColumnMoveHandle" },
      { description: defineLocalizedText("Column 또는 Group 위치를 고정하고 crossing 이동을 차단합니다.", "Locks a Column or Group position and blocks crossing moves."), example: "lockPosition: true", name: "columns.lockPosition / columnGroups.lockPosition" },
      { apiKind: "method", description: defineLocalizedText("Column 순서와 너비를 저장합니다.", "Saves column order and width."), example: "tableRef.current?.getColumnLayout()", name: "getColumnLayout" },
      { apiKind: "method", description: defineLocalizedText("Column 순서와 너비를 복원하거나 초기화합니다.", "Restores or resets column order and width."), example: "tableRef.current?.setColumnLayout(layout)", name: "setColumnLayout" },
      { apiKind: "method", description: defineLocalizedText("Header 예제에 적용된 다중 Column 정렬을 모두 해제합니다.", "Clears every multi-column sort applied in the Header example."), example: "tableRef.current?.clearSort()", name: "clearSort" },
      { apiKind: "event", description: defineLocalizedText("Column resize와 reorder 상태 변경 callback입니다.", "Callback for column resize and reorder state changes."), example: "onChangeColumnLayout={setColumnLayout}", name: "onChangeColumnLayout" },
    ],
    summary: defineLocalizedText("Header 기본 동작, 다중 Column 정렬, 표시 전환과 Column layout 저장 예제입니다.", "Header basics, multi-column sorting, hide/show behavior, and column layout persistence examples."),
  },
  {
    Component: ColumnGroupFeature,
    description: defineLocalizedText("2단계 Header Group, parent 이동·resize와 child Column 표시를 확인하는 예제입니다.", "Example page for two-level header groups, parent movement, parent resize, and child column visibility."),
    id: "column-groups",
    label: defineLocalizedText("헤더 그룹", "Header Groups"),
    options: [
      { description: defineLocalizedText("Parent Header를 child Column ID에 연결합니다.", "Connects parent headers to child column ids."), example: "columnGroups=[{ children: [...] }]", name: "columnGroups" },
      { description: defineLocalizedText("Parent Header를 resize할 때 child 너비 비율을 유지합니다.", "Keeps child width ratios when resizing the parent header."), example: "resize group header", name: "group resize" },
      { description: defineLocalizedText("Parent Header를 drag할 때 child Column을 함께 이동합니다.", "Moves child columns together when dragging the parent header."), example: "drag group header", name: "group reorder" },
      { description: defineLocalizedText("Columns prop에서 child Column을 제거합니다.", "Removes child columns from the columns prop."), example: "columns.filter(...)", name: "child visibility" },
      { description: defineLocalizedText("선택한 child Column은 유지하면서 parent Group만 별도로 숨깁니다.", "Hides parent groups independently while preserving the selected child columns."), example: "group visibility checkbox", name: "parent visibility" },
      { apiKind: "event", description: defineLocalizedText("Header Group의 Column 순서와 너비 변경을 application state에 전달합니다.", "Reports Header Group column order and width changes to application state."), example: "onChangeColumnLayout={setGroupLayout}", name: "onChangeColumnLayout" },
      { apiKind: "event", description: defineLocalizedText("Row Drag 결과를 controlled data에 반영합니다.", "Commits Row Drag results to controlled data."), example: "onChangeData={setGroupRows}", name: "onChangeData" },
      { apiKind: "method", description: defineLocalizedText("Header Group visibility와 Column layout을 명령형으로 적용합니다.", "Applies Header Group visibility and column layout imperatively."), example: "tableRef.current?.setColumnLayout(layout)", name: "setColumnLayout" },
    ],
    summary: defineLocalizedText("2단계 Header Group, parent 이동·resize와 child Column 표시 예제입니다.", "Two-level header groups, parent movement, parent resize, and child column visibility example."),
  },
  {
    Component: ColumnPinningFeature,
    description: defineLocalizedText(
      "Left/right Column과 Header Group 고정, responsive demotion, resize 및 layout 저장/복원 예제입니다.",
      "Left/right Column and Header Group pinning with responsive demotion, resize, and layout persistence.",
    ),
    id: "column-pinning",
    label: defineLocalizedText("컬럼 고정", "Column Pinning"),
    options: [
      { description: defineLocalizedText("Column을 left 또는 right sticky zone에 배치하고 위치 이동을 잠급니다.", "Places a Column in the left or right sticky zone and locks its position."), example: 'pinned: "left"', name: "columns.pinned" },
      { description: defineLocalizedText("Header Group과 visible child 전체를 하나의 pinned block으로 처리합니다.", "Treats a Header Group and all visible children as one pinned block."), example: 'pinned: "right"', name: "columnGroups.pinned" },
      { description: defineLocalizedText("Container가 좁아지면 최소 center 공간을 위해 안쪽 pinned block을 일시적으로 해제합니다.", "Temporarily demotes inner pinned blocks to preserve minimum center space in a narrow container."), example: "resize container", name: "responsive demotion" },
      { apiKind: "method", description: defineLocalizedText("Configured pin intent를 포함한 Column layout을 읽습니다.", "Reads the column layout including configured pin intent."), example: "tableRef.current?.getColumnLayout()", name: "getColumnLayout" },
      { apiKind: "method", description: defineLocalizedText("저장한 Column layout과 pin intent를 복원합니다.", "Restores a saved column layout and pin intent."), example: "tableRef.current?.setColumnLayout(layout)", name: "setColumnLayout" },
      { apiKind: "event", description: defineLocalizedText("Resize와 reorder 뒤 변경된 Column layout을 전달합니다.", "Reports the changed column layout after resize or reorder."), example: "onChangeColumnLayout={setLayout}", name: "onChangeColumnLayout" },
    ],
    summary: defineLocalizedText("Left/right sticky Column, atomic Header Group과 responsive demotion 예제입니다.", "Left/right sticky Columns, atomic Header Groups, and responsive demotion."),
  },
  {
    Component: PaginationFeature,
    description: defineLocalizedText("Pagination prop으로 pageIndex와 pageSize를 제어하는 예제입니다.", "Example page for controlling pageIndex and pageSize through the pagination prop."),
    id: "pagination",
    label: defineLocalizedText("페이지네이션", "Pagination"),
    options: [
      { description: defineLocalizedText("현재 page index와 page size입니다.", "Current page index and page size."), example: "{ pageIndex, pageSize }", name: "pagination" },
      { description: defineLocalizedText("외부에서 page를 이동하는 button입니다.", "External page movement buttons."), example: "setPageIndex(next)", name: "pagination controls" },
      { description: defineLocalizedText("Page 이동 중에도 안정적으로 유지되는 Row ID입니다.", "Stable row ids across page movement."), example: "getRowId={(row) => row.id}", name: "getRowId" },
    ],
    summary: defineLocalizedText("일반 dataset의 pageIndex, pageSize와 외부 page 제어 예제입니다.", "pageIndex, pageSize, and external page control example for regular datasets."),
  },
  {
    Component: BodyFeature,
    description: defineLocalizedText("대규모 dataset과 가상화된 Body 렌더링을 확인하는 예제입니다.", "Example page for large datasets and virtualized body rendering."),
    id: "body",
    label: defineLocalizedText("가상화", "Virtualization"),
    options: [
      { description: defineLocalizedText("Virtual scrolling을 활성화합니다.", "Enables virtual scrolling."), example: "virtualized", name: "virtualized" },
      { description: defineLocalizedText("대규모 Row 배열을 전달합니다.", "Large row array."), example: "createRows(100_000)", name: "data" },
      { description: defineLocalizedText("전체 Row set을 포함하는 page size입니다.", "Page size that includes the full row set."), example: "{ pageSize: rows.length }", name: "pagination" },
    ],
    summary: defineLocalizedText("100000개 Row를 대상으로 하는 Virtual scrolling 예제입니다.", "Virtual scrolling example against 100000 rows."),
  },
  {
    Component: InfiniteScrollFeature,
    description: defineLocalizedText("Scroll이 하단에 가까워질 때 remote API의 offset/limit batch를 append하는 예제입니다.", "Example page that appends offset/limit batches from a remote API when scroll nears the bottom."),
    id: "infinite-scroll",
    label: defineLocalizedText("Infinite Scroll", "Infinite Scroll"),
    options: [
      { description: defineLocalizedText("Controlled 하단 threshold callback을 활성화합니다.", "Enables the controlled bottom-threshold callback."), example: "infiniteScroll", name: "infiniteScroll" },
      { description: defineLocalizedText("False이면 하단 threshold callback을 중단합니다.", "Stops bottom-threshold callbacks when false."), example: "hasMoreRows={rows.length < total}", name: "hasMoreRows" },
      { description: defineLocalizedText("중복 request를 방지하고 loading Row를 렌더링합니다.", "Prevents duplicate requests and renders the loading row."), example: "loadingMore={loadingMore}", name: "loadingMore" },
      { apiKind: "event", description: defineLocalizedText("Consumer가 다음 remote batch를 append하도록 요청합니다.", "Lets the consumer append its next remote batch."), example: "onLoadMore={() => void appendRows()}", name: "onLoadMore" },
    ],
    summary: defineLocalizedText("Consumer-owned Row와 request lifecycle을 사용하는 controlled Infinite Scroll 예제입니다.", "Controlled infinite scroll with consumer-owned rows and request lifecycle."),
  },
  {
    Component: LazyLoadFeature,
    description: defineLocalizedText("onLazyLoad request를 받아 application-owned data를 replace/append하는 예제입니다.", "Example page that receives onLazyLoad requests and replaces or appends application-owned data."),
    id: "lazy-load",
    label: defineLocalizedText("Lazy Load", "Lazy Load"),
    options: [
      { description: defineLocalizedText("Append mode Lazy Loading을 활성화합니다.", "Enables append-mode lazy loading."), example: "lazyLoad", name: "lazyLoad" },
      { description: defineLocalizedText("Request 한 번에 가져오는 Row 수입니다.", "Number of rows fetched per request."), example: "lazyLoadBatchSize={30}", name: "lazyLoadBatchSize" },
      { description: defineLocalizedText("Loading을 시작하는 하단 기준 거리입니다.", "Distance from the bottom that triggers loading."), example: "lazyLoadThreshold={140}", name: "lazyLoadThreshold" },
      { description: defineLocalizedText("현재 지원하는 append mode입니다.", "The currently supported append mode."), example: 'lazyLoadMode="append"', name: "lazyLoadMode" },
      { apiKind: "event", description: defineLocalizedText("Offset, limit, reason과 signal을 받고 controlled data를 갱신합니다.", "Receives offset, limit, reason, and signal, then updates controlled data."), example: "onLazyLoad={loadRows}", name: "onLazyLoad" },
    ],
    summary: defineLocalizedText("DummyJSON 형태 remote API에 연결한 append-mode Lazy Load 예제입니다.", "Append-mode lazy-load example connected to a DummyJSON-style remote API."),
  },
  {
    Component: CellFeature,
    description: defineLocalizedText("Cell formatting, event, style, renderer와 Context Menu를 확인하는 예제입니다.", "Example page for cell formatting, events, styles, renderers, and context menus."),
    id: "cell",
    label: defineLocalizedText("셀", "Cells"),
    options: [
      { description: defineLocalizedText("Cell content를 custom renderer로 렌더링합니다.", "Cell custom renderer"), example: "cell.renderer={({ row, value }) => ...}", name: "cell.renderer" },
      { apiKind: "event", description: defineLocalizedText("Cell click payload를 확인합니다.", "Checks the cell click payload."), example: "onClickCell={({ row, column }) => ...}", name: "onClickCell" },
      { apiKind: "event", description: defineLocalizedText("Cell double-click payload를 전달합니다.", "Reports the cell double-click payload."), example: "onDoubleClickCell={({ row, column }) => ...}", name: "onDoubleClickCell" },
      { apiKind: "event", description: defineLocalizedText("Cell Context Menu event를 전달하는 callback입니다.", "Cell context menu callback."), example: "onContextMenuCell={({ event, row }) => ...}", name: "onContextMenuCell" },
      { apiKind: "event", description: defineLocalizedText("Cell에서 발생한 keyboard event와 Cell 정보를 전달합니다.", "Reports a keyboard event with its cell context."), example: "onKeyDownCell={({ event, row }) => ...}", name: "onKeyDownCell" },
      { apiKind: "event", description: defineLocalizedText("붙여넣기 등으로 변경된 다음 controlled data를 전달합니다.", "Reports the next controlled data after changes such as paste."), example: "onChangeData={setRows}", name: "onChangeData" },
      { description: defineLocalizedText("Column별 className, style, copy와 paste option입니다.", "Column-level className, style, copy, and paste options."), example: "columns[].cell.props", name: "cell.props" },
    ],
    summary: defineLocalizedText("Cell formatting, styling, event와 Context Menu 예제입니다.", "Cell formatting, styling, events, and context menu example."),
  },
  {
    Component: SelectionClipboardFeature,
    description: defineLocalizedText("Row, Cell, Range 선택과 keyboard Clipboard 변경을 다루는 controlled React 예제입니다.", "Controlled React example for Row, Cell, and Range selection with keyboard clipboard changes."),
    id: "selection-clipboard",
    label: defineLocalizedText("선택과 Clipboard", "Selection & Clipboard"),
    options: [
      { apiKind: "event", description: defineLocalizedText("전체 Row, Cell과 Range selection state를 전달합니다.", "Reports the complete Row, Cell, and Range selection state."), example: "onChangeSelection={setSelection}", name: "onChangeSelection" },
      { description: defineLocalizedText("Cell과 Range selection interaction을 활성화합니다.", "Enables Cell and Range selection interaction."), example: "cellSelection", name: "cellSelection" },
      { apiKind: "event", description: defineLocalizedText("Keyboard paste 결과를 consumer state에 반영합니다.", "Commits keyboard paste results back to consumer state."), example: "onChangeData={setRows}", name: "onChangeData" },
      { description: defineLocalizedText("Clipboard read와 write에서 특정 Column을 제외합니다.", "Protects a Column from clipboard reads and writes."), example: "{ copyable: false, pasteable: false }", name: "cell.props" },
    ],
    summary: defineLocalizedText("Consumer-owned selection state와 controlled Clipboard data 변경 예제입니다.", "Consumer-owned selection state and controlled clipboard data updates."),
  },
  {
    Component: ComponentFeature,
    description: defineLocalizedText("Header와 Cell의 내장 Component 및 custom renderer를 확인하는 예제입니다.", "Example page for built-in components and custom renderers in headers and cells."),
    id: "component",
    label: defineLocalizedText("컴포넌트", "Components"),
    options: [
      { description: defineLocalizedText("Header 내부에 lightweight Component를 렌더링합니다.", "Lightweight components rendered inside a header."), example: "header.components=[{ type:'button' }]", name: "header.components" },
      { description: defineLocalizedText("Cell 내부에 lightweight Component를 렌더링합니다.", "Lightweight components rendered inside a cell."), example: "cell.components=[{ type:'checkbox' }]", name: "cell.components" },
      { description: defineLocalizedText("Header 전용 popover menu를 제공합니다.", "Popover menu dedicated to headers."), example: "header.components=[{ type:'menu', items }]", name: "header menu" },
      { description: defineLocalizedText("Cell 내부에 여러 항목을 가진 Virtual List를 렌더링합니다.", "Multi-item virtual list inside a cell."), example: "cell.components=[{ type:'virtual-list', items }]", name: "cell virtual-list" },
      { description: defineLocalizedText("Custom React renderer를 사용합니다.", "Custom React renderer."), example: "header.renderer / cell.renderer", name: "renderer" },
      { apiKind: "event", description: defineLocalizedText("Button을 실행하면 Header 또는 Cell context를 전달합니다.", "Reports Header or Cell context when a button is activated."), example: "onClick={({ row }) => ...}", name: "components[].onClick" },
      { apiKind: "event", description: defineLocalizedText("Input과 Select의 다음 값을 전달하며 Input은 Enter 또는 Blur에서 반영합니다.", "Reports the next Input or Select value; Input commits on Enter or Blur."), example: "onValueChange={({ row, value }) => ...}", name: "components[].onValueChange" },
      { apiKind: "event", description: defineLocalizedText("Checkbox, Radio와 Toggle의 다음 checked 상태를 전달합니다.", "Reports the next checked state for Checkbox, Radio, or Toggle."), example: "onCheckedChange={({ row, checked }) => ...}", name: "components[].onCheckedChange" },
      { apiKind: "event", description: defineLocalizedText("Header Menu 상태 변경 전에 열기 또는 닫기를 취소할 수 있습니다.", "Can cancel a Header Menu open or close transition before it changes."), example: "onBeforeChange={({ open }) => open}", name: "menu.onBeforeChange" },
      { apiKind: "event", description: defineLocalizedText("Header Menu의 다음 open 상태를 전달합니다.", "Reports the next Header Menu open state."), example: "onOpenChange={({ open }) => ...}", name: "menu.onOpenChange" },
      { apiKind: "event", description: defineLocalizedText("선택한 Header Menu item의 value를 전달합니다.", "Reports the selected Header Menu item value."), example: "onSelect={({ value }) => ...}", name: "menu.onSelect" },
      { apiKind: "event", description: defineLocalizedText("Virtual List item click을 전달합니다.", "Reports a Virtual List item click."), example: "onClickItem={({ item }) => ...}", name: "virtual-list.onClickItem" },
      { apiKind: "event", description: defineLocalizedText("Virtual List item의 Context Menu event를 전달합니다.", "Reports a Virtual List item context-menu event."), example: "onContextMenuItem={({ event, item }) => ...}", name: "virtual-list.onContextMenuItem" },
      { description: defineLocalizedText("Virtual List preview, 더 보기 확장과 검색 filtering을 제공합니다.", "Virtual List preview, More expansion, and Search filtering."), example: "{ limit: 5, more, searchable }", name: "virtual-list UX" },
    ],
    summary: defineLocalizedText("Button, Input, Checkbox, Radio, Select, Toggle, Progress, Header Menu, Cell Virtual List와 custom renderer 예제입니다.", "Button, Input, Checkbox, Radio, Select, Toggle, Progress, Header Menu, Cell Virtual List, and custom renderer example."),
  },
  {
    Component: RowFeature,
    description: defineLocalizedText("Row styling, event, drag 이동, disabled 상태와 customization을 확인하는 예제입니다.", "Example page for row styling, events, drag movement, disabled state, and customization."),
    id: "row",
    label: defineLocalizedText("행", "Rows"),
    options: [
      { apiKind: "event", description: defineLocalizedText("클릭한 Row 정보를 전달합니다.", "Reports the clicked Row."), example: "onClickRow={({ row }) => ...}", name: "onClickRow" },
      { apiKind: "event", description: defineLocalizedText("Double-click한 Row 정보를 전달합니다.", "Reports the double-clicked Row."), example: "onDoubleClickRow={({ row }) => ...}", name: "onDoubleClickRow" },
      { apiKind: "event", description: defineLocalizedText("Row 우클릭 event와 Row 정보를 전달합니다.", "Reports the Row context-menu event and Row context."), example: "onContextMenuRow={({ event, row }) => ...}", name: "onContextMenuRow" },
      { apiKind: "event", description: defineLocalizedText("Row에서 발생한 keyboard event를 전달합니다.", "Reports a keyboard event from a Row."), example: "onKeyDownRow={({ event, row }) => ...}", name: "onKeyDownRow" },
      { apiKind: "event", description: defineLocalizedText("Row Drag listener를 등록하기 전에 호출하며 false로 Drag를 취소합니다.", "Runs before Row Drag listeners are registered and cancels the drag when it returns false."), example: "onBeforeRowDrag={({ row }) => row.id !== 'locked'}", name: "onBeforeRowDrag" },
      { apiKind: "event", description: defineLocalizedText("Row Drag target 또는 유효성이 바뀔 때 source와 target을 전달합니다.", "Reports the source and target when the Row Drag target or validity changes."), example: "onRowDrag={({ row, target }) => ...}", name: "onRowDrag" },
      { apiKind: "event", description: defineLocalizedText("시작된 Row Drag가 끝날 때 result와 reason을 한 번 전달합니다.", "Reports result and reason once when a started Row Drag ends."), example: "onAfterDragRow={({ result, reason }) => ...}", name: "onAfterDragRow" },
      { apiKind: "event", description: defineLocalizedText("Row Drag 결과인 다음 controlled data를 전달합니다.", "Reports the next controlled data produced by Row Drag."), example: "onChangeData={setRows}", name: "onChangeData" },
      { description: defineLocalizedText("Row styling, disabled 상태와 drag 가능 여부를 지정합니다.", "Row styling, disabled state, and drag availability."), example: "rowProps={{ className, disabled, draggable }}", name: "rowProps" },
      { apiKind: "method", description: defineLocalizedText("Table 외부에서 visible index 기준으로 Row 위치를 이동합니다.", "Moves a Row from outside the table by visible indexes."), example: "tableRef.current?.setMoveTargetRow(targetIdx, sourceIdx)", name: "setMoveTargetRow" },
    ],
    summary: defineLocalizedText("Row style, drag, disabled와 custom behavior 예제입니다.", "Row style, drag, disabled, and custom behavior example."),
  },
  {
    Component: RowExpandFeature,
    description: defineLocalizedText("고정 높이와 자동 측정 높이를 사용하는 controlled Row Detail 예제입니다.", "Controlled fixed and automatic Row Detail examples."),
    id: "row-expand",
    label: defineLocalizedText("Row Expand", "Row Expand"),
    options: [
      {
        description: defineLocalizedText("Detail region이 열린 controlled business Row ID 배열입니다.", "Controlled business Row IDs whose Detail regions are open."),
        example: "expandedRowIds={expandedRowIds}",
        name: "expandedRowIds",
      },
      {
        description: defineLocalizedText("Owner Row에 유한한 양수 pixel 높이 또는 auto를 반환합니다.", "Returns a positive pixel height or auto for an owner Row."),
        example: 'getRowDetailHeight={() => "auto"}',
        name: "getRowDetailHeight",
      },
      {
        description: defineLocalizedText("Owner Row의 semantic Detail region을 렌더링합니다.", "Renders the semantic Detail region for an owner Row."),
        example: "renderRowDetail={({ row }) => <Detail row={row.data} />",
        name: "renderRowDetail",
      },
      {
        apiKind: "event",
        description: defineLocalizedText("Disclosure 변경 후 다음 controlled Row ID 배열을 전달합니다.", "Reports the next controlled Row ID array after a disclosure change."),
        example: "onChangeExpandedRowIds={setExpandedRowIds}",
        name: "onChangeExpandedRowIds",
      },
    ],
    summary: defineLocalizedText("고정 높이와 측정 기반 자동 Detail 높이를 사용하는 controlled Row Expand 예제입니다.", "Controlled Row Expand with fixed and measured automatic Detail height."),
  },
  {
    Component: RowGroupingFeature,
    description: defineLocalizedText(
      "Application-owned 단일 Depth Group 모델, Group/Row Drag, custom Group content/style, Row Detail과 가상화 예제입니다.",
      "Application-owned single-depth Groups with Group/Row Drag, custom Group content/style, Row Detail, and virtualization.",
    ),
    id: "row-grouping",
    label: defineLocalizedText("Row Grouping", "Row Grouping"),
    options: [
      { description: defineLocalizedText("빈 Group을 포함한 application-owned Group 배열이며 배열 순서가 실제 화면 순서입니다.", "Application-owned Group array, including empty Groups, whose array order is the actual display order."), example: "groups", name: "rowGrouping.groups" },
      { description: defineLocalizedText("Group과 Row의 stable Group ID를 각각 반환합니다.", "Resolves stable Group IDs for Group objects and Rows."), example: "getGroupId / getRowGroupId", name: "rowGrouping.getGroupId / getRowGroupId" },
      { description: defineLocalizedText("현재 열린 Group ID를 application state로 제어합니다.", "Controls the currently open Group IDs in application state."), example: "expandedGroupIds", name: "rowGrouping.expandedGroupIds" },
      { apiKind: "event", description: defineLocalizedText("다음 controlled Group ID 배열을 전달합니다. 생략하면 disclosure가 read-only입니다.", "Receives the next controlled group ID array. Omit it for read-only disclosure."), example: "onChangeExpandedGroupIds={setExpandedGroupIds}", name: "rowGrouping.onChangeExpandedGroupIds" },
      { apiKind: "event", description: defineLocalizedText("Group Drag 결과인 다음 Group 배열을 application state에 반영합니다.", "Writes the next Group array from Group Drag to application state."), example: "onChangeGroups={setGroups}", name: "rowGrouping.onChangeGroups" },
      { apiKind: "event", description: defineLocalizedText("Group 내 Row Drag 결과인 다음 controlled data를 전달합니다.", "Reports the next controlled data after dragging a Row within or across Groups."), example: "onChangeData={setRows}", name: "onChangeData" },
      { apiKind: "event", description: defineLocalizedText("Group 안에서 변경된 Row Detail ID 배열을 전달합니다.", "Reports the changed Row Detail ID array inside Groups."), example: "onChangeExpandedRowIds={setExpandedRowIds}", name: "onChangeExpandedRowIds" },
      { apiKind: "method", description: defineLocalizedText("지정한 Group 또는 모든 Group을 펼칩니다.", "Expands the specified Groups or every Group."), example: "tableRef.current?.expandGroups(groupIds)", name: "expandGroups" },
      { apiKind: "method", description: defineLocalizedText("지정한 Group 또는 모든 Group을 접습니다.", "Folds the specified Groups or every Group."), example: "tableRef.current?.foldGroups(groupIds)", name: "foldGroups" },
      { description: defineLocalizedText("각 Group Row에 typed className과 style을 적용합니다.", "Applies a typed className and style to each Group Row."), example: "getGroupRowProps={({ group }) => ({ className, style })}", name: "rowGrouping.getGroupRowProps" },
      { description: defineLocalizedText("Group Row의 내부 label, count, aggregate와 action content를 교체합니다.", "Replaces the inner label, count, aggregate, and action content of a Group Row."), example: "renderGroupContent={(params) => ...}", name: "rowGrouping.renderGroupContent" },
      { description: defineLocalizedText("전체 descendant leaf에 count, sum, avg, min 또는 max를 계산합니다.", "Computes count, sum, avg, min, or max across every descendant leaf."), example: "aggregations: { amount: 'sum' }", name: "rowGrouping.aggregations" },
    ],
    summary: defineLocalizedText("빈 Group CRUD, Group/Row Drag, custom content/style, Group별 정렬, Row Detail과 100000 Row 가상화 예제입니다.", "Empty-Group CRUD, Group/Row Drag, custom content/style, per-Group sorting, Row Detail, and 100000-row virtualization."),
  },
  {
    Component: CrossTableDragFeature,
    description: defineLocalizedText(
      "Shared Coordinator를 사용하는 flat Row, grouped Row와 Group bundle의 Table 간 Drag 예제입니다.",
      "Cross-Table Drag for flat Rows, grouped Rows, and Group bundles through a shared Coordinator.",
    ),
    id: "cross-table-drag",
    label: defineLocalizedText("테이블 간 드래그", "Cross-Table Drag"),
    options: [
      { apiKind: "method", description: defineLocalizedText("같은 객체와 scope를 공유하는 Table을 연결하는 Coordinator를 생성합니다.", "Creates a Coordinator that connects Tables sharing the same object and scope."), example: "createCominsTableTransferCoordinator({ onTransfer })", name: "createCominsTableTransferCoordinator" },
      { description: defineLocalizedText("Table의 stable identity와 Coordinator scope를 연결합니다.", "Connects the Table's stable identity and Coordinator scope."), example: "{ coordinator, scope, tableId }", name: "tableTransfer" },
      { apiKind: "method", description: defineLocalizedText("중복 Row/Group ID를 기본 reject하거나 명시적으로 overwrite합니다.", "Rejects duplicate Row/Group IDs by default or explicitly overwrites them."), example: 'resolveConflict={() => "overwrite"}', name: "resolveConflict" },
      { apiKind: "event", description: defineLocalizedText("한 callback에서 source와 target의 data/groups를 원자적으로 반영합니다.", "Applies source and target data/groups atomically in one callback."), example: "onTransfer={({ source, target }) => ...}", name: "onTransfer" },
      { description: defineLocalizedText("중복 ID 거부를 Pointer Tooltip과 target outline으로 알리고 content/duration을 custom합니다.", "Reports duplicate-ID rejection with a Pointer Tooltip and target outline, with customizable content and duration."), example: "rejectionFeedback={{ renderTooltip, duration: 2400 }}", name: "rejectionFeedback" },
      { apiKind: "event", description: defineLocalizedText("거부된 duplicate conflict를 application 알림 또는 기록 로직에 전달합니다.", "Passes a rejected duplicate conflict to application notification or logging logic."), example: "onTransferRejected={(rejection) => ...}", name: "onTransferRejected" },
    ],
    summary: defineLocalizedText("Flat/grouped Row 및 전체 Group bundle의 controlled Table 간 이동 예제입니다.", "Controlled cross-Table movement for flat/grouped Rows and complete Group bundles."),
  },
  {
    Component: ColumnFilteringFeature,
    description: defineLocalizedText(
      "Application-owned Filter model, controlled Header popover와 Row Grouping 결합 예제입니다.",
      "Application-owned Filter models, controlled Header popovers, and Row Grouping integration.",
    ),
    id: "column-filtering",
    label: defineLocalizedText("Column Filtering", "Column Filtering"),
    options: [
      { description: defineLocalizedText("Column 값의 Filter type과 optional custom value resolver를 정의합니다.", "Defines the Column value kind and an optional custom value resolver."), example: "filter: { kind: 'text' }", name: "columns.filter" },
      { description: defineLocalizedText("Application이 소유하는 Column별 조건 배열입니다.", "Application-owned array of per-Column rules."), example: "model", name: "columnFiltering.model" },
      { apiKind: "event", description: defineLocalizedText("Editor 변경 결과인 다음 Filter model을 전달합니다.", "Receives the next Filter model produced by the editor."), example: "onChangeModel={setModel}", name: "columnFiltering.onChangeModel" },
      { description: defineLocalizedText("현재 열린 Header Filter popover의 Column ID를 제어합니다.", "Controls the Column ID of the currently open Header Filter popover."), example: "openColumnId", name: "columnFiltering.openColumnId" },
      { apiKind: "event", description: defineLocalizedText("Filter popover의 열기, 닫기와 다른 Column 전환을 전달합니다.", "Receives Filter popover open, close, and Column-switch changes."), example: "onChangeOpenColumnId={setOpenColumnId}", name: "columnFiltering.onChangeOpenColumnId" },
      { description: defineLocalizedText("Text, number, UTC date와 boolean별 지원 operator를 선택합니다.", "Selects an operator supported by text, number, UTC date, or boolean values."), example: "{ columnId, operator, value, valueTo }", name: "CominsColumnFilterRule" },
    ],
    summary: defineLocalizedText("Text, number, UTC 날짜, boolean Filter와 Grouping 결합 예제입니다.", "Text, number, UTC date, and boolean Filters with Grouping integration."),
  },
  {
    Component: SummaryRowFeature,
    description: defineLocalizedText("내장 집계, visible Column colSpan, 출력 formatting과 Summary styling을 확인하는 예제입니다.", "Example page for built-in aggregates, visible-column colSpan, output formatting, and summary styling."),
    id: "summary-row",
    label: defineLocalizedText("Summary Row", "Summary Row"),
    options: [
      { description: defineLocalizedText("내장 count, sum, avg, min과 max aggregator를 사용합니다.", "Built-in count, sum, avg, min, and max aggregators."), example: "{ amount: 'sum' }", name: "summary.columns" },
      { description: defineLocalizedText("설정된 Cell을 다음 visible Column까지 병합합니다.", "Merges the configured cell across the following visible columns."), example: "{ aggregate: 'sum', colSpan: 2 }", name: "colSpan" },
      { description: defineLocalizedText("Aggregate 결과를 text 또는 ReactNode로 formatting합니다.", "Formats an aggregate result as text or a ReactNode."), example: "format: ({ value }) => ...", name: "format" },
      { description: defineLocalizedText("Summary Row 또는 설정된 Cell에 className과 style을 적용합니다.", "Applies className and style to the summary row or configured cell."), example: "{ className, style }", name: "style / class" },
    ],
    summary: defineLocalizedText("ColSpan, format과 Row·Cell styling을 포함한 Summary 집계 예제입니다.", "Summary aggregates with colSpan, format, and row or cell styling."),
  },
  {
    Component: TreeGridFeature,
    description: defineLocalizedText("Controlled nested Row, hierarchy 펼침과 leaf-only Summary 값을 확인하는 예제입니다.", "Example page for controlled nested rows, hierarchy expansion, and leaf-only summary values."),
    id: "tree-grid",
    label: defineLocalizedText("Tree Grid", "Tree Grid"),
    options: [
      { description: defineLocalizedText("Controlled Tree Grid input branch를 활성화합니다.", "Enables the controlled Tree Grid input branch."), example: "tree", name: "tree" },
      { description: defineLocalizedText("Business Row를 item에 담은 nested Node 배열입니다.", "Nested nodes with the business row in item."), example: "[{ item, expand, children }]", name: "data" },
      { description: defineLocalizedText("모든 depth의 각 item에 대해 전역적으로 고유한 ID resolver입니다.", "Globally unique id resolver for every item at every depth."), example: "(item) => item.id", name: "getRowId" },
      { description: defineLocalizedText("Expand 값이 없는 Node의 fallback 펼침 상태를 제어합니다.", "Controls the fallback expansion state for nodes without expand."), example: "defaultExpandAll={false}", name: "defaultExpandAll" },
      { apiKind: "method", description: defineLocalizedText("Node ID 배열을 펼치고, 생략하면 모든 branch를 펼칩니다.", "Expands the provided Node IDs, or every branch when omitted."), example: "tableRef.current?.expand(nodeIds)", name: "expand" },
      { apiKind: "method", description: defineLocalizedText("Node ID 배열을 접고, 생략하면 모든 branch를 접습니다.", "Folds the provided Node IDs, or every branch when omitted."), example: "tableRef.current?.fold(nodeIds)", name: "fold" },
      { apiKind: "event", description: defineLocalizedText("Tree data 변경 결과를 controlled Node 배열에 반영합니다.", "Commits Tree data changes to the controlled Node array."), example: "onChangeData={setData}", name: "onChangeData" },
      { description: defineLocalizedText("Node.item과 기존 Component Cell 및 renderer 정의를 함께 사용합니다.", "Uses existing Component Cell and renderer definitions with node.item."), example: "cell.components / cell.renderer", name: "component / renderer" },
      { description: defineLocalizedText("설정된 aggregate 값에 leaf item만 사용합니다.", "Uses only leaf items for configured aggregate values."), example: "{ columns: { age: 'sum' } }", name: "summary" },
    ],
    summary: defineLocalizedText("Node ID 배열을 받는 Ref 기반 펼침 제어, 10000개 Node 가상화, Component, renderer와 styling을 포함한 controlled nested Row 예제입니다.", "Controlled nested rows with array ref expansion, 10000-node virtualization, components, renderers, and styling."),
  },
  {
    Component: ContextMenuFeature,
    description: defineLocalizedText("Row 또는 Cell 우클릭 시 selection과 callback payload를 확인하는 예제입니다.", "Example page for selection and callback payloads on row or cell right-clicks."),
    id: "context-menu",
    label: defineLocalizedText("Context Menu", "Context Menu"),
    options: [
      { apiKind: "event", description: defineLocalizedText("Row 우클릭 event를 전달하는 callback입니다.", "Row right-click callback."), example: "onContextMenuRow={({ event, row }) => ...}", name: "onContextMenuRow" },
      { apiKind: "event", description: defineLocalizedText("Cell 우클릭 event를 전달하는 callback입니다.", "Cell right-click callback."), example: "onContextMenuCell={({ event, row }) => ...}", name: "onContextMenuCell" },
      { apiKind: "event", description: defineLocalizedText("우클릭으로 변경된 Row selection state를 전달합니다.", "Reports Row selection state changed by a context-menu action."), example: "onChangeSelection={setSelection}", name: "onChangeSelection" },
      { apiKind: "method", description: defineLocalizedText("Context Menu action에서 visible index 기준 Row selection을 변경합니다.", "Changes Row selection by visible indexes from a context-menu action."), example: "tableRef.current?.setSelectedRows(indexes)", name: "setSelectedRows" },
    ],
    summary: defineLocalizedText("Row 또는 Cell 우클릭 시 단일 Row selection과 callback 기반 Context Menu data를 확인합니다.", "Single-row selection and callback-driven context menu data on row or cell right-click."),
  },
  {
    Component: ExportFeature,
    description: defineLocalizedText("Row와 export Column 정의를 CSV 또는 JSON 문자열로 변환하는 helper 예제입니다.", "Example page for helpers that convert rows and export column definitions to CSV or JSON strings."),
    id: "export",
    label: defineLocalizedText("내보내기 헬퍼", "Export Helper"),
    options: [
      { apiKind: "method", description: defineLocalizedText("CSV 문자열을 생성합니다.", "Creates a CSV string."), example: "exportCominsRowsToCsv({ columns, rows })", name: "exportCominsRowsToCsv" },
      { apiKind: "method", description: defineLocalizedText("JSON 문자열을 생성합니다.", "Creates a JSON string."), example: "exportCominsRowsToJson({ columns, rows })", name: "exportCominsRowsToJson" },
      { description: defineLocalizedText("출력 순서와 Header 이름을 덮어씁니다.", "Overrides output order and header names."), example: "{ columnOrder, headerOverrides }", name: "export options" },
    ],
    summary: defineLocalizedText("CSV와 JSON export helper 출력 예제입니다.", "CSV and JSON export helper output example."),
  },
  {
    Component: RefApiFeature,
    description: defineLocalizedText("Selection, sort, layout과 Row 이동 Ref method를 확인하는 Live Flat Table 예제입니다.", "Live Flat Table example for selection, sort, layout, and Row movement ref methods."),
    id: "ref-api",
    label: defineLocalizedText("Ref API", "Ref API"),
    options: [
      { apiKind: "method", description: defineLocalizedText("현재 visible index를 기준으로 하나의 Row를 선택합니다.", "Selects one Row by its current visible index."), example: "tableRef.current?.setSelectedRow(1)", name: "setSelectedRow" },
      { apiKind: "method", description: defineLocalizedText("현재 visible index를 기준으로 여러 Row를 선택합니다.", "Selects Rows by their current visible indexes."), example: "tableRef.current?.setSelectedRows([0, 2])", name: "setSelectedRows" },
      { apiKind: "method", description: defineLocalizedText("순서가 포함된 sort model을 적용합니다.", "Applies an ordered sort model."), example: "tableRef.current?.setSortModel(model)", name: "setSortModel" },
      { apiKind: "method", description: defineLocalizedText("Ref를 통해 현재 Flat Table에 적용된 정렬을 모두 해제합니다.", "Clears every active sort from the current Flat Table through its ref."), example: "tableRef.current?.clearSort()", name: "clearSort" },
      { apiKind: "method", description: defineLocalizedText("현재 Column 순서와 너비를 읽습니다.", "Reads the current Column order and width."), example: "tableRef.current?.getColumnLayout()", name: "getColumnLayout" },
      { apiKind: "method", description: defineLocalizedText("저장한 Column 순서와 너비를 복원합니다.", "Restores saved Column order and width."), example: "tableRef.current?.setColumnLayout(layout)", name: "setColumnLayout" },
      { apiKind: "method", description: defineLocalizedText("현재 visible index를 기준으로 controlled Row를 이동합니다.", "Moves a controlled Row by current visible indexes."), example: "tableRef.current?.setMoveTargetRow(2, 0)", name: "setMoveTargetRow" },
    ],
    summary: defineLocalizedText("Visible callback state를 표시하는 명령형 Flat Table 제어 예제입니다.", "Imperative Flat Table controls with visible callback state."),
  },
];

export function findFeature(id: FeatureId, locale: PlaygroundLocale = "en") {
  const feature = featureRegistry.find((item) => item.id === id) ?? featureRegistry[0]!;
  return resolveFeatureDefinition(feature, locale);
}
