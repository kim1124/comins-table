# Playground 상호작용 및 예제 품질 보정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playground에서 확인된 정렬·선택·Header 이동·Context Menu·Loading/Empty·Row Expand·Tree Grid 문제를 보정하고, 일반 예제를 30 Row 기준으로 통일한다.

**Architecture:** 공개 `CominsTable` API와 application-owned `data`/callback 흐름은 유지한다. 실제 상호작용 계약은 `src/index.tsx`와 배포 `styles.css`에서 보정하고, fixture·컨트롤·설명은 `example/`에 한정한다. Row ID 기반 selection, 기존 Column move helper, 기존 Row Detail virtualization을 재사용하며 새 npm 의존성이나 아이콘 모듈은 추가하지 않는다.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Vitest, Testing Library, Playwright

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-08-03-playground-quality-remediation-design.md`다.
- 공개 export path, props, types, `data`/callback ownership, client-only boundary를 변경하지 않는다.
- 외부 아이콘 의존성 또는 공통 SVG 아이콘 모듈을 추가하지 않는다. 정렬은 CSS triangle, Tree는 기존 text glyph를 사용한다.
- mouse drag intent `6px`, touch long-press, Escape/pointer cancellation 계약을 유지한다.
- Row Expand를 Popover로 바꾸지 않는다. semantic Detail Row와 variable-height virtualization 계약을 유지한다.
- 일반 예제는 30 Row로 맞추되 정렬·빈 상태·pagination·lazy load·infinite scroll·Row Expand·Tree의 집중 fixture는 목적에 맞는 크기를 유지한다.
- 브라우저 extension의 `runtime.lastError`는 제품 코드에서 억제하지 않는다. 같은 오류가 깨끗한 Playwright context에서 재현될 때만 별도 결함으로 분리한다.
- 신규 의존성, 버전 변경, publish, tag, GitHub Release, push, PR, merge는 범위 밖이다.
- 각 Task는 실패하는 focused test를 먼저 추가하고, 최소 구현 후 해당 test를 다시 통과시킨다.
- Core/CSS 또는 테스트 계약을 의미 있게 변경한 뒤에는 최종 단계에서 `npm run verify`와 ordinary E2E 전체를 한 번 실행한다.

## Acceptance Criteria

- 정렬 아이콘은 찌그러지지 않는 filled triangle이며 `asc`/`desc`와 `aria-sort`가 일치한다.
- 정렬과 Virtual List의 `More` 동작 뒤에도 Row ID selection과 선택 배경이 유지된다.
- Cell range를 확장해도 선택 Row 배경이 사라지지 않고 range 경계가 함께 보인다.
- Header drag source는 원래 너비의 어두운 placeholder를 표시하고, 유효 target과 invalid cross-depth target이 시각적으로 구분된다.
- Context Menu는 선택 0/1/N에 맞춰 `조회/추가/수정/삭제`를 활성화하고 Alert에 선택한 기능명을 표시한다.
- CRUD의 불명확한 Owner 필터를 제거하고, Header Group 컨트롤을 parent Checkbox와 child MultiSelect로 분리한다.
- Loading ready/refetch와 일반 예제는 deterministic 30 Row data를 사용한다.
- 960px Row Detail은 480px Table frame 안에서 scroll되며 후속 Row에 도달할 수 있다.
- Tree Grid expander hit area가 최소 24px이고, ref 제어 예제를 제외한 Tree 예제는 처음부터 펼쳐진다.
- 한글·영문 사용자 문서가 변경된 공개 동작을 동일하게 설명하고 관련 전체 검증이 통과한다.

## Task 1: 정렬 표시와 Row/Cell 선택 시각 계약 보정

**Files:**

- Modify: `styles.css`
- Modify: `example/src/styles.css`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/playwright/specs/crud-playground.spec.ts`
- Modify: `test/playwright/specs/header-quality.spec.ts`
- Modify: `test/playwright/specs/selection-style.spec.ts`
- Verify: `test/playwright/specs/component-renderer.spec.ts`

**Interfaces:**

- `.comins-sort-icon` DOM, `aria-sort`, sort state callback은 유지한다.
- `--comins-table-row-selected-background`는 기존 Theme별 값과 호환한다.
- 새 CSS 변수는 내부 스타일 토큰으로만 추가하며 TypeScript 공개 API를 만들지 않는다.
- Virtual List `More`는 기존처럼 해당 Row를 exclusive selection한다.

