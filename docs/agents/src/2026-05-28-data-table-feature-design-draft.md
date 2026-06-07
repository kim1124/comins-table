# @kmsf/data-table Open Source Data Grid Design Draft

## Status

- Created: 2026-05-28
- Revised: 2026-06-04
- Current direction: AG Grid Enterprise와 MUI X Premium급 기능군을 자체 지원하는 다기능 고성능 오픈소스 React data grid를 만든다.
- Document type: 설계 초안. 이 문서는 production code 변경을 승인하지 않는다.

## Correction From Prior Draft

이전 초안은 `@kmsf/data-table`을 KMSF 내부 화면용 축소형 data table로 해석했다. 그 방향은 폐기한다.

확정된 방향은 아래와 같다.

- AG Grid, MUI X Data Grid, TanStack Table 같은 외부 grid/table을 래핑하지 않는다.
- 외부 제품은 feature benchmark와 UX reference로만 사용한다.
- 최종 목표는 searched data grid 제품군의 핵심 기능을 모두 자체 구현하는 신규 React data grid다.
- "Phase"는 기능 제외가 아니라 구현 순서를 의미한다.
- AG Grid Enterprise 또는 MUI X Premium에 있는 기능도 최종 지원 대상에 포함한다.
- 오픈소스 제품을 목표로 하므로 상용 plan으로 기능을 잠그는 구조를 기본 설계에 넣지 않는다.

## Source Basis

공식 문서 기준으로 확인한 근거는 아래와 같다.

- AG Grid React Key Features: https://www.ag-grid.com/react-data-grid/key-features/
- AG Grid Server-Side Row Model: https://www.ag-grid.com/react-data-grid/server-side-model/
- AG Grid CSV Export: https://www.ag-grid.com/react-data-grid/csv-export/
- AG Grid Accessibility: https://www.ag-grid.com/react-data-grid/accessibility/
- AG Grid Licence and Pricing: https://www.ag-grid.com/license-pricing/
- MUI X Data Grid Quickstart: https://mui.com/x/react-data-grid/quickstart/
- MUI X Data Grid Feature Showcase: https://mui.com/x/react-data-grid/features/
- MUI X Data Grid Server-side Data: https://mui.com/x/react-data-grid/server-side-data/
- MUI X Data Grid Accessibility: https://mui.com/x/react-data-grid/accessibility/
- MUI X Data Grid Row Grouping: https://mui.com/x/react-data-grid/row-grouping/
- MUI X Data Grid Aggregation: https://mui.com/x/react-data-grid/aggregation/
- MUI X Data Grid Pivoting: https://mui.com/x/react-data-grid/pivoting/
- MUI X Data Grid Export: https://mui.com/x/react-data-grid/export/
- MUI Pricing: https://mui.com/pricing/

## Product Goal

`@kmsf/data-table`은 React application에서 사용할 수 있는 open-source data grid package가 된다. 목표는 단순 table component가 아니라 아래 기능군을 자체 engine으로 제공하는 것이다.

- column, row, cell, layout, rendering, state, event, data-source를 다루는 grid core.
- sorting, filtering, pagination, selection, editing, grouping, aggregation, pivoting, tree data, master/detail, export, clipboard, virtualization, accessibility를 포함한 feature modules.
- KMSF 앱뿐 아니라 외부 React 소비자가 사용할 수 있는 public API, docs, examples, tests, benchmarks.
- framework-specific API에 묶이지 않는 React-first implementation.

## Non-Negotiable Principles

- No wrapper: AG Grid, MUI X, TanStack Table을 내부 구현체로 쓰지 않는다.
- No hidden paid tier: 오픈소스 제품 목표에 맞게 핵심 기능을 공개 package 안에서 설계한다.
- Modular full feature set: 모든 기능을 한 파일에 넣지 않고 독립 feature module로 나눈다.
- Performance first: large row count, virtualization, memoized row model, server-side row model을 초기 architecture에 포함한다.
- Accessibility first: keyboard navigation, ARIA grid semantics, screen reader state를 기능 완료 조건에 포함한다.
- Controlled state first: grid state는 controlled, uncontrolled, persisted, server-driven mode를 모두 지원할 수 있어야 한다.
- Browser verification required: rendered UI, keyboard, layout, virtualization, resize, export flow는 jsdom test만으로 완료 처리하지 않는다.

