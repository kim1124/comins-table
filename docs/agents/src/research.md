# @kmsf/data-table Source Research

## Reviewed Facts

- 이 파일은 `src` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-05-03 기준으로 `charts` 하네스 모델을 패키지별 지침 구조의 기준으로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`src`는 public data-table exports와 future component implementation을 담당한다.

## Stable Rules

- public export는 `src/index.tsx`에서 관리한다.
- table behavior는 React generic environment에서 동작해야 한다.
- large row rendering과 accessibility를 future baseline으로 고려한다.

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

## Design Implications

- `@kmsf/data-table`은 AG Grid Enterprise 기능 전체를 MVP로 삼지 않는다.
- 초기 설계에는 `rowId`, accessor/render 분리, controlled state model, client/manual server mode, CSV export escaping, accessibility acceptance gate를 포함한다.
- MUI dependency는 추가하지 않는다. MUI X는 기능 benchmark로만 사용한다.
- grouping, aggregation, pivoting, tree data, master/detail, chart integration은 Phase 3 backlog로 분리한다.
