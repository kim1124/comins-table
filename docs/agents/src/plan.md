# @kmsf/data-table Source Plan

## Active Plan

- 2026-06-27: Chrome DevTools Performance Monitor 기준 memory leak full audit follows `docs/agents/src/2026-06-27-devtools-memory-leak-full-audit-plan.md`. `ask-plan` decisions are closed: final acceptance is 10% or less after GC for JS heap, DOM Nodes, and listeners against a warmed basic baseline; compare every data-table feature path; audit all package-owned code before declaring closure.
- 2026-06-25: immutable `data` contract and 100,000-row large-data gate follow `docs/agents/src/2026-06-25-immutable-data-100k-performance-plan.md`. `ask-plan` decisions are closed: use 100,000 rows for playground/docs/perf gates, keep current `data` array contract, remove full incoming row clone, do not use `Object.freeze`, document array replacement as the supported update path, and defer lazy/index row id mode.
- 2026-06-25: large row virtualization performance fix follows `docs/agents/src/2026-06-25-large-row-virtualization-performance-plan.md`. `ask-plan` decisions are closed: keep current `data` array contract, exclude column virtualization, use rAF scroll commit plus translated visible row block, and allow internal body DOM changes without public API changes. 2026-06-27 supersedes its acceptance wording: Playwright CDP metrics are supporting automation, while Chrome DevTools Performance Monitor after-GC numbers remain the final acceptance signal.
- 2026-06-24: virtual-list More/Search/full virtual scroll selection gate follows `docs/agents/src/2026-06-24-virtual-list-selection-gate-plan.md`. `ask-plan` decisions are closed: More, Search, and full virtual scroll are enabled only for a single selected row; no selection or multi-selection renders up to 5 preview items and shows `...` only when item count exceeds 5.
- 2026-06-24: Cell Input/Select single-row-selection gate, global 50px effective minimum column width, and visible-only sort indicator spacing follow `docs/agents/src/2026-06-24-input-select-minwidth-sort-indicator-plan.md`. `ask-question` / `ask-plan` decisions are closed: this is data-table default behavior, the global minimum is fixed at 50px, and unsorted indicators do not reserve layout space.
- 2026-06-24: component renderer header/cell alignment, header slot order, Td Cell resize, and playground component layout containment fixes follow `docs/agents/src/2026-06-24-component-renderer-playground-layout-plan.md`. `ask-plan` decisions are closed: repeated component Card samples are retained, header DOM separation is allowed, header default slot is left, cell default alignment is center, and Td Cell `maxWidth` is removed.
- 2026-06-23: virtualized body large-jump scroll stutter and component column first-move resize jump fix follows `docs/agents/src/2026-06-23-virtual-scroll-resize-performance-plan.md`. `ask-question` / `ask-plan` decisions are closed, and the plan requires RED Playwright tests before production changes.
- 2026-06-04: 이전 package 참조 표현을 제거하고 KMSF repo root `AGENTS.md`/`GUIDE.md` 하네스 기준으로 정렬한다.
- 이번 단계는 instruction-only 변경이며 production code 변경은 포함하지 않는다.
- 2026-05-28: AG Grid와 MUI X Data Grid 공식 기능을 분석해 `docs/agents/src/2026-05-28-data-table-feature-design-draft.md`에 설계 초안을 작성한다.
- 이번 단계는 design-doc-only 변경이며 production code 변경은 포함하지 않는다.
- 사용자 검토 후 Phase 1 범위만 별도 implementation plan으로 분리한다.
- 2026-06-04: 사용자가 "wrapper가 아니라 다기능 고성능 오픈소스 신규 React 테이블"이라고 방향을 확정했다. 기존 초안의 축소형 MVP 전제를 제거하고 full-feature open-source data grid 설계로 재작성한다.
- 다음 implementation plan은 Milestone 0 engine foundation과 Milestone 1 visible grid baseline을 대상으로 한다.
- 2026-06-04: Header size/position save-load, Row position moving, Row right-click context menu를 feature 설계에 추가한다.
- 2026-06-04: 설계 초안 기반 source 작업의 TDD 필수, 실패 테스트 완료 금지, 외부 grid wrapper 금지, browser verification gate를 하네스에 추가한다.
- 2026-06-04: 테스트/문서 playground는 charts-style developer playground를 참고하되, 20/80 layout, feature menu, menu-keyed destroy/recreate contract를 data-table 전용 기준으로 추가한다.
- 2026-06-04: 초기 개발은 `docs/agents/src/2026-06-04-basic-features-implementation-plan.md`를 기준으로 기본 기능만 구현한다.
- 2026-06-05: 잔여 리스크 종료 구현은 `docs/agents/src/2026-06-05-residual-risk-closure-plan.md`를 기준으로 진행한다. MIT/public package metadata 전환은 MS 요청으로 보류하고, `data`/`onDataChange`, selection 초기화, range selection, multi-cell clipboard, fill helper, subpath exports, shadcn/Tailwind playground scaffold, lifecycle smoke는 구현 범위에 포함한다.

