# @kmsf/data-table Source Memory

## History

- 2026-06-04: 이전 package 기준 하네스 표현을 폐기하고, KMSF repo root `AGENTS.md`/`GUIDE.md` 기준으로 src 도메인 문서를 정렬했다.
- 2026-05-28: AG Grid와 MUI X Data Grid 공식 기능을 기준으로 `@kmsf/data-table`의 Phase 1 MVP, Phase 2 operational table, Phase 3 enterprise backlog 설계 초안을 작성했다.
- 2026-06-04: 사용자가 "다기능 고성능 오픈소스 데이터 테이블"을 목표로 확정했다. 이전 축소형 MVP 해석은 폐기하고, AG Grid Enterprise와 MUI X Premium급 기능군을 자체 구현하는 신규 React data grid 방향으로 초안을 재작성했다.
- 2026-06-04: Header size/position save-load, Row position moving, Row right-click context menu를 설계 초안에 추가했다.
- 2026-06-04: source 하네스에 TDD 필수, failing required tests completion block, no external grid wrapper, browser-capable verification requirement를 반영했다.
- 2026-06-04: 테스트/문서 playground는 charts-style developer playground를 참고하되 data-table 전용 20/80 layout, feature menu, selected-feature keyed destroy/recreate를 요구사항으로 추가했다.
- 2026-06-04: 초기 개발 단계는 `docs/agents/src/2026-06-04-basic-features-implementation-plan.md`에 기록하고, 이번 구현 범위는 기본 기능으로 제한한다.
- 2026-06-04: 기본 기능 1차 구현으로 `src/core.ts`, `src/index.tsx`, 최소 playground, Vitest, jsdom interaction test, Playwright e2e를 추가했고 `verify:full`과 pack smoke가 통과했다.
- 2026-06-05: 잔여 리스크 종료 작업에서 React primary prop을 `data`로 추가하고 `rows`는 호환 alias로 유지했다. `onDataChange`는 내부 row/cell/range clipboard mutation을 외부 `useState` 또는 외부 Store state로 되돌리는 통로다.
- 2026-06-05: selection은 row identity 변경과 full refresh 시 초기화한다. 값만 바뀌는 `updateKmsfRows` 경로는 selection을 유지한다.
- 2026-06-05: `selectKmsfCellRange`, `getKmsfSelectedCellRange`, `copyKmsfCellRange`, `pasteKmsfCellRange`, `fillKmsfCellRange`를 core에 추가했다. Visual fill handle UI는 아직 별도 후속 작업이다.
- 2026-06-05: package export subpath는 `@kmsf/data-table/core`, `@kmsf/data-table/clipboard`, `@kmsf/data-table/selection`을 제공한다. Package metadata `private: true`와 MIT 전환은 MS 요청으로 보류했다.
- 2026-06-05: public API 재설계로 `rows`, `defaultRows`, `defaultData` 호환 alias는 제거한다. React component의 row 입력은 `data`로 통일하고 내부 mutation은 즉시 render 후 `onChangeData(nextData)`로 알린다.
- 2026-06-05: 이벤트는 emitter 방식이 아니라 React prop 방식으로 제공한다. 상태 변경 이벤트는 `onChangeData`, `onChangeSelection`, `onChangeColumnLayout`, `onChangeSort`이고 사용자 액션 이벤트는 `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell`, `onClickRow`, `onDoubleClickRow`, `onContextMenuRow`, `onKeyDownRow`다.
- 2026-06-05: column schema는 `id`, `label`, `field`, `sort`, `props`, `format`, `header`로 통일한다. `id`는 optional이며 없으면 `field`를 id로 사용한다. `field`는 string이고 nested path를 지원한다.
- 2026-06-05: column layout save/load와 sort/selection 제어는 ref method로 제공한다. `setSelectedRow(index)`, `setSelectedRows(indexes)`는 화면에 보이는 visible row index 기준이다.

## Context Compaction Checkpoint

- 다음 에이전트는 패키지 root `AGENTS.md`를 먼저 읽고, 이 도메인의 `research.md`와 `plan.md`를 확인한 뒤 작업한다.
- instruction-only 변경은 TDD 예외지만, 구조 검증과 리포트 기록은 유지한다.
- data-table 기능 구현으로 들어가기 전에는 `docs/agents/src/2026-05-28-data-table-feature-design-draft.md`를 검토하고 Milestone 0/1 범위를 별도 implementation plan으로 확정한다.
- 외부 grid를 래핑하는 방향, AG Grid Enterprise 기능을 제외하는 방향, KMSF 내부용 축소 table 방향은 현재 목표와 맞지 않는다.
- Header layout persistence, row ordering, row context menu는 Milestone 2 Operational Grid 후보이며, 구현 전 row model별 compatibility rule을 별도 계획에 포함한다.
- `@kmsf/data-table`은 `charts`와 별개의 package다. package 하네스는 KMSF root 하네스를 상속하고, data-table 전용 설계/검증 규칙만 package-local 문서에 둔다.
- source behavior 구현 전에는 설계 초안 non-negotiable principles와 forbidden list를 같이 확인한다.
- playground 구현 전에는 메뉴 전환 시 이전 content unmount와 새 content recreate를 Playwright RED test로 먼저 고정한다.
- 기본 기능 구현은 core store, column layout, pagination, row/cell clipboard helper, virtualization range를 우선 구현하고 advanced grid feature는 후속 단계로 분리한다.
- 다음 단계는 shadcn/ui controls를 적용한 full playground 문서 화면 또는 Header/Row/Cell 세부 기능의 e2e coverage 확장이다.
- 현재 playground는 shadcn-compatible local components와 Tailwind v4 PostCSS scaffold를 package runtime 밖에 둔다. Runtime `src`는 Radix/shadcn/Tailwind import를 갖지 않는다.
- 다음 구현은 `docs/superpowers/plans/2026-06-05-data-table-api-redesign.md`와 `.part-2.md`를 기준으로 TDD 진행한다. Multi-column sort는 아직 구현 범위가 아니다.