- [x] `test/table-interaction.test.tsx`의 기존 테스트로 SVG·문자 glyph 없이 `.comins-sort-icon` span과 `aria-sort`가 `none → ascending → descending`으로 전환되는 계약을 확인한다.

```tsx
expect(header).toHaveAttribute("aria-sort", "ascending");
expect(header.querySelector(".comins-sort-icon")).toBeInstanceOf(HTMLSpanElement);
expect(header.querySelector("svg")).toBeNull();
```

- [x] `header-quality.spec.ts`에 `::before`의 border geometry가 filled triangle이고 descending에서 container transform이 뒤집히는 실패 테스트를 추가한다.

```ts
const triangle = await nameHeader.evaluate((element) => {
  const icon = element.querySelector<HTMLElement>(".comins-sort-icon")!;
  const pseudo = getComputedStyle(icon, "::before");
  return {
    borderBottomWidth: pseudo.borderBottomWidth,
    borderLeftWidth: pseudo.borderLeftWidth,
    borderRightWidth: pseudo.borderRightWidth,
    transform: getComputedStyle(icon).transform,
  };
});
expect(triangle.borderBottomWidth).not.toBe("0px");
```

- [x] `selection-style.spec.ts`와 `crud-playground.spec.ts`에서 같은 stable Row ID를 선택하고 정렬 전후 `aria-selected`, `.comins-row-selected`, computed background가 유지되는 회귀 테스트를 보강한다. 신고 현상이 재현되지 않아 Core selection 코드는 변경하지 않고 테스트만 계약으로 남긴다.

- [x] `selection-style.spec.ts`에 Row를 선택한 다음 다른 Cell까지 range drag하여 selected Row class와 range Cell outline/background를 함께 검증하는 실패 테스트를 추가한다.

- [x] `styles.css`의 chevron pseudo-elements를 하나의 filled triangle로 교체하고 descending은 `.comins-sort-icon` transform만 뒤집도록 한다.

```css
.comins-sort-icon::before {
  border-bottom: 6px solid currentColor;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  content: "";
  display: block;
  height: 0;
  width: 0;
}

.comins-sort-icon::after {
  content: none;
}
```

- [x] Theme root에 `--comins-table-selected-range-background`를 추가하고 selected Row의 range Cell은 Row 배경을 유지하면서 inset outline로 range를 표시한다. 사용자 지정 Row background가 있는 경우 기존 `data-comins-row-custom-background` 우선순위를 보존한다.

```css
.comins-table__tr.comins-row-selected > .comins-table__td.comins-cell-range-selected {
  background: var(--comins-table-selected-range-background);
  box-shadow: inset 0 0 0 2px var(--comins-table-accent);
}
```

- [x] `example/src/styles.css`에서 위 배포 selector를 중복 정의하는 sort/selected/range 블록을 제거하여 Core state style의 단일 소스를 `styles.css`로 만든다. Playground layout 전용 selector는 유지한다.

- [x] focused unit/browser tests를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts test/playwright/specs/selection-style.spec.ts test/playwright/specs/component-renderer.spec.ts --workers=1
npm run test:e2e -- test/playwright/specs/crud-playground.spec.ts --workers=1
```

- [x] 로컬 commit `515e6ec`을 생성한다.

```bash
git add styles.css example/src/styles.css test/playwright/specs/crud-playground.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/selection-style.spec.ts
git commit -m "fix: preserve table selection visual states"
```

## Task 2: Header drag placeholder와 valid/invalid target 상태 분리

**Files:**

- Modify: `src/index.tsx`
- Verify: `src/column-pointer.ts`
- Modify: `styles.css`
- Modify: `example/src/styles.css`
- Verify: `test/column-pointer.test.ts`
- Modify: `test/basic-core.test.ts`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/header-quality.spec.ts`

**Interfaces:**

- `moveCominsColumn`, `moveCominsColumnGroup`은 그대로 재사용한다.
- Pointer interaction 내부 target 상태는 `neutral | valid | invalid`를 구분한다.
- source 자신은 `neutral`, 실제 순서가 바뀌는 같은 depth target은 `valid`, parent/depth 제약으로 순서가 바뀌지 않는 다른 target은 `invalid`다.
- invalid target에서는 `commitTarget`을 호출하지 않는다.

- [x] `column-pointer.test.ts`의 6px intent 계약과 기존 Escape/pointer-cancel browser 회귀를 유지하고, source/valid/invalid marker는 실제 DOM hit-test가 필요한 `header-quality.spec.ts`에서 직접 검증한다. 별도 package-private export는 만들지 않는다.

