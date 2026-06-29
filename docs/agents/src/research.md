# @kmsf/data-table Source Research

## Reviewed Facts

- 이 파일은 `src` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-06-04 기준으로 KMSF repo root `AGENTS.md`를 공통 실행 계약으로 삼고, root `GUIDE.md`를 MD 작성 및 하네스 엔지니어링 참고 문서로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`src`는 public data-table exports와 React data-table implementation을 담당한다.

## Stable Rules

- public export는 `src/index.tsx`에서 관리한다.
- table behavior는 React generic environment에서 동작해야 한다.
- large row rendering과 accessibility를 baseline requirement로 고려한다.
- 이 패키지는 `charts` 패키지의 구현 방식이나 하네스에 종속되지 않는다. data-table source 설계는 KMSF root 하네스와 data grid 자체 요구사항을 기준으로 한다.

## Reviewed External Feature Facts

- 2026-05-28 공식 문서 기준으로 AG Grid는 `field`, `valueGetter`, `valueFormatter`, cell renderer, column sizing, filtering, editing, sorting, row selection, pagination을 핵심 기능으로 제공한다.
- AG Grid는 Community와 Enterprise로 나뉘며, Community는 production use에 무료이고 Enterprise는 production use에 license가 필요하다.
- AG Grid Enterprise 영역에는 integrated charts, row grouping, aggregation, pivoting, tree data, tool panels, advanced export, server-side advanced operations가 포함된다.
- AG Grid Server-Side Row Model은 large dataset을 위해 group child lazy loading과 infinite scrolling을 제공하며, filtering, sorting, grouping, pivoting 같은 작업을 server-side로 위임할 수 있다.
- AG Grid CSV export 문서는 spreadsheet formula injection 위험을 명시하고 export callback으로 위험 cell 값을 변환할 것을 권장한다.
- 2026-05-28 공식 문서 기준으로 MUI X Data Grid는 Community, Pro, Premium package로 나뉘며 Community는 MIT, Pro/Premium은 commercial license다.
- MUI X Data Grid는 row `id`와 column `field`/`headerName` 중심의 기본 contract를 사용하며, Community에서 시작 후 Pro/Premium으로 확장할 수 있다.
- MUI X Data Grid의 Data Source layer는 구현 시 sorting, filtering, pagination을 server mode로 자동 연결하고 `getRows()`로 데이터를 요청한다.
- MUI X Premium은 row grouping, aggregation, pivoting을 제공한다.
- MUI X Accessibility 문서는 keyboard navigation과 row selection shortcut을 명시한다.
- 2026-06-04 재확인 기준으로 MUI X v9.3.0 Data Grid 문서는 layout, columns, rows, cells, editing, sorting, filtering, pagination, selection, virtualization, accessibility, localization을 main features로 노출한다.
- 2026-06-04 재확인 기준으로 MUI X advanced feature list에는 tree data, row grouping, aggregation, pivoting, export, copy and paste, undo and redo, scrolling, list view, server-side data, charts integration, AI Assistant가 포함된다.
- 2026-06-04 재확인 기준으로 AG Grid feature map에는 column state, column groups, sizing, moving, pinning, spanning, row sorting/pinning/dragging/full-width rows, cell formulas/notes/tooltips/highlighting, multi/advanced/external/quick filters, row/cell/range selection, editing validation, batch editing, undo/redo, transactions, keyboard navigation, ARIA, RTL, localization, grouping, aggregation, pivoting, tree data, master/detail, side bar, tool panels, server-side row model, CSV/Excel export, clipboard, printing, DOM virtualization, value cache, massive row count가 포함된다.
- 2026-06-04 사용자 추가 요구사항으로 Header의 사이즈/위치 저장 및 불러오기, Row 위치 이동, Row 우측 마우스 클릭 context menu를 설계 대상에 포함한다.

## Design Implications