## Benchmark Feature Scope

| Feature Area | Benchmark Evidence | KMSF Support Target |
| --- | --- | --- |
| Data mapping | AG Grid `field`, `valueGetter`, `valueFormatter`, cell component. MUI rows/columns and `GridColDef`. | `field`, `accessorKey`, `accessorFn`, `valueGetter`, `valueFormatter`, cell renderer를 모두 지원한다. |
| Column engine | column definitions, column state, headers, groups, sizing, moving, pinning, spanning. | column definition/state engine을 별도 core로 둔다. resize, reorder, pin, hide, group, span, header size/position persistence를 지원한다. |
| Row engine | row data, sorting, row numbers, spanning, pinning, height, row dragging, full width rows. | row identity, row state, row height, pinned rows, row dragging, row position moving, row-level context menu, full-width rows를 지원한다. |
| Cell engine | cell content, typed values, custom components, formatting, notes, tooltips, highlight changes. | typed cell model과 renderer/editor lifecycle을 분리한다. |
| Sorting | AG Grid sorting, MUI sorting. | single, multi, custom comparator, server-side sorting을 지원한다. |
| Filtering | text, number, BigInt, date, set, multi, advanced, external, quick, floating filters. | filter operator registry와 custom filter UI를 제공한다. |
| Pagination | client and server pagination. | client pagination, manual pagination, data-source pagination을 지원한다. |
| Selection | row selection, multi-row, cell selection, range handle, fill handle. | row, cell, range selection과 fill/copy handle을 지원한다. |
| Editing | cell/row editing, custom editors, parsing, saving, validation, batch editing, undo/redo. | editor registry, validation pipeline, batch transaction, undo/redo stack을 지원한다. |
| Data updates | single row/cell updates, transactions, high frequency updates. | immutable updates, transactions, keyed patch, high-frequency render path를 지원한다. |
| Server-side data | lazy group loading, infinite scrolling, server-side grouping, pivot, aggregation, slice-and-dice. | client, infinite, viewport, server-side row model을 모두 architecture에 포함한다. |
| Grouping | row grouping, group display types, group panel, expansion, hierarchy selection. | grouping model과 group row renderer를 feature module로 제공한다. |
| Aggregation | built-in aggregate functions, custom aggregate functions, total rows. | aggregation registry, group/footer totals, custom aggregate를 지원한다. |
| Pivoting | pivot mode, pivot columns, pivot result columns, pivot totals. | pivot model, generated columns, pivot totals, server-side pivot contract를 지원한다. |
| Tree data | hierarchical data paths, nested records, self-referential records, tree selection. | tree data row model과 path/self-reference adapters를 지원한다. |
| Master/detail | detail grids, detail height, nested detail, custom detail. | expandable detail row와 nested grid composition을 지원한다. |
| Tool panels | side bar, columns panel, filters panel, status bar, context menu. | toolbar, side panels, column/filter/pivot/chart panels, context menu slots를 지원한다. |
| Import/export | CSV, Excel export, clipboard, drag and drop, printing, Excel import. | CSV/Excel export, clipboard copy/paste, print, import adapters를 지원한다. |
| Charts | integrated charts, range chart, pivot chart, chart panels, image export. | chart integration은 plugin module로 제공한다. |
| Performance | DOM virtualization, value cache, massive row count, scrolling performance. | row/column virtualization, measurement cache, value cache, render scheduler를 core concern으로 둔다. |
| Accessibility | keyboard navigation, touch, ARIA, RTL, localization. | keyboard grid map, ARIA state, RTL, i18n, screen reader smoke test를 포함한다. |
| AI features | AG Grid AI Toolkit, MUI AI Assistant. | AI assistant는 optional extension target으로 둔다. core grid와 분리한다. |

## Component Area Requirements

### Header