- [x] `basic-core.test.ts`에 leaf Column의 parent group 경계 위반과 Group의 child target 위반이 `columnOrder`를 변경하지 않는 기존 계약을 명시적으로 보강한다.

- [x] `header-quality.spec.ts`에 threshold 전 hover `grab`, 활성 source `grabbing`, 원래 width 유지, dashed placeholder, darker background를 검증하는 실패 테스트를 추가한다.

```ts
expect(await source.getAttribute("data-column-placeholder")).toBe("true");
expect(await source.evaluate((node) => getComputedStyle(node).cursor)).toBe("grabbing");
expect(await source.boundingBox()).toMatchObject({ width: sourceWidth });
```

- [x] `header-quality.spec.ts`에 같은 depth target은 accent marker, 다른 depth target은 `data-column-drop-valid="false"`, red marker, `not-allowed`를 표시하며 pointer up 뒤 order가 그대로인 실패 테스트를 추가한다. `header-basic.spec.ts`의 기존 이동 순서 회귀도 유지한다.

- [x] `src/index.tsx`의 pointer state에서 단순 `targetId` 대신 실제 hover Header의 kind/depth/parent/status를 저장하고, 각 header에 status data attribute를 출력한다.

```ts
type CominsColumnDropStatus = "neutral" | "valid" | "invalid";

type CominsColumnMoveTarget = {
  depth: 0 | 1;
  id: string;
  kind: "column" | "group";
  parentGroupId?: string;
  status: CominsColumnDropStatus;
};
```

- [x] target 판정 시 현재 state에 기존 move helper를 적용하여 `columnOrder` 변화 여부를 비교한다. source 자신과 같은 depth/parent의 no-op target은 neutral, depth/parent가 다른 target은 invalid로 처리한다. `pointerup`에서는 status가 valid일 때만 기존 commit path를 호출한다.

- [x] `styles.css`에 Header move 토큰과 상태 스타일을 추가한다. source placeholder는 `color-mix`로 현재 Header 배경보다 15~20% 어둡게 하고, invalid는 red 계열 marker/outline과 `not-allowed`를 사용한다.

```css
.comins-table__th[data-column-placeholder="true"] {
  background: color-mix(in srgb, var(--comins-table-header-background) 82%, #000);
  outline: 1px dashed var(--comins-table-border);
  outline-offset: -2px;
}

.comins-table__th[data-column-drop-valid="false"] {
  cursor: not-allowed;
  outline: 2px solid var(--comins-table-drop-invalid);
}
```

- [x] `example/src/styles.css`의 중복 Header drop selector를 제거하고 Playground 전용 ghost layout만 유지한다.

- [x] focused tests와 TypeScript lint를 실행한다.

```bash
npm run test:run -- test/column-pointer.test.ts test/basic-core.test.ts
npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts --workers=1
```

- [x] 로컬 commit `a14e567`을 생성한다.

```bash
git add src/index.tsx styles.css example/src/styles.css test/basic-core.test.ts test/playwright/specs/header-quality.spec.ts
git commit -m "fix: clarify column move drop feedback"
```

**완료:** 로컬 commit `a14e567`

## Task 3: Context Menu selection 정책과 0/1/N 메뉴 matrix 구현

**Files:**

- Modify: `src/index.tsx`
- Modify: `example/src/components/ui/context-menu.tsx`
- Modify: `example/src/features/ContextMenuFeature.tsx`
- Modify: `example/src/styles.css`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/playwright/specs/context-menu.spec.ts`
- Modify: `test/playwright/specs/context-menu-data.spec.ts`
- Modify: `docs/user/07-row.md`
- Modify: `docs/ko/07-row.md`
- Modify: `docs/ko/12-playground.md`

**Interfaces:**

- 이미 선택된 Row를 우클릭하면 현재 단일/다중 selection을 유지한다.
- 선택되지 않은 Row를 우클릭하면 해당 Row를 단독 선택한다.
- Cell 우클릭은 같은 Row 정책을 적용한 뒤 기존 Cell focus를 갱신한다.
- `ContextMenuItem`의 item variant에 Playground 내부용 `disabled?: boolean`을 추가한다.

- [x] `table-interaction.test.tsx`에 다중 선택된 Row 중 하나를 우클릭했을 때 selection 배열이 유지되고, 미선택 Row 우클릭 시 단독 선택되는 실패 테스트를 추가한다. Cell context menu에도 같은 두 시나리오를 추가한다.

- [x] `src/index.tsx`에 새 공개 callback을 추가하지 않고 module-private helper로 selection 정책을 한 번만 구현한다.

```ts
const selectRowForContextMenu = (current: CominsTableState<TData>, rowId: CominsRowId) =>
  current.selection.rowIds.includes(rowId) ? current : selectRow(current, rowId);