- `@kmsf/data-table`은 외부 grid를 래핑하지 않는 신규 React data grid 자체 구현을 목표로 한다.
- AG Grid Enterprise와 MUI X Premium급 기능군은 최종 지원 대상이다. phase는 기능 제외가 아니라 구현 순서다.
- 초기 architecture에는 row/column/cell core model, feature module registry, controlled state model, client/infinite/viewport/server-side row model, export safety, virtualization, accessibility acceptance gate를 포함한다.
- MUI dependency는 추가하지 않는다. MUI X는 기능 benchmark로만 사용한다.
- grouping, aggregation, pivoting, tree data, master/detail, chart integration, AI assistant는 별도 feature module로 설계한다.
- Header layout persistence, row ordering, context menu는 단순 UI 옵션이 아니라 state model, accessibility, persistence, row-model compatibility 검토가 필요한 feature module로 설계한다.
- 설계 초안의 non-negotiable principles는 source 변경의 하네스 gate다. No wrapper, performance first, accessibility first, controlled state first, browser verification required를 지켜야 한다.
- source behavior, public API, state model, rendering, accessibility, performance 변경은 focused RED test부터 시작한다.
- required focused test, package verify, browser-required verification이 실패하면 source 작업은 완료할 수 없다.
- 테스트 및 문서 playground는 `@kmsf/charts`의 developer-facing playground 방식을 참고하되, data-table 전용 20% feature aside와 80% example content 구조를 따른다.
- playground menu switching은 우측 content를 selected feature id로 keying해 destroy/recreate해야 하며, inactive table instance를 숨김 상태로 유지하지 않는다.
- 2026-06-04 초기 개발에서 `src/core.ts`는 basic table state, row CRUD/query, full refresh, partial update, theme update, header visibility, pagination, column width/hidden/order persistence, row reorder, row/cell copy-paste helper, virtual row window를 제공한다.
- 2026-06-04 초기 개발에서 `KmsfDataTable`은 parent-size fit class contract, ResizeObserver height tracking, header show/hide, header drag resize/reorder, row drag reorder, row/cell context handlers, row/cell Ctrl+C/V keyboard copy-paste, custom row/cell style, custom cell render, pagination, virtual row rendering을 제공한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.

## 2026-06-25 Large Row Virtualization Performance Research

### 조사 범위

- 사용자 결정으로 이번 성능 개선 검토는 현재 `data` 배열 입력 방식을 유지한다.
- 사용자 결정으로 column virtualization은 이번 범위에서 제외한다. 컬럼 100개 이상 UI는 현재 목표 사용 시나리오가 아니다.
- 2026-06-27 사용자 결정으로 Chrome DevTools Performance Monitor 수치를 최종 판단 기준으로 유지한다. Playwright CDP 지표는 자동 회귀와 보조 계측에만 사용하며, DevTools 수치 재현 차이 원인 분석으로 범위를 전환하지 않는다.
- 2026-06-27 사용자 결정으로 최종 기본 페이지 복귀 후 GC 기준 JS heap, DOM Nodes, listener는 기본 페이지 대비 10% 이내 회복을 hard gate로 둔다. 자동 gate는 feature shell을 한 번 순회한 warmed basic baseline을 사용해 cold-start React/Vite 초기화 비용을 제외하되, threshold 자체는 완화하지 않는다. 10% 충족이 어렵다면 완화하지 말고 정확한 수치, retained evidence, 어려운 이유를 보고한다.
- 2026-06-27 사용자 결정으로 비교 범위는 모든 data-table feature path이며, 확인 범위는 package-owned 전체 코드다.
- 조사 대상은 대용량 row vertical virtualization의 스크롤 성능, buffer/overscan 방식, DOM/heap/listener 회복성이다.

### Repo 확인 사실

- `src/index.tsx`는 `buffer-size` prop을 받고 기본값을 25로 사용한다.
- 현재 row window 계산은 화면에 보이는 row 범위에 위/아래 `buffer-size`만큼 추가 row를 포함한다.
- 현재 virtualized scroll path는 body scroll 시 `scrollTop` commit을 120ms timeout으로 지연한다.
- 현재 body virtualization은 sticky body table과 별도 virtual sizer div로 scroll height를 만든다.
- 현재 구조는 virtual list 구현에서 흔히 쓰는 rendered row block `translateY(startOffset)` 방식과 다르다.

### 외부 공식 문서 확인 사실

