# Basic Features Implementation Plan

## Goal

`@kmsf/data-table`의 초기 개발은 설계 초안의 전체 목표 중 기본 기능만 구현한다.

## Scope

이번 단계는 외부 grid/table wrapper 없이 아래 범위를 자체 구현한다.

- 공통: parent-size fit, full/partial row update, CRUD/query, table store update, theme/style update, pagination.
- Header: show/hide, style, format, drag resize/reorder state, column layout save/load.
- Row/Cell: row reorder, row/cell styles, row/cell format, row/cell event handlers, row/cell copy-paste helpers, custom cell rendering, row virtualization range for 100,000 rows.

## Architecture

- `src/core.ts`: React와 분리된 table state, row/column CRUD, layout persistence, pagination, virtualization, copy/paste helper를 관리한다.
- `src/index.tsx`: public type export와 `KmsfDataTable` React component를 제공한다.
- `example/`: 20/80 playground shell과 기본 table 예제를 제공한다.
- `test/basic-core.test.ts`: core behavior를 TDD로 검증한다.
- `test/public-api.test.tsx`: public export와 backward compatibility를 검증한다.
- `test/playwright/specs/basic-playground.spec.ts`: playground layout, remount, Row/Cell keyboard interaction을 browser에서 검증한다.

## TDD Steps

1. RED: `test/basic-core.test.ts`에 CRUD, pagination, column layout persistence, row/cell clipboard, virtualization range 테스트를 추가한다.
2. RED 확인: `npm --workspace=@kmsf/data-table run test:run -- test/basic-core.test.ts`가 missing export로 실패해야 한다.
3. GREEN: `src/core.ts`와 `src/index.tsx`에 최소 구현을 추가한다.
4. GREEN 확인: focused test를 통과시킨다.
5. Public API 확인: 기존 `KmsfDataTable` export와 신규 core exports를 확인한다.
6. Browser 확인: `npm --workspace=@kmsf/data-table run test:e2e`를 통과시킨다.
7. Baseline 확인: `npm --workspace=@kmsf/data-table run verify:full`을 통과시킨다.

## Design Decisions

- `rows` prop 기반 component는 controlled source를 기본으로 하되, `defaultRows`와 store action callback을 통해 내부 state를 사용할 수 있게 한다.
- row identity는 `getRowId`가 있으면 그 값을 사용하고, 없으면 index 기반 id를 사용한다.
- column layout persistence는 width, hidden, order만 초기 지원한다.
- row/cell copy-paste는 JSON/text helper로 제공하고, browser clipboard integration은 handler에서 소비자가 연결할 수 있게 한다.
- 100,000 row 검증은 DOM 전체 렌더가 아니라 virtual range 계산과 visible row window 생성으로 검증한다.
- shadcn/ui는 package runtime이 아니라 playground controls에서 우선 사용한다. 이번 단계는 신규 dependency 없이 local shadcn-compatible Button component와 Tailwind-compatible class contract로 검증한다.

## Out Of Scope

- shadcn component scaffold.
- full keyboard grid map.
- Excel export.
- Server-side row model.
- Grouping, aggregation, pivoting, tree data, master/detail.

## Completion Gate

- focused RED/GREEN evidence가 있어야 한다.
- `npm --workspace=@kmsf/data-table run verify:full`이 통과해야 한다.
- 실패한 required test가 있으면 완료하지 않는다.