```

- [x] Row `onContextMenu`와 Cell `onContextMenu`가 helper를 공통 사용하게 바꾼다. disabled Row/Cell, `lastRowAnchorRef`, `lastCellAnchorRef`, event propagation 계약은 유지한다.

- [x] `context-menu.tsx`의 item variant에 `disabled`를 추가하고 native button `disabled`, `aria-disabled`, disabled style을 연결한다. label variant에는 적용하지 않는다.

- [x] `ContextMenuFeature.tsx`에 selection ref와 table ref를 추가한다. `onChangeSelection`에서 최신 `rowIds`를 ref에 동기화하고 menu open 시 count를 snapshot하여 contextmenu event 직후 matrix가 stale하지 않도록 한다.

- [x] `조회`, `추가`, `수정`, `삭제` 네 item을 선택 개수로 계산한다.

```ts
const permissions = {
  create: true,
  delete: selectedRowIds.length > 0,
  read: true,
  update: selectedRowIds.length === 1,
};
```

- [x] 예제 상단에 `선택 해제`, `메뉴 열기` 컨트롤을 추가한다. `선택 해제`는 기존 `CominsTableRef.setSelectedRows([])`, `메뉴 열기`는 selection을 바꾸지 않고 control anchor에 menu를 연다.

- [x] 각 활성 menu item 선택 시 mutation 없이 `Alert`에 `${기능명} 기능을 선택했습니다.`를 표시한다. disabled item은 click/keyboard로 Alert를 갱신하지 않는다.

- [x] `context-menu.spec.ts`에서 0/1/N별 enabled matrix, 이미 선택된 Row 우클릭 시 다중 선택 유지, 미선택 Row 우클릭 시 단독 선택을 검증한다. `context-menu-data.spec.ts`는 Row/Cell payload preview가 계속 정확한지 검증한다.

- [x] 영문·한글 Row 문서와 한글 Playground route 설명을 새 selection preservation 정책으로 함께 갱신한다.

- [x] focused tests와 TypeScript lint를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:run -- test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/context-menu.spec.ts test/playwright/specs/context-menu-data.spec.ts --workers=1
```

- [x] 로컬 commit `562f3db`을 생성한다.

```bash
git add src/index.tsx example/src/components/ui/context-menu.tsx example/src/features/ContextMenuFeature.tsx example/src/styles.css test/table-interaction.test.tsx test/playwright/specs/context-menu.spec.ts test/playwright/specs/context-menu-data.spec.ts docs/user/07-row.md docs/ko/07-row.md docs/ko/12-playground.md
git commit -m "feat: align context menu actions with row selection"
```

## Task 4: CRUD·Loading·Header Group·일반 fixture 정리

**Files:**