- AG Grid DOM Virtualisation 문서는 viewport에 보이는 row/column만 DOM에 렌더링하고, 스크롤에 따라 필요한 cell을 추가하고 벗어난 cell을 제거한다고 설명한다. 또한 기본 row buffer는 visible range 위/아래 각각 10 row이며, 잘못된 grid height로 과도 렌더링되는 것을 막기 위해 기본 max rendered rows safety limit을 둔다. Source: https://www.ag-grid.com/javascript-data-grid/dom-virtualisation/
- MUI X Data Grid Virtualization 문서는 row virtualization이 세로 스크롤 시 row를 삽입/제거하는 방식이고, `rowBufferPx`로 visible rows 위/아래 추가 렌더 영역을 hint할 수 있으나 high-speed scrolling에서는 그 값이 무시될 수 있다고 설명한다. Source: https://mui.com/x/react-data-grid/virtualization/
- MUI X 문서는 fast scrolling gap을 줄이는 controlled layout mode를 별도 설명한다. default mode는 filler element와 sticky positioning을 사용하고, controlled mode는 visible elements를 absolute positioning으로 함께 갱신해 white-area gap을 줄일 수 있으나 native scrolling 이점을 일부 잃을 수 있다고 설명한다. Source: https://mui.com/x/react-data-grid/virtualization/
- TanStack Table virtualized rows example은 `tbody`를 grid/relative container로 만들고 total size height를 부여한 뒤, `getVirtualItems()`로 visible virtual rows만 렌더링한다. Source: https://tanstack.com/table/latest/docs/framework/react/examples/virtualized-rows
- TanStack Virtual API 문서는 absolute positioning을 사용할 때 `transform: translateY(virtualRow.start - scrollMargin)` 형태로 item offset을 반영하는 예를 제공한다. Source: https://tanstack.com/virtual/latest/docs/api/virtualizer
- react-window 문서는 `overscanCount`를 visible area 밖 추가 row/cell 수로 정의하고, edge flicker를 줄이는 용도로 설명한다. Source: https://github.com/bvaughn/react-window

### Buffer 방식 검토

- 사용자가 제안한 "화면에 보이는 Row + 위 + 아래 각각 buffer-size 만큼 미리 생성" 방식은 AG Grid의 `rowBuffer`, MUI X의 `rowBufferPx`, react-window의 `overscanCount`와 같은 계열의 검증된 접근이다.
- 현재 `@kmsf/data-table`도 이미 계산상으로는 동일한 buffer 방식을 적용한다.
- 다만 현재 병목 후보는 buffer 유무보다 scroll scheduling과 rendered row block 배치 방식이다.
- 120ms timeout commit은 빠른 wheel/scrollbar drag 중 visible range 갱신을 늦출 수 있다.
- sticky table + virtual sizer 구조는 fast scrolling gap과 table layout/paint cost를 유발할 수 있다.
- 따라서 buffer-size를 20~30 수준으로 유지 또는 조정 가능하게 두는 것은 타당하지만, 이것만으로 Virtual List급 성능을 보장하기는 어렵다.

### 개선 방식별 장단점

#### A. 현재 data 배열 유지 + rAF 기반 scroll commit + 기존 table 구조 유지

- 장점: public API 변경이 없고 변경 범위가 작다.
- 장점: 현재 `buffer-size` contract를 그대로 활용할 수 있다.
- 단점: sticky table + virtual sizer 구조의 table layout/paint 비용은 남을 수 있다.
- 단점: scrollbar drag large jump에서 visible row block 배치 안정성은 제한적일 수 있다.

#### B. 현재 data 배열 유지 + translated visible row block 구조로 변경

- 장점: Virtual List 구현과 가장 유사하며, scroll offset에 맞춰 작은 rendered block만 이동시키는 구조가 된다.
- 장점: AG Grid/MUI/TanStack 계열의 DOM virtualization 방향과 더 가깝다.
- 장점: DOM Nodes/Event Listener 수를 visible rows + buffer 범위로 제한하기 좋다.
- 단점: tbody/table semantics, row height, selection, keyboard focus, resize sync, accessibility 검증 범위가 넓어진다.
- 단점: table native layout 일부를 포기하거나 `display: grid`/absolute row 배치를 병행해야 할 수 있다.

#### C. 현재 data 배열 유지 + controlled virtualizer mode 도입

- 장점: MUI X controlled mode와 유사하게 fast scroll 시 white gap을 줄일 수 있다.
- 장점: header, pinned 영역, body rows를 단일 JS pass로 갱신하는 구조를 만들 수 있다.
- 단점: native scrolling에 맡기는 비용이 줄고 JS가 scroll을 더 많이 제어하므로 기기별 성능 편차가 생길 수 있다.
- 단점: 현재 목표에는 과할 수 있어 1차 개선 이후 residual risk로 남기는 편이 안전하다.

### 연구 결론