- header renderer and custom header component.
- header height, density, and responsive sizing.
- header position state for column order, pinned region, and group hierarchy.
- header size state for width, min width, max width, flex width, and measured header height.
- header size and position save/load through grid state persistence.
- sortable header with `aria-sort`.
- filter entry point, floating filter, and column menu.
- column resize handle.
- column move/reorder handle.
- column hide/show control.
- header hide/show mode.
- grouped headers and generated pivot result headers.
- keyboard focus and navigation across header cells.

### Body

- grid viewport, scroll container, and virtualized render window.
- client, infinite, viewport, and server-side row model rendering.
- row virtualization and column virtualization.
- pinned column regions and center scroll region.
- loading, empty, error, and active overlay rendering.
- server-side block loading and retry surface.
- scroll scheduler and measurement cache.

### Row

- row identity and row state registry.
- row rendering and custom row renderer.
- row height and dynamic row height.
- row position moving through drag, keyboard action, and controlled state update.
- row order save/load when the application opts into persisted row order.
- row selection, expansion, dirty state, pinned state, and highlight state.
- right-click row context menu with default and custom menu item registry.
- row context menu keyboard alternative for accessibility.
- row dragging and external drop zone hooks.
- full-width rows, grouped rows, tree rows, detail rows, and aggregation footer rows.

### Cell

- raw, formatted, rendered, editable, and export value separation.
- cell renderer and editor lifecycle.
- typed cell model.
- validation, dirty state, and highlight state.
- cell selection, range selection, fill handle, and clipboard boundary.
- tooltip, notes, custom class, and custom style.
- export value conversion and spreadsheet formula injection protection.

## Architecture Overview

```text
src/
├── index.tsx
├── core/
│   ├── grid.ts
│   ├── types.ts
│   ├── state.ts
│   ├── events.ts
│   ├── row-model.ts
│   ├── column-model.ts
│   ├── cell-model.ts
│   └── scheduler.ts
├── features/
│   ├── sorting/
│   ├── filtering/
│   ├── pagination/
│   ├── selection/
│   ├── editing/
│   ├── grouping/
│   ├── aggregation/
│   ├── pivoting/
│   ├── tree-data/
│   ├── master-detail/
│   ├── virtualization/
│   ├── state-persistence/
│   ├── row-ordering/
│   ├── context-menu/
│   ├── export/
│   ├── clipboard/
│   ├── charts/
│   └── ai-assistant/
├── react/
│   ├── KmsfDataGrid.tsx
│   ├── KmsfDataTable.tsx
│   ├── useDataGrid.ts
│   ├── DataGridProvider.tsx
│   ├── renderers/
│   ├── editors/
│   └── panels/
├── accessibility/
│   ├── aria.ts
│   ├── keyboard.ts
│   └── focus.ts
└── testing/
    ├── fixtures.ts
    └── harness.ts
```

현재 package는 단일 `src/index.tsx`만 가진다. 위 구조는 구현 승인 후 단계적으로 적용한다.

## Core Engine Design

### Grid Core

Grid core는 React UI와 분리된 순수 engine이다.

- grid option normalization.
- row/column/cell registry.
- event bus.
- feature module registration.
- controlled/uncontrolled state reconciliation.
- transaction and batch update pipeline.
- derived row model calculation.
- plugin lifecycle.

### Row Models

아래 row model을 모두 지원 대상으로 둔다.

- Client-side row model: 모든 데이터를 browser memory에 올리고 grid가 sorting/filtering/grouping을 처리한다.
- Infinite row model: block 단위로 데이터를 불러오며 scroll 위치에 따라 cache를 관리한다.
- Viewport row model: 현재 viewport가 요구하는 row window만 외부 data source에 요청한다.
- Server-side row model: filtering, sorting, grouping, pivoting, aggregation을 server에 위임한다.

### Column Model

Column model은 visual column과 data column을 분리한다.

- logical column definition.
- generated column from pivot result.
- column group tree.
- pinned left/right/center regions.
- resize and flex width calculation.
- header size and measured position state.
- visibility, ordering, moving.
- column state serialization.
- header size and position persistence serialization.
- header renderer and menu lifecycle.

### Cell Model

Cell model은 value, display, edit, export를 분리한다.

- raw value.
- formatted value.
- rendered value.
- editable value.
- export value.
- validation state.
- dirty state.
- highlight/change state.

### Layout and State Persistence

