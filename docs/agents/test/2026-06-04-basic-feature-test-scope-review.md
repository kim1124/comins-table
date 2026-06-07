# Basic Feature Test Scope Review

## Status

- Date: 2026-06-04
- Scope: `@kmsf/data-table` 기본 기능 1차 구현 이후 적용할 테스트 목록을 협의하기 위한 문서다.
- Approval status: 2026-06-04 사용자 승인 완료. 이 문서는 다음 TDD 구현 범위를 고정한다.
- Implementation status: 2026-06-04 TDD로 BT-01부터 BT-12까지 구현 및 검증 완료.

## Confirmed Decisions

- Playground는 메뉴별 content boundary를 유지한다. 같은 메뉴 재클릭은 no-op이고, 다른 메뉴 선택 시 이전 content를 destroy하고 새 content를 recreate한다.
- 현재 구현된 기본 기능 테스트는 BT-01부터 BT-12까지 모두 적용한다.
- Runtime context menu는 callback만 제공한다. Playground 예제에서는 shadcn menu UI로 callback 사용 예제를 제공한다.
- Row/Cell selection과 clipboard는 가능하면 Basic 범위에서 확장한다.
- Virtualization 검증은 100,000 rows와 1,000,000 rows를 모두 대상으로 한다.
- 제품명은 `@kmsf/data-table`로 고정한다.
- Store는 내부 `useState`만 전제로 하지 않고 외부 store 연동 가능성을 검토한다.
- Row paste 기본 동작은 insert-after다. 명시적으로 기존 row를 overwrite하는 paste mode에서는 target row id를 유지한다. Cell paste는 target cell overwrite를 기본으로 한다.
- Clipboard는 column별 copy/paste 제한 옵션을 고려한다.
- Layout persistence는 column 표시/숨김, column 위치, column 너비를 대상으로 한다. Row order persistence는 제외한다.
- Playground에는 shadcn scaffold와 Tailwind 환경을 도입한다. Runtime core에는 shadcn 의존성을 넣지 않는다.
- License 목표는 MIT다.
- React peer dependency는 React 18 이상과 최신 React 호환을 목표로 한다.
- Core는 중심 기능만 포함한다. Excel, charts, AI assistant 같은 부가 기능은 subpath export 또는 별도 extension으로 분리한다.
- Public component name은 `<KmsfDataTable>`을 유지한다. `<KmsfDT>`는 축약어라 검색성, 문서성, public API 명확성이 떨어진다.

## Proposed Test Buckets

### Apply In Next Basic Test Pass

| ID | Area | Test Type | Target Files | Behavior To Lock |
| --- | --- | --- | --- | --- |
| BT-01 | Core data update | Vitest | `test/basic-core.test.ts` | full refresh, keyed partial update, add, update, delete, query가 row id를 안정적으로 유지한다. |
| BT-02 | Column layout persistence | Vitest | `test/basic-core.test.ts` | column 표시/숨김, column 위치, column 너비를 serialize/restore한다. Row order는 persistence payload에 넣지 않는다. |
| BT-03 | Selection model | Vitest | new `test/selection-core.test.ts` | row selection과 cell selection을 분리하고 single selection, toggle, clear를 검증한다. |
| BT-04 | Clipboard model | Vitest | new `test/clipboard-core.test.ts` | row copy 후 insert-after paste, cell copy 후 overwrite paste를 검증한다. |
| BT-05 | Clipboard restrictions | Vitest | `test/clipboard-core.test.ts` | column별 `copyable`, `pasteable` false일 때 copy/paste가 차단된다. |
| BT-06 | React selection interaction | jsdom Vitest | `test/table-interaction.test.tsx` | row/cell click, keyboard focus, Ctrl+C/V가 selection state와 clipboard helper를 일관되게 사용한다. |
| BT-07 | Context menu callback | jsdom Vitest | `test/table-interaction.test.tsx` | row/cell right-click callback이 row id, column id, raw row data를 정확히 전달한다. |
| BT-08 | Playground lifecycle | Playwright | `test/playwright/specs/basic-playground.spec.ts` | same menu no-op, different menu destroy/recreate, stale content absence, browser diagnostics empty를 검증한다. |
| BT-09 | shadcn context menu example | Playwright | new `test/playwright/specs/context-menu.spec.ts` | playground에서 shadcn menu가 callback 기반으로 열리고 메뉴 선택 후 stale menu가 남지 않는다. |
| BT-10 | Header interactions | Playwright | new `test/playwright/specs/header-basic.spec.ts` | header resize, column position change, layout callback, layout restore를 browser에서 검증한다. |
| BT-11 | Row reorder | Playwright | new `test/playwright/specs/row-basic.spec.ts` | row drag reorder가 화면 순서를 바꾸고 row id를 보존한다. Row order persistence는 발생하지 않는다. |
| BT-12 | Virtualization 100k/1M | Playwright | new `test/playwright/specs/virtualization.spec.ts` | 100,000 rows는 `verify:full` smoke로 검증하고, 1,000,000 rows는 별도 `test:perf`에서 visible row window, scroll movement, diagnostics empty를 검증한다. |