- column virtualization은 이번 병목 해결 범위에서 제외한다.
- 현재 `data` 배열 유지는 가능하지만, row 배열 자체의 heap 비용은 row 수에 비례해 남는다. 100만 row 분석은 원인 기록으로 유지하고, 현재 playground/perf gate는 supervisor 결정에 따라 10만 row 기준으로 낮춘다.
- buffer-size 기반 overscan은 적용 가능하며 이미 일부 적용되어 있다.
- 우선 개선 후보는 `buffer-size` 자체가 아니라 `scrollTop` commit을 rAF로 전환하고, rendered row block을 `translateY` 기반으로 배치하는지 검토하는 것이다.
- 자동 성능 gate는 CDP `JSHeapUsedSize`, `Nodes`, `JSEventListeners`, rendered row count, GC 후 회복 여부를 포함해야 한다. 최종 수용 판단은 Chrome DevTools Performance Monitor의 GC 이후 JS heap, DOM Nodes, listener 회복 여부와 대조한다.

## 2026-06-27 2 Depth Header / Column Group Research

### 조사 범위

- 사용자 목표는 2 depth header를 제공해 column grouping을 시각적으로 표현하는 것이다.
- 부모 column은 최상단 `th` 1개, 자식 column은 바로 아래 row의 `th` N개로 표현한다.
- 부모 resize는 하위 자식 column width에 반영되어야 한다.
- 부모 move는 하위 자식 column order에 반영되어야 한다.
- 부모 header는 sort와 component slot을 제공하지 않는다.
- 부모 표시/숨김은 하위 자식 표시/숨김에 영향을 준다.
- 부모가 표시되어도 자식 column의 숨김 여부는 독립적으로 동작해야 한다.
- 주의사항은 기존 기능 회귀 방지, 부모 resize/move 시 layout 안정성이다.

### 확인한 저장소 사실

- `KmsfDataTableColumn`은 현재 flat column definition이다. 필수 `field`, `label`, optional `header`, `hidden`, `width`, `minWidth`, `maxWidth`, `sort`만 가지며 group/children/groupId contract는 없다.
- `KmsfColumnLayout`은 `columns: Record<columnId, { hidden?, width? }>`와 `order: string[]`만 저장한다. group visibility, group width, group order, parent-child relation persistence는 없다.
- `normalizeColumns`, `normalizeColumnState`, `normalizeColumnOrder`, `getKmsfVisibleColumns`는 모두 flat runtime columns와 flat `columnOrder`를 기준으로 동작한다.
- 현재 header render는 `visibleColumns.map()`으로 단일 `<tr>` 안에 leaf column `th`만 렌더링한다.
- header와 body는 별도 table이며 같은 `visibleColumns` 기반 `colgroup` width를 공유한다.
- column resize는 leaf header `th`의 실제 width snapshot을 잡고 `setKmsfColumnWidth(column.id, nextWidth)`를 호출한다.
- column move는 long-press 대상 leaf column id를 `moveKmsfColumn(state, column.id, targetIndex)`로 이동한다.
- sort, keyboard sort, `aria-sort`, resize handle, move data attributes, header components는 현재 leaf header cell에 결합되어 있다.
- Header playground와 Playwright gate는 단일 header row, flat `th` count, header/body first-row cell left/width alignment를 전제로 검증한다.
- 기존 설계 초안은 column group tree, grouped headers, header position state, header size state, visibility/order/moving persistence를 최종 column model 대상에 포함한다.
- README의 현재 한계에는 row grouping/aggregation/pivoting 등이 roadmap으로 남아 있으나, column header grouping은 별도 current limit으로 명시되어 있지 않다.

### 확인한 외부 공식 문서 사실

- AG Grid Column Groups는 column definition hierarchy에서 `children`이 있는 definition을 group으로 취급한다. group child는 open/closed 상태에 따라 표시 정책을 가질 수 있고, group resize는 group child width를 균등 분배하는 방식으로 설명한다. Source: https://www.ag-grid.com/react-data-grid/column-groups/
- AG Grid는 group children이 인접하지 않게 이동되면 group이 쪼개져 표시될 수 있으며, 이를 막으려면 `marryChildren=true` 성격의 동작을 사용한다. Source: https://www.ag-grid.com/react-data-grid/column-groups/
- MUI X Data Grid Column Groups는 `columnGroupingModel` prop으로 group tree를 별도 정의한다. group은 `groupId`와 `children`을 가지며, child는 `{ field }` leaf 또는 nested group일 수 있고 column은 하나의 group에만 속할 수 있다. Source: https://mui.com/x/react-data-grid/column-groups/
- MUI X는 기본적으로 group에 속한 column을 group 밖으로 drag할 수 없게 하며, 특정 group에서만 `freeReordering: true`로 완화할 수 있다고 설명한다. Source: https://mui.com/x/react-data-grid/column-groups/
- MUI X 문서는 group visibility management와 grouped header drag ordering은 아직 제공되지 않고 planned 상태라고 명시한다. 이 요구사항은 단순 rendering보다 상태/interaction 난도가 높다. Source: https://mui.com/x/react-data-grid/column-groups/
- TanStack Table Header Groups는 header group row 배열을 순회하고 각 header cell을 `colSpan`으로 렌더링하는 구조를 사용한다. Source: https://tanstack.com/table/latest/docs/guide/header-groups