Persisted grid state stores and restores user-controlled layout choices.

- header size state.
- header position state.
- column order, pinning, visibility, width, and flex state.
- row order state when row movement is enabled.
- sorting, filtering, grouping, pivoting, pagination, and selection state.
- versioned serialization with migration hooks.
- partial restore so consumers can restore only layout, only data state, or a named subset.

## React Layer Design

React layer는 core engine을 화면에 렌더링한다.

- `KmsfDataGrid`: full-feature grid component.
- `KmsfDataTable`: table-oriented compatibility component. full grid를 래핑하는 외부 wrapper가 아니라 같은 package의 lightweight preset이다.
- `useDataGrid`: controlled state와 engine instance를 연결하는 hook.
- `DataGridProvider`: slots, panels, menus, editor registry, theme context를 제공한다.
- renderers/editors: cell renderer, header renderer, row renderer, editor component registry.

React layer는 Next.js API를 사용하지 않는다. React와 React DOM은 peer dependency로 유지한다.

## Playground And Documentation Environment

테스트 및 문서 환경은 `@kmsf/charts`의 developer-facing playground 운영 방식을 참고하되, data-table 전용 feature playground로 설계한다.

### Layout Contract

- 좌측 aside는 feature menu 영역이며 기본 화면 폭의 20%를 사용한다.
- 우측 content는 data table example 출력 영역이며 기본 화면 폭의 80%를 사용한다.
- 레이아웃은 `grid-template-columns: minmax(220px, 20%) minmax(0, 80%)` 같은 명시적 20/80 계약을 가져야 한다.
- 우측 content는 선택된 기능의 table instance, controls, sample data, state inspector, usage snippet을 포함할 수 있다.

### Menu Contract

초기 메뉴는 아래 feature group을 기준으로 구성한다.

- Basic
- Basic CRUD
- Header
- Body
- Td / Cell
- Tr / Row
- Core Features
- Advanced Features

각 메뉴는 해당 기능의 독립 예제 group을 가진다. 예제 group은 stable id, label, summary, fixture builder, expected verification scope를 가져야 한다.

### Destroy And Recreate Contract

- 좌측 메뉴에서 다른 기능을 선택하면 우측 content boundary를 selected feature id로 keying해 이전 content를 unmount한다.
- 메뉴 변경 시 이전 예제 content를 destroy하고 새 예제 content를 recreate한다.
- 새 기능 content는 fresh fixture, fresh table state, fresh timers, fresh editors, fresh context menu state로 recreate한다.
- 같은 메뉴를 다시 선택하는 것은 no-op이며 content state를 reset하지 않는다.
- inactive feature content는 hidden 상태로 DOM에 남기지 않는다.
- browser test는 메뉴 변경 후 이전 feature의 table instance, editor value, context menu, timer side effect가 남지 않는지 검증한다.

### Verification Contract

- Playground behavior는 Vitest만으로 완료하지 않는다.
- Playwright 또는 동등한 browser-capable verification으로 aside menu, 20/80 layout, selected feature rendering, destroy/recreate, keyboard menu navigation, browser diagnostics empty를 검증한다.
- menu switching test는 `Basic -> Header -> Basic CRUD` 같은 교차 이동을 포함해야 한다.

## Public API Direction