## Planning Rules

- 구현 전 Superpowers brainstorming으로 범위와 성공 기준을 확인한다.
- behavior, bugfix, refactor에는 Superpowers TDD를 적용한다.
- 잘못된 RED, 예상과 다른 실패, 검증 blocker는 코딩 전에 사용자에게 보고한다.
- 계획이 500줄 이상이면 `plans/00_<name>.md`처럼 분할한다.

## Verification Notes

- 문서만 변경하는 작업은 TDD 예외다.
- 코드나 설정이 바뀌면 패키지별 `AGENTS.md`의 verification command를 따른다.
- 이번 설계 초안 작업의 최소 gate는 문서 파일 존재, line count, source-domain 문서 업데이트, report 기록이다.
- runtime source가 바뀌지 않았더라도 package baseline 확인이 가능하면 `npm --workspace=@kmsf/data-table run verify`를 실행한다.
- 설계 문서만 바뀌어도 no-wrapper, full-feature target, open-source readiness, browser/performance verification gate가 문서에 남아 있는지 확인한다.
- Header/Row 기능 추가 시 component area requirements, feature modules, milestone, research/memory/report가 함께 갱신되었는지 확인한다.
- 하네스 문서 변경 시 다른 package를 실행 기준으로 삼는 표현이 active docs에 남아 있지 않은지 확인한다. 단, chart integration 같은 data grid 기능명은 유지한다.
- source 작업 plan은 focused RED command, expected failure reason, required baseline verify, browser gate 적용 여부를 포함해야 한다.
- playground implementation plan은 현재 `기본`, `CRUD 동작`, `테이블 사이즈`, `Header 예제`, `대용량 데이터 표시`, `Td Cell 예제`, `컴포넌트 예제`, `Tr Row 예제`, `Context Menu 예제` menu와 content remount Playwright coverage를 포함해야 한다.
- basic feature implementation은 core store 테스트를 먼저 작성하고 missing export RED를 확인한 뒤 최소 production code를 작성한다.
- React rendered interaction은 Vitest jsdom 테스트와 Playwright browser 테스트를 모두 둔다. 특히 range drag는 jsdom event와 Chromium pointer path가 다르므로 browser spec을 생략하지 않는다.

## 2026-06-05 API Redesign Decisions

- Unified data prop: use `data`; remove `rows`, `defaultRows`, `defaultData`.
- Internal edits render immediately and call `onChangeData(nextData)`.
- Parent `data` prop change overwrites internal working data.
- Event props use React-style props, not emitter registration.
- State-change event names use `onChangeXxx`.
- User action event names use verb-first names: `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell`, `onClickRow`, `onDoubleClickRow`, `onContextMenuRow`, `onKeyDownRow`.
- Column layout is controlled through ref methods: `getColumnLayout`, `setColumnLayout`.
- Selection methods use visible row indexes: `setSelectedRow(index)`, `setSelectedRows(indexes)`.
- Column schema is `id`, `label`, `field`, `sort`, `props`, `format`, `header`.
- `id` is optional; default id is `field`.
- `field` is a string and supports nested paths.
- `rowProps.disabled` blocks all row and cell interactions for that row.
- `column.props.disabled` blocks all cell interactions for that column cell.
- Single-column sort is in scope; multi-column sort is deferred.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