### 다른 데이터 테이블 2 depth header 제한 비교

- 조사 대상은 AG Grid, MUI X Data Grid, TanStack Table, Handsontable, Syncfusion EJ2 React Grid, DevExtreme React DataGrid, KendoReact Grid다.
- 공통 결론은 "2 depth header 렌더링은 대체로 제공하지만, 부모 header를 leaf column처럼 완전히 자유롭게 resize/move/hide/sort/custom component 대상으로 다루지는 않는다"이다.

| 제품 | 확인된 grouping 모델 | 확인된 제한 또는 정책 | KMSF 설계 영향 |
| --- | --- | --- | --- |
| AG Grid | `children` 기반 column group | group resize는 child width에 분배된다. child를 group 밖으로 이동하면 group이 쪼개질 수 있고, 이를 막으려면 `marryChildren=true` 정책을 사용한다. | 사용자 요구의 "parent move 시 child 동반 이동"은 AG Grid의 married group 정책에 가깝다. group split 허용 여부를 명시해야 한다. |
| MUI X Data Grid | `columnGroupingModel` 별도 tree | 기본적으로 grouped column을 group 밖으로 drag할 수 없고, `freeReordering`으로 완화한다. group visibility management와 grouped header drag ordering은 planned 항목으로 문서화되어 있다. | parent visibility와 parent drag ordering은 단순 header render가 아니라 KMSF 자체 state/interaction 모델이 필요하다. |
| TanStack Table | `getHeaderGroups()`가 header row model 제공 | headless 모델만 제공하며 DOM, resize, move, hide, menu 동작은 구현자 책임이다. | internal derived header row model 참고에는 적합하지만, 요구 동작은 KMSF가 직접 구현해야 한다. |
| Handsontable | `nestedHeaders`와 `collapsibleColumns` plugin | collapsible group은 child 전체를 완전히 숨기는 의미가 아니라 첫 child header만 남기는 collapse 동작으로 설명된다. | KMSF의 "parent hide 시 child 전체 effective hide"와 "parent 표시 + child 독립 hide"는 Handsontable collapse와 별도 의미로 설계해야 한다. |
| Syncfusion EJ2 React Grid | stacked column의 nested `columns` | stacked header resize는 child width를 비율 유지 방식으로 함께 조정한다. stacked parent reorder와 stacked child 내부 reorder 예제를 제공한다. | parent resize 분배 정책은 "비율 유지" 후보가 있으며, parent 이동과 child 내부 이동의 허용 범위를 따로 결정해야 한다. |
| DevExtreme React DataGrid | band column이 data columns를 수집 | band column은 data를 직접 가지지 않고, nested column은 일부 data column 속성을 지원하지 않으며, band column은 제한된 property만 지원한다. | parent column type을 leaf column과 분리하는 근거가 된다. parent에 sort/component/data-field를 상속시키면 public API가 불안정해질 수 있다. |
| KendoReact Grid | nested `GridColumn` children | multi-column headers는 nested columns로 제공되고, expand/collapse 예제는 custom header cell state로 구현한다. | visual grouping은 제공되지만 parent hide/collapse semantics는 package가 정책으로 확정해야 한다. |

### 구현 영향 범위 후보

