# @kmsf/data-table Example Plan

## Active Plan

- 2026-06-25: large-data playground control follows `docs/agents/src/2026-06-25-immutable-data-100k-performance-plan.md`; current examples expose 100,000 rows only, and older 1,000,000-row playground/perf gates are historical context.
- 2026-06-24: Component Input/Select examples must reflect package default single-row-selection gating, global 50px minimum column width, and visible-only sort indicator spacing from `docs/agents/src/2026-06-24-input-select-minwidth-sort-indicator-plan.md`.
- 2026-06-24: component example repeated Card structure is retained, but its layout containment must match other playground examples. Header slot order, header default left alignment, cell default center alignment, Td Cell resize by removing fixed `maxWidth`, and playground containment follow `docs/agents/src/2026-06-24-component-renderer-playground-layout-plan.md`.
- 2026-06-23: playground component/layout 수정과 100만 row large jump scroll 성능 개선은 `docs/agents/example/2026-06-23-playground-component-virtual-scroll-plan.md`를 따른다. `ask-research` / `ask-question` / `ask-plan` gate는 닫혔으며, large-data 예제는 대용량 의미를 유지한다.
- 2026-06-19: playground visibility 개선 계획은 `Playground Visibility TDD Plan` 섹션을 따른다. `ask-plan`/`ask-question` gate는 닫혔으며, 사용자 결정은 `docs/agents/example/research.md`의 `2026-06-19 Playground Visibility Research`에 기록했다.
- 2026-06-05: 사용자용 playground와 `docs/user` 문서 구현을 완료했다. 후속 변경은 `test/user-docs.test.ts`와 `test/playwright/specs/user-playground-docs.spec.ts`를 먼저 갱신한 뒤 TDD로 진행한다.
- 2026-06-05: 실제 구현 실행 순서는 `docs/agents/example/2026-06-05-user-playground-docs-implementation-execution-plan.md`를 따른다. 이 문서는 RED/GREEN 테스트, feature component 분리, 사용자 문서 작성, 최종 verify gate를 단계별로 정의한다.
- 2026-06-05: 사용자용 playground와 `docs/user` 문서 작성은 `docs/agents/example/2026-06-05-user-playground-docs-plan.md`를 따른다. 현재 구현된 core 기능을 모두 feature page와 user doc으로 매핑한다.
- 2026-06-04: 테스트 및 문서 playground는 charts-style developer playground를 참고하되 data-table 전용 20/80 layout과 feature-menu keyed remount contract를 따른다.
- 2026-06-04 계획 단계는 design-doc-only 변경이었고, 2026-06-05 구현 단계에서 README, `docs/user`, example feature components, user docs/playground tests를 추가했다.

## Playground Visibility TDD Plan

### Goal

- Reduce non-sample vertical chrome in the playground so the sample data tables become the primary visible content.
- Preserve the existing data-table implementation and public API; this plan targets the `example` playground and related docs/tests only.

### Scope

- In scope:
  - `example/src/main.tsx`
  - `example/src/styles.css`
  - `example/src/features/*Feature.tsx`
  - `example/src/features/featureRegistry.tsx`
  - `example/src/features/types.ts`
  - `example/src/components/FeatureControls.tsx`
  - `example/src/components/OptionGuideSection.tsx` if the option guide shell needs the same layout contract
  - Playground Playwright tests under `test/playwright/specs`
  - Scope-local report `reports/YYYY-MM-DD.md`
- Out of scope:
  - Public `KmsfDataTable` API changes
  - New table/grid dependency
  - Server-side row model or data-layer changes
  - Broad style refactor unrelated to playground visibility

### Required Behavior

- Header right area contains the `기능 예제` / `옵션 가이드` toggle-style controls.
- Header right `React Table Playground` button is removed.
- The tab bar below the header is removed so that area becomes usable content height.
- Left feature menu uses feature-specific icons, including collapsed state.
- Feature controls render in one horizontal row and use horizontal scroll when overflown.
- Feature option content renders as repeated option containers, not as the old HTML option table.
- Each option container contains:
  - option/function heading
  - divider
  - concise explanation of relevant props, supported behavior, and methods
  - a data table sample
- Repeated option containers use vertical page/content scrolling when they exceed browser height.
- Option sample data tables provide at least 500px height.
- General playground data tables use `width: 100%`, `min-height: 300px`, and `max-height: 100%` relative to their parent container.
- Resize/browser-responsive examples use parent or browser height `100%` behavior instead of fixed sample-only height.
- Non-informative description rows above component sample tables are removed from the flow.
- Browser console warnings, browser errors, hydration errors, and visible responsive layout breakage are completion blockers.

### TDD Sequence

1. RED: Update playground shell tests.
   - Assert the header contains the view toggle controls.
   - Assert there is no header-below `.workspace-tabs__bar`.
   - Assert `React Table Playground` is absent.
   - Assert switching to `옵션 가이드` still works from the header toggle.
   - Expected RED reason: current `main.tsx` renders tabs below the header and still renders the old button.