```ts
export type KmsfGridRowId = string | number;

export type KmsfGridColumn<TData, TValue = unknown> = {
  id: string;
  field?: keyof TData;
  headerName?: string;
  header?: React.ReactNode;
  valueGetter?: (params: KmsfValueGetterParams<TData>) => TValue;
  valueSetter?: (params: KmsfValueSetterParams<TData, TValue>) => TData;
  valueFormatter?: (params: KmsfValueFormatterParams<TData, TValue>) => string;
  renderCell?: (params: KmsfCellRendererParams<TData, TValue>) => React.ReactNode;
  renderHeader?: (params: KmsfHeaderRendererParams<TData>) => React.ReactNode;
  editor?: KmsfCellEditor<TData, TValue>;
  type?: "string" | "number" | "bigint" | "date" | "boolean" | "singleSelect" | "custom";
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  pinned?: "left" | "right";
  hidden?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean | ((params: KmsfCellParams<TData>) => boolean);
  rowGroup?: boolean;
  pivot?: boolean;
  aggFunc?: string | KmsfAggregateFn<TData>;
  meta?: Record<string, unknown>;
};

export type KmsfDataSource<TData> = {
  getRows: (params: KmsfGetRowsParams) => Promise<KmsfGetRowsResult<TData>>;
};

export type KmsfDataGridProps<TData> = {
  rows?: TData[];
  columns: Array<KmsfGridColumn<TData>>;
  getRowId?: (row: TData, index: number) => KmsfGridRowId;
  rowModel?: "client" | "infinite" | "viewport" | "server";
  dataSource?: KmsfDataSource<TData>;
  sorting?: KmsfSortingState;
  filtering?: KmsfFilteringState;
  pagination?: KmsfPaginationState;
  selection?: KmsfSelectionState;
  grouping?: KmsfGroupingState;
  aggregation?: KmsfAggregationState;
  pivoting?: KmsfPivotState;
  editing?: KmsfEditingState;
  virtualization?: KmsfVirtualizationOptions;
  exportOptions?: KmsfExportOptions;
  localeText?: KmsfLocaleText;
  slots?: KmsfDataGridSlots<TData>;
  className?: string;
};
```

이 API sketch는 방향성이다. 실제 구현 전에는 각 type과 callback shape를 implementation plan에서 확정한다.

## Feature Modules

### Sorting

- single and multi sort.
- custom comparator.
- stable sort.
- server-side sort model serialization.
- sorted state in ARIA headers.

### Filtering

- text, number, BigInt, date, boolean, set filters.
- quick filter.
- floating filters.
- multi filters.
- advanced filter expression model.
- external filter hook.
- custom filter component registry.

### Selection

- single row and multi row selection.
- checkbox selection.
- cell selection.
- range selection.
- range handle.
- fill handle.
- keyboard selection.
- selection persistence across pagination/server-side blocks.

### Row Ordering and Context Menu

- row position moving through drag gesture.
- row position moving through keyboard command.
- controlled row order model.
- row order persistence through grid state.
- row-level right-click context menu.
- context menu item registry.
- default menu items for copy, export, pin, expand, move, and inspect actions.
- custom menu item slots.
- keyboard-accessible context menu trigger.
- row movement compatibility rules for sorting, filtering, grouping, pagination, and server-side row models.

### Editing

- cell editing.
- row editing.
- full-row editing.
- custom editor registry.
- parser and setter pipeline.
- validation.
- async validation.
- batch editing.
- undo/redo.
- dirty state and commit/cancel transaction.

### Grouping, Aggregation, Pivoting

- row grouping by one or more columns.
- group display modes.
- group expansion and collapsed state.
- hierarchy selection.
- built-in aggregate functions: sum, min, max, count, average, first, last.
- custom aggregate functions.
- total rows and group footers.
- pivot mode.
- generated pivot result columns.
- pivot totals.
- server-side group/aggregate/pivot request model.

### Tree Data and Master Detail

- tree path data.
- nested record adapter.
- self-referential parent id adapter.
- tree filtering and selection.
- expandable detail rows.
- custom detail renderer.
- nested grid composition.

### Import, Export, Clipboard

- CSV export with safe escaping.
- Excel export with styles, formulas, multiple sheets, frozen rows/columns, images, hyperlinks.
- clipboard copy/paste.
- print mode.
- import adapter boundary for Excel/CSV.
- formula injection protection for spreadsheet exports.

### Charts and AI Extensions

- range chart.
- pivot chart.
- chart panel.
- chart image export.
- AI assistant panel.
- prompt field.
- natural language query adapter.

Charts and AI must remain optional modules so the base grid remains usable without heavy dependencies.

## Performance Requirements

성능은 후속 최적화가 아니라 architecture requirement다.

- row virtualization.
- column virtualization.
- pinned column virtualization boundary.
- dynamic row height measurement cache.
- value cache.
- memoized row model pipeline.
- batched state updates.
- scroll scheduler.
- high-frequency transaction handling.
- server-side block cache.
- large row count benchmarks.