- `src/core.ts`: column definition type, runtime column normalization, group tree normalization, visible leaf column derivation, group header row derivation, layout serialization migration이 필요하다.
- `src/index.tsx`: header render를 단일 row에서 parent row + child row로 확장해야 한다. Parent `th`는 `colSpan` 기반이며 sort/components를 제거하고 resize/move/visibility UI만 다뤄야 한다.
- `styles.css`: 2-row header height, parent/child border, sticky/split header alignment, resize handle hit area, drop marker/ghost 위치 조정이 필요하다.
- `example/src/features/HeaderFeature.tsx`와 fixture columns: 2 depth header 예제와 parent/child visibility, parent resize, parent move 확인 UI가 필요하다.
- `test/basic-core.test.ts`: layout serialization, parent hidden -> children hidden, child hidden 독립성, parent move -> child order 이동, parent resize -> child width 분배 테스트가 필요하다.
- `test/table-interaction.test.tsx`: jsdom header DOM 구조, sort 미제공 parent, child sort 유지, ref layout get/set 호환성 테스트가 필요하다.
- Playwright: `header-basic`, `header-quality`, `virtual-sticky-header`, `playground-layout-polish` 계열 테스트는 2-row header와 body alignment 기준으로 갱신/보강해야 한다.

### 리스크

- 현재 header/body alignment gate는 header `th`와 body `td`를 같은 index로 비교한다. Parent `th`가 추가되면 leaf child header만 대상으로 alignment를 계산하도록 테스트와 DOM marker를 분리해야 한다.
- Parent resize의 width 분배 정책이 정해지지 않으면 layout persistence 값이 불안정해진다.
- Parent move는 사용자 요구상 grouped children을 항상 함께 이동해야 하므로 MUI 기본 group lock 또는 AG Grid `marryChildren`에 가까운 정책이 필요하다. child column을 group 밖으로 이동할 수 있는지 여부는 별도 결정이 필요하다.
- Parent hidden과 child hidden을 같은 `hidden` flag로만 표현하면 "부모 표시 + 자식 독립 숨김"과 "부모 숨김으로 인한 자식 숨김"을 구분하기 어렵다. Effective visibility와 user visibility state를 분리해야 한다.
- Parent header가 sort/components를 제공하지 않아도 DOM props, renderer, tooltip, className, accessibility label 허용 여부는 public API drift를 만들 수 있다.
- Ungrouped columns가 2-row header에서 `rowSpan=2`로 표시될지, 빈 parent padding cell 아래 child row로 표시될지 결정이 필요하다.

### 확정된 Supervisor 결정

- API 형태는 기존 flat `columns`를 유지하고 별도 `columnGroups` prop을 추가한다.
- `columnGroups` item은 `id`, `label`, `children`, optional `hidden`을 가진다. `name`이 아니라 기존 column API와 같은 `label`을 사용한다.
- Parent resize는 지원한다. Resize 시 child column width 비율을 유지한 상태로 늘어나거나 줄어든다.
- Parent resize는 child `minWidth`/`maxWidth` clamp, 남은 delta 재분배, 더 이상 배분할 수 없는 지점에서 resize 제한 정책을 사용한다.
- Parent move는 지원한다. Parent move 시 하위 child columns는 하나의 block으로 함께 이동한다.
- Child column이 다른 group으로 이동하거나 group 밖으로 이동하는 동작은 현재와 앞으로 모두 미지원이다.
- Parent 숨김/표시는 header만이 아니라 child column 자체의 숨김/표시를 의미한다.
- Parent visibility state는 group state로 저장하고, child hidden state와 분리한다. Parent를 다시 표시할 때 기존 child hidden 상태는 유지한다.
- Header 전체 숨김/표시는 2 depth와 별개의 table option 성격이며, 전체 header area를 사라지거나 표시되게 한다.
- Ungrouped column은 parent row에서 `rowSpan=2`로 표시한다.
- N-depth는 지원하지 않는다. 최대 2 depth만 지원한다.
- Parent header는 sort와 component slot을 제공하지 않는다.

### 연구 결론

- 2 depth header는 현재 flat column engine에 작은 UI만 추가하는 작업이 아니라, column group tree와 derived header row model을 도입하는 public API/state model 변경이다.
- 다른 데이터 테이블도 2 depth header를 완전히 제한 없는 leaf column 동작으로 취급하지 않는다. 성숙한 grid도 group 이동 제한, child 동반 이동 옵션, parent/child property 분리, headless 구현 책임 같은 제약을 둔다.
- 기존 leaf column 기능을 유지하려면 internal model은 "visible leaf columns"와 "visible header rows"를 분리하는 쪽이 안전하다.
- Parent resize/move/hide는 group state와 leaf state를 분리해야 요구사항을 충족할 수 있다.
- 다음 단계는 `docs/agents/src/2026-06-28-2-depth-header-implementation-plan.md`에 따라 RED 테스트와 구현을 진행한다.
