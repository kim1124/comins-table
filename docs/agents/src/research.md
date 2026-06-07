# @kmsf/data-table Source Research

## Reviewed Facts

- 이 파일은 `src` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-06-04 기준으로 KMSF repo root `AGENTS.md`를 공통 실행 계약으로 삼고, root `GUIDE.md`를 MD 작성 및 하네스 엔지니어링 참고 문서로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`src`는 public data-table exports와 future component implementation을 담당한다.

## Stable Rules

- public export는 `src/index.tsx`에서 관리한다.
- table behavior는 React generic environment에서 동작해야 한다.
- large row rendering과 accessibility를 future baseline으로 고려한다.
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
