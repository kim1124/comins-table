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