초기 benchmark 목표는 implementation plan에서 수치로 고정한다. 최소한 10,000 client rows, 100,000 virtualized rows, server-side million-row simulation을 별도 benchmark fixture로 둔다.

## Accessibility Requirements

- `role="grid"` 또는 native table mode를 명확히 선택 가능하게 한다.
- header sorting state uses `aria-sort`.
- selected row/cell state uses ARIA selection state.
- keyboard navigation supports arrow keys, Home, End, PageUp, PageDown.
- editing mode has predictable Enter, Escape, Tab behavior.
- focus never disappears during virtualization.
- screen reader smoke test and keyboard-only Playwright test are required before interactive feature completion.
- RTL and localization are first-class requirements.

## Styling and Theming

- CSS variables for color, spacing, typography, row height, border, focus ring.
- compact, standard, comfortable density.
- slot-based subcomponent replacement.
- className contract for rows, cells, headers, panels, menus.
- theme package or preset can be added later, but core must not depend on MUI.

## Open Source Readiness

오픈소스 제품 목표를 만족하려면 구현 외에 아래 artifact가 필요하다.

- license decision before public release.
- contribution guide.
- issue templates.
- public README written for external users.
- feature matrix.
- browser examples.
- benchmark report.
- accessibility report.
- migration and changelog policy.
- package export stability policy.

현재 `package.json`은 `private: true`다. 오픈소스 공개 단계에서는 package metadata, license, publish policy를 별도 작업으로 확정해야 한다.

## Milestone Strategy

Milestone은 기능 제외가 아니라 구현 순서다.

### Milestone 0: Engine Foundation

- core state model.
- row/column/cell model.
- feature module registration.
- event bus.
- controlled state contract.
- package verification baseline.

### Milestone 1: Visible Grid Baseline

- `KmsfDataGrid`.
- rows and columns rendering.
- value getter, formatter, renderer.
- column width/flex.
- sorting.
- filtering.
- pagination.
- row selection.
- loading, empty, error overlays.
- keyboard navigation baseline.

### Milestone 2: Operational Grid

- column resize, reorder, pin, hide.
- header size and position save/load.
- toolbar and panels.
- row position moving.
- row context menu.
- row and cell editing.
- validation.
- undo/redo.
- clipboard.
- CSV export.
- persisted grid state.
- row virtualization.
- column virtualization.

### Milestone 3: Analytical Grid

- row grouping.
- aggregation.
- pivoting.
- tree data.
- master/detail.
- server-side row model.
- infinite row model.
- viewport row model.

### Milestone 4: Enterprise-Class Open Source Feature Set

- Excel export/import boundary.
- chart integration.
- advanced filters.
- range selection and fill handle.
- high-frequency transaction optimization.
- AI assistant extension.
- public docs, examples, benchmark suite.

## Verification Strategy

### Unit and Type Tests

- state reducer tests.
- row model tests.
- column model tests.
- filter operator tests.
- aggregation tests.
- pivot generation tests.
- export escaping tests.
- type-level public API tests.

### Browser Tests

- visible rendering.
- keyboard navigation.
- selection.
- editing.
- column resize/reorder/pin.
- virtualization with scroll.
- focus retention under virtualization.
- server-side loading and retry.
- export user flow.
- accessibility smoke tests.

### Performance Tests

- 10,000 row client render path.
- 100,000 row virtual scroll path.
- server-side block loading simulation.
- high-frequency transaction simulation.
- memory retention check after data replacement.

### Documentation Tests

- README examples compile.
- API examples compile.
- feature matrix stays in sync with exported modules.
- package docs mention no external grid wrapper dependency.

## Required Decisions Before Implementation

- Public license.
- Primary component name: `KmsfDataGrid` with `KmsfDataTable` preset, or only `KmsfDataTable`.
- Minimum supported React version.
- Whether heavy modules such as Excel export, charts, and AI assistant live in subpath exports.
- Browser example app location and default port.
- Benchmark thresholds for release readiness.

## Next Step

사용자 검토 후 Milestone 0과 Milestone 1을 대상으로 implementation plan을 작성한다. 구현 단계에서는 Superpowers TDD를 적용하고, 각 feature module은 focused test와 browser gate를 가진다.