### Apply After Basic Test Pass

| ID | Area | Test Type | Target Files | Behavior To Lock |
| --- | --- | --- | --- | --- |
| AT-01 | External store adapter | Vitest + jsdom | new `test/store-adapter.test.tsx` | external store의 `getSnapshot`, `subscribe`, `dispatch`가 React rendering과 동기화된다. |
| AT-02 | Memory leak smoke | Playwright | new `test/playwright/specs/lifecycle-soak.spec.ts` | 메뉴 전환 반복 후 stale DOM, stale menu, stale listener counter, console error가 남지 않는다. |
| AT-03 | Tailwind/shadcn scaffold | Playwright | `test/playwright/specs/basic-playground.spec.ts` | shadcn scaffold 적용 후 menu, context menu, layout이 visual break 없이 동작한다. |
| AT-04 | MIT/package metadata | Vitest | new `test/package-contract.test.ts` | package metadata가 MIT, React peer range, core-only dependency 정책을 지킨다. |
| AT-05 | Subpath export boundaries | Vitest | new `test/public-api-boundary.test.ts` | heavy feature가 core entry에 포함되지 않고 subpath export 후보로 분리된다. |

### Keep For Later Feature Milestones

| ID | Area | Reason |
| --- | --- | --- |
| LT-01 | Excel export/import | Basic 범위를 넘어서는 부가 기능이며 core bundle 밖에서 설계한다. |
| LT-02 | Charts integration | `@kmsf/charts`와 연결 가능한 extension 후보지만 basic gate 이후로 둔다. |
| LT-03 | AI assistant | core와 분리해야 하는 optional extension이다. |
| LT-04 | Server-side row model | external store/data source architecture 확정 후 별도 feature plan으로 진행한다. |
| LT-05 | Grouping/aggregation/pivot/tree/master-detail | analytical grid milestone에서 별도 테스트 계획을 만든다. |

## Approved Implementation Set

다음 구현 단계에서 바로 적용할 세트는 BT-01부터 BT-12까지다.

이 세트는 현재 구현된 기본 기능을 명확하게 고정하고, MS님이 지정한 selection/clipboard, 100k/1M virtualization, shadcn context menu example, 메뉴별 lifecycle 검증을 포함한다.

## Resolved Decisions Before Writing Tests

1. Row paste insert-after 시 새 row id는 기본적으로 source row id에 `-copy-<n>` suffix를 붙인다. 소비자는 `getPastedRowId`로 override할 수 있다.
2. 기존 row overwrite paste mode에서는 target row id를 유지한다.
3. Column별 clipboard 제한 옵션 이름은 `copyable?: boolean | predicate`, `pasteable?: boolean | predicate`로 한다.
4. Selection model의 최소 범위는 Basic에서 single row, multi row, single cell, clear까지 포함한다. Range selection은 다음 단계로 둔다.
5. 1,000,000 rows Playwright test는 기본 `verify:full`에 포함하지 않고 별도 `test:perf`로 분리한다. 기본 `verify:full`에는 100,000 rows smoke를 둔다.
6. Public component name은 `KmsfDataTable`로 유지한다. Package name은 `@kmsf/data-table`로 고정한다.

## Deferred Decisions

1. Range selection, fill handle, multi-cell clipboard는 Basic 이후 별도 협의한다.
2. External store adapter의 구체 API는 Basic test pass 이후 별도 plan에서 확정한다.

## Verification Rule

- 각 테스트는 production code보다 먼저 RED로 추가한다.
- RED 실패 사유가 의도와 맞는지 확인한 뒤 production code를 수정한다.
- 기본 기능 확장 후에는 `npm --workspace=@kmsf/data-table run verify:full`을 통과해야 한다.
- 1,000,000 rows test가 별도 command로 분리되면 해당 command는 report에 pass/fail을 따로 남긴다.