2. RED: Update feature option layout tests.
   - Assert the old `feature-option-table` is absent.
   - Assert option containers are repeated per feature option.
   - Assert each option container exposes heading, divider, explanation, and sample table area.
   - Assert option sample table area is at least 500px tall.
   - Expected RED reason: current feature intro renders a compact HTML option table and does not create per-option sample containers.

3. RED: Update control-row tests.
   - Assert controls remain a single horizontal row.
   - Assert overflow uses horizontal scroll instead of wrapping into a second row.
   - Expected RED reason: current `FeatureControls` separates options/actions and allows wrapping.

4. RED: Update table sizing tests.
   - Assert data table roots use content-relative full width.
   - Assert general examples use min-height 300px and max-height 100% parent constraints.
   - Assert resize/browser-responsive examples use parent or browser height behavior.
   - Expected RED reason: current sizing rules mix fixed sample heights and existing size examples still include fixed manual cases.

5. RED: Update collapsed menu icon tests.
   - Assert each feature menu item has a distinct icon or feature-specific icon identity in collapsed mode.
   - Expected RED reason: current navigation uses the same `TableProperties` icon for every feature.

6. RED: Update component example tests.
   - Assert component example description rows such as `Header와 Cell에서 클릭 이벤트를 받는 버튼 컴포넌트 예제입니다.` are removed from the visible sample flow.
   - Assert the data table sample remains visible and interactive.
   - Expected RED reason: current `ComponentFeature` renders a `feature-doc` text card before every component table.

7. GREEN: Implement the smallest playground changes required for the RED tests.
   - Keep feature state inside feature boundaries.
   - Preserve keyed feature content destroy/recreate behavior.
   - Prefer existing `KmsfDataTable`, existing fixtures, and existing UI primitives.
   - Avoid new dependencies.

8. Refactor only after focused tests are green.
   - Consolidate duplicate option-container rendering only if it reduces repetition without widening scope.
   - Keep CSS changes localized to playground selectors.

### Verification Matrix

| Requirement | Focused Evidence | Browser Proof |
| --- | --- | --- |
| Header toggle replaces below-header tabs | Playwright shell test | toggle role/state, no `.workspace-tabs__bar` |
| Header button removed | Playwright shell test | no `React Table Playground` button |
| Option containers replace HTML table | Playwright option layout test | no `feature-option-table`, repeated option containers visible |
| Option sample height | Playwright geometry assertion | option sample box height >= 500 |
| Controls stay one row | Playwright geometry assertion | all control items share row bounds or overflow-x is scrollable |
| Tables are full-width | Playwright geometry assertion | table width equals content/parent width within tolerance |
| General table height contract | Playwright CSS/geometry assertion | min-height 300, max-height parent 100% behavior |
| Resize examples use parent/browser height | Playwright viewport resize assertion | table height follows parent/browser height |
| Collapsed menu identifiable | Playwright collapsed-nav assertion | feature-specific icon identity remains visible |
| Component description rows removed | Playwright component page assertion | text rows absent, sample table remains interactive |
| Browser diagnostics clear | Shared diagnostics collector | diagnostics array empty |

### Verification Commands

- Focused during TDD:
  - `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/basic-playground.spec.ts test/playwright/specs/playground-layout-polish.spec.ts`
  - Add the smallest relevant spec commands for changed feature pages, such as `component-renderer.spec.ts`, `user-playground-docs.spec.ts`, and `playground-content-docs.spec.ts`.
- Baseline:
  - `npm run verify`
- Full browser gate:
  - `npm run verify:full`
  - If sandbox blocks `127.0.0.1:4002` with `listen EPERM`, rerun the same command with approved external execution and record both results.

### Residual Risks To Track

- The new option-container pattern may increase total scroll length; Playwright must verify vertical scroll remains content-local and page-level scroll does not break the shell.
- Header-toggle relocation changes existing tab semantics; accessibility role and keyboard navigation must be verified.
- One-row controls can hide actions behind horizontal scroll on narrow widths; Playwright must verify overflow access on desktop and mobile widths.
- Multiple 500px option samples can increase rendering cost; avoid loading unnecessarily large datasets in non-active samples.

### Ask Gate

- `ask-plan` and `ask-question` decisions are closed for this plan.
- No unresolved product, UX, data, auth, migration, or operation decision remains before implementation.

## Planning Rules

- playground 구현 전 focused Playwright RED test로 layout, menu, destroy/recreate, diagnostics gate를 먼저 고정한다.
- parent shell은 selected feature id와 aside state만 소유한다.
- selected content 영역은 feature id로 keying하고, feature별 fixture, editor, timer, context menu state를 boundary 안에 둔다.
- 같은 feature 재선택은 no-op이다.
- 계획이 500줄 이상이면 `plans/00_example-plan.md`로 분할한다.

## Verification Notes

- browser-capable verification 없이 playground interaction을 완료하지 않는다.
- Playwright coverage는 `Basic -> Header -> Basic CRUD` 같은 교차 메뉴 이동을 포함한다.
- 이전 content, editor value, timer side effect, context menu, hidden table instance가 남으면 실패로 본다.
- package baseline은 `npm --workspace=@kmsf/data-table run verify`로 확인한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