- Modify: `example/src/features/BasicCrudFeature.tsx`
- Modify: `example/src/features/LoadingStateFeature.tsx`
- Modify: `example/src/features/ColumnGroupFeature.tsx`
- Modify: `example/src/features/SelectionClipboardFeature.tsx`
- Modify: `example/src/features/ExportFeature.tsx`
- Modify: `example/src/features/RefApiFeature.tsx`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `test/playwright/specs/crud-playground.spec.ts`
- Modify: `test/playwright/specs/loading-empty-state.spec.ts`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/playground-layout-polish.spec.ts`
- Modify: `test/playwright/specs/selection-clipboard.spec.ts`
- Modify: `test/playwright/specs/export-helper.spec.ts`
- Modify: `test/playwright/specs/ref-api.spec.ts`

**Interfaces:**

- 일반 예제는 `createExampleRows(30)` 또는 동일한 deterministic fixture를 사용한다.
- CRUD add/update/delete/reset/selection 동작은 유지하고 Owner 전용 filter state만 제거한다.
- Header Group child visibility는 기존 MultiSelect, parent visibility는 Checkbox로 제어한다.
- Loading initial은 0 data + skeleton, refetch는 기존 30 Row + overlay, ready는 30 Row, empty는 0 Row로 구분한다.

- [x] `crud-playground.spec.ts`에 Owner filter 버튼이 없고 초기 30 Row이며 add/update/delete/reset 동작이 유지되는 실패 테스트를 추가한다.

- [x] `BasicCrudFeature.tsx`에서 `ownersOnly`, filtered memo, 관련 button/문구를 제거하고 Table에 30 Row state를 직접 전달한다.

- [x] `loading-empty-state.spec.ts`에 ready/refetch `aria-rowcount` 또는 visible row fixture가 30개이고, initial/empty가 의도한 0-data UI를 보이는 실패 테스트를 추가한다.

- [x] `LoadingStateFeature.tsx`의 remote fixture를 `createRows(30)`으로 바꾸고 요청 page size를 30에 맞춘다. timer/abort/refetch overlay 계약은 유지한다.

- [x] `header-basic.spec.ts`와 `playground-layout-polish.spec.ts`에 parent Group visibility Checkbox와 child Column MultiSelect를 독립 조작하는 실패 테스트를 추가한다. parent off는 group children 전체를 숨기고, 다시 on하면 off 직전 child selection을 복원한다.

- [x] `ColumnGroupFeature.tsx`에 parent group별 Checkbox state를 추가하고 최종 visible Column은 `enabled parent ∩ selected children`으로 계산한다. DOM 순서와 group move/resize 예제는 유지한다.

- [x] Selection/Clipboard, Export, Ref API 예제의 일반 fixture를 `createExampleRows(30)`으로 맞추고 각 E2E에 초기 row count assertion을 추가한다. 기능 계약을 위해 작은 fixture를 사용하는 다른 예제는 변경하지 않는다.

- [x] `featureRegistry.tsx`에서 삭제된 CRUD filter와 새 Header Group control, Loading 30 Row 설명을 반영한다.

- [x] focused browser tests를 실행한다.

```bash
npm run test:e2e -- test/playwright/specs/crud-playground.spec.ts test/playwright/specs/loading-empty-state.spec.ts test/playwright/specs/header-basic.spec.ts test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/export-helper.spec.ts test/playwright/specs/ref-api.spec.ts --workers=1
```

- [x] 로컬 commit `075ada2`를 생성한다.

```bash
git add example/src/features test/playwright/specs/crud-playground.spec.ts test/playwright/specs/loading-empty-state.spec.ts test/playwright/specs/header-basic.spec.ts test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/export-helper.spec.ts test/playwright/specs/ref-api.spec.ts
git commit -m "fix: make playground fixtures and controls explicit"
```

## Task 5: Row Expand frame과 Tree Grid 발견성 보정

**Files:**

- Modify: `example/src/features/RowExpandFeature.tsx`
- Modify: `example/src/features/TreeGridFeature.tsx`
- Modify: `example/src/styles.css`
- Modify: `styles.css`
- Modify: `test/playwright/specs/row-expand.spec.ts`
- Modify: `test/playwright/specs/tree-grid.spec.ts`

**Interfaces:**

- Row Expand의 fixed/auto/controlled API와 960px stress detail을 유지한다.
- tall example의 Table viewport만 480px frame으로 제한하며 Row Detail을 overlay로 바꾸지 않는다.
- Tree `defaultExpandAll` 기본값과 explicit `node.expand` 우선순위를 변경하지 않는다.
- ref 제어 예제만 `defaultExpandAll={false}`를 유지한다.

- [x] `row-expand.spec.ts`에 tall example frame 높이가 480px이고 frame 내부 scrollTop이 증가한 뒤 detail 다음 owner Row가 표시되는 실패 테스트를 추가한다. window scroll만으로 통과하지 않도록 frame element를 직접 조작한다.

- [x] `RowExpandFeature.tsx`의 tall Table을 `.row-expand-tall-frame` wrapper로 감싸고 `example/src/styles.css`에 `height: 480px; min-height: 0; overflow: hidden`을 적용한다. direct child `.comins-table`은 `height/max-height: 100%`로 frame을 채우고, 실제 scroll container는 기존 Table body여야 한다.

- [x] `tree-grid.spec.ts`를 기본/style/component/renderer/ref control 시나리오로 나누어, 앞의 네 예제는 초기 expanded 상태와 fold/re-expand를 검증하고 ref control만 초기 collapsed를 검증한다.

- [x] `TreeGridFeature.tsx`에서 style/component/renderer의 `defaultExpandAll={false}`를 제거하거나 `true`로 바꾸고, ref control만 `false`를 유지한다. fixture의 explicit `expand`가 초기 상태를 덮지 않는지 확인한다.

- [x] `styles.css`에서 `.comins-tree-expander`와 spacer를 24×24px로 맞추고 glyph font-size를 14px 이상으로 조정한다. focus-visible, disabled, row click propagation은 유지한다.

- [x] focused browser tests를 실행한다.

```bash
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts --workers=1
```

- [x] Row Expand scroll offset 또는 virtual item 측정 코드를 변경하지 않고 frame CSS와 fixture만 변경했으므로 이 단계의 performance gate는 실행하지 않았다.

```bash
npm run test:perf -- --workers=1
```

- [x] 로컬 commit `c63979c`를 생성한다.

```bash
git add example/src/features/RowExpandFeature.tsx example/src/features/TreeGridFeature.tsx example/src/styles.css styles.css test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts
git commit -m "fix: improve row detail and tree grid discoverability"
```

## Task 6: 사용자 문서, 전체 회귀 검증, 작업 보고

**Files:**

- Modify: `docs/user/06-header.md`
- Modify: `docs/ko/06-header.md`
- Modify: `docs/user/07-row.md`
- Modify: `docs/ko/07-row.md`
- Modify: `docs/user/08-cell.md`
- Modify: `docs/ko/08-cell.md`
- Modify: `docs/user/12-playground.md`
- Modify: `docs/ko/12-playground.md`
- Modify: `test/user-docs.test.ts`
- Create or Modify: `reports/2026-08-03.md`

**Documentation Requirements:**

- Header 문서는 source placeholder와 invalid drop feedback을 설명한다.
- Row 문서는 contextmenu selection preservation과 0/1/N Playground matrix를 설명한다.
- Cell 문서는 range와 Row selection이 동시에 표현됨을 설명한다.
- Playground 문서는 일반 30 Row fixture, Loading 상태 구분, tall Row Detail frame, Tree 초기 상태를 설명한다.
- 영문·한글 문서의 section/anchor/API 이름은 대응되게 유지한다.

- [x] `test/user-docs.test.ts`에 변경된 동작의 영문·한글 marker가 모두 존재하고 오래된 계약 문구가 없는 실패 테스트를 추가한다.

- [x] Header, Row, Cell, Playground 문서 쌍과 stale Tree Grid 문서 쌍을 같은 commit에서 갱신했다. named competitor, 외부 benchmark, 내부 조사 artifact를 포함하지 않았다.

- [x] 사용자 문서 gate를 실행했다. 15/15 통과했다.

```bash
npm run test:run -- test/user-docs.test.ts
```

- [x] library/type/build 전체 gate를 실행했다. `npm run verify`가 Vitest 219/219와 build를 포함해 통과했다.

```bash
npm run verify
```

- [x] ordinary E2E 전체를 직렬 실행했다. Chromium 100/100 통과했다.

```bash
npm run test:e2e -- --workers=1
```

- [x] 깨끗한 Playwright context의 console/pageerror 진단에서 `runtime.lastError`가 재현되지 않아 extension 외부 오류로 기록하고 suppress 코드는 추가하지 않았다.

- [x] `reports/2026-08-03.md`에 작업 일시, 변경 파일, 실행한 명령의 실제 결과, 미실행 gate, 잔여 리스크를 기록했다. localization은 아직 미구현이라고 명시했다.

- [x] 문서와 보고서 local commit `703405d`를 생성했다.

```bash
git add docs/user docs/ko test/user-docs.test.ts reports/2026-08-03.md
git commit -m "docs: record playground interaction quality changes"
```

## Residual Risks After This Plan

- 6개 Theme에서 `color-mix` 결과와 selected/range 대비가 다를 수 있으므로 browser computed-style assertion 외에 최종 육안 검토가 필요하다.
- Header target 유효성 판정이 “order 변화 없음”만 기준이면 향후 Column pinning/grouping이 추가될 때 explicit constraint API로 승격해야 한다.
- Context Menu의 선택 보존 정책은 기존 문서와 사용자의 학습된 동작을 바꾸므로 release note 대상이다.
- Row Expand frame은 Playground 구성 보정이며 consumer가 Table 높이를 제공하지 않는 경우까지 해결하지 않는다.
- 본 계획 완료 시 한/영 혼용은 남는다. 다음 계획 `2026-08-03-playground-localization.md`를 이어서 실행해야 전체 요청이 닫힌다.
