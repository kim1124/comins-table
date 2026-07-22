# Column Reorder and Virtual List Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop Header long-press with a 6-pixel horizontal drag plus source placeholder, and make Virtual List Item and More actions select their owning row without breaking built-in component event isolation.

**Architecture:** Keep column order and row selection in the existing `CominsTable` state owner. Extract only the pure mouse-intent decision, consolidate flat/group Header pointer lifecycle in `src/index.tsx`, and pass an internal-only selection bridge into the Virtual List renderer. Preserve package exports and public component payloads.

**Tech Stack:** React 18+, TypeScript 7, Vitest 4 with jsdom, Playwright 1.61, Vite 8, module-owned CSS.

## Global Constraints

- Adopt Comins Contract v1.2 and run every command from the repository root.
- Do not add or upgrade dependencies.
- Do not change `CominsTable` public props, `CominsCellComponentPayload`, package exports, saved column-layout shape, or package version `0.1.2`.
- A mouse left-button interaction activates reorder at `abs(deltaX) >= 6` only when `abs(deltaX) > abs(deltaY)`.
- A below-threshold press/release remains the existing sort click; vertical intent at the threshold cancels both move and sort.
- Keep the source Header geometry, floating ghost, and target marker; commit column order only on a valid Pointer Up target.
- Keep the existing non-mouse one-second long-press behavior in this delivery.
- Do not implement the retained dedicated Header drag-handle alternative or a live target-gap re-layout.
- Virtual List Item activation uses normal Row selection modifiers; More always selects the owning Row exclusively and expands in the same action.
- Virtual List Item and More must not emit `onClickCell` or `onClickRow`, start Cell range selection, or move focus to the Row.
- Keep Search gated by single-Row selection and keep the current reset behavior when that selection is lost.
- Keep English-first public docs synchronized with matching Korean docs.
- Do not push, publish, tag, create a GitHub Release, or mutate remote repository settings.

---

## File map

| File | Responsibility |
| --- | --- |
| `src/column-pointer.ts` | Internal pure 6-pixel mouse-direction decision. Not re-exported. |
| `src/index.tsx` | Shared Header pointer lifecycle, source placeholder state, and table-owned Virtual List row-selection bridge. |
| `src/component-renderer.tsx` | Internal interaction context and Virtual List Item/More activation behavior. |
| `styles.css` | Namespaced source-placeholder presentation without removing Header semantics. |
| `test/column-pointer.test.ts` | Pure activation/cancellation boundary tests. |
| `test/component-renderer-api.test.tsx` | Virtual List selection, keyboard, disabled state, and event-isolation contracts. |
| `test/playwright/specs/header-basic.spec.ts` | Immediate flat/group reorder acceptance without timer waits. |
| `test/playwright/specs/header-quality.spec.ts` | Placeholder, ghost, marker, sort, resize, cancellation, and cleanup acceptance. |
| `test/playwright/specs/component-renderer.spec.ts` | Playground-level Item/More selection and bounded Virtual List behavior. |
| `example/src/features/HeaderFeature.tsx`, `example/src/features/ComponentFeature.tsx` | Runnable descriptions of the approved interactions. |
| `README.md`, `docs/user/06-header.md`, `docs/user/08-cell.md` | English public contract. |
| `docs/ko/06-header.md`, `docs/ko/08-cell.md` | Matching Korean public contract. |
| `test/user-docs.test.ts` | Narrow documentation assertions for the changed behavior. |
| `reports/2026-07-22.md` | Commands, results, failure classification, and residual risks. |

### Task 1: Implement immediate Column reorder and source placeholder

**Files:**
- Create: `src/column-pointer.ts`
- Create: `test/column-pointer.test.ts`
- Modify: `src/index.tsx:78-88, 1575-1793, 2021-2205`
- Modify: `styles.css:496-633`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/header-quality.spec.ts`

**Interfaces:**
- Produces:

```ts
export const COMINS_COLUMN_MOUSE_DRAG_THRESHOLD = 6;

export type CominsColumnMouseIntent = "activate" | "cancel" | "pending";

export function getCominsColumnMouseIntent(input: {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
}): CominsColumnMouseIntent;
```

- The helper is imported only by `src/index.tsx` and tests; do not export it from `src/index.tsx` or `package.json`.
- The shared controller consumes existing `getColumnMoveTargetId`, `moveCominsColumn`, and `moveCominsColumnGroup` behavior and produces the existing layout callback only after a valid drop.

- [ ] **Step 1: Write the failing mouse-intent unit tests**

Create `test/column-pointer.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getCominsColumnMouseIntent } from "../src/column-pointer";

describe("column pointer intent", () => {
  const decide = (clientX: number, clientY: number) =>
    getCominsColumnMouseIntent({ clientX, clientY, startX: 10, startY: 10 });

  it("waits below the six pixel threshold", () => {
    expect(decide(15, 10)).toBe("pending");
    expect(decide(14, 14)).toBe("pending");
  });

  it("activates only when horizontal intent wins", () => {
    expect(decide(16, 10)).toBe("activate");
    expect(decide(3, 12)).toBe("activate");
  });

  it("cancels when vertical intent reaches the threshold first", () => {
    expect(decide(12, 16)).toBe("cancel");
    expect(decide(16, 16)).toBe("cancel");
  });
});
```

- [ ] **Step 2: Run the unit test and confirm the RED state**

Run:

```bash
npm run test:run -- test/column-pointer.test.ts
```

Expected: FAIL because `../src/column-pointer` does not exist.

- [ ] **Step 3: Add the minimal pure intent helper**

Create `src/column-pointer.ts`:

```ts
export const COMINS_COLUMN_MOUSE_DRAG_THRESHOLD = 6;

export type CominsColumnMouseIntent = "activate" | "cancel" | "pending";

export function getCominsColumnMouseIntent({
  clientX,
  clientY,
  startX,
  startY,
}: {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
}): CominsColumnMouseIntent {
  const horizontalDelta = Math.abs(clientX - startX);
  const verticalDelta = Math.abs(clientY - startY);

  if (horizontalDelta >= COMINS_COLUMN_MOUSE_DRAG_THRESHOLD && horizontalDelta > verticalDelta) {
    return "activate";
  }

  if (verticalDelta >= COMINS_COLUMN_MOUSE_DRAG_THRESHOLD && verticalDelta >= horizontalDelta) {
    return "cancel";
  }

  return "pending";
}
```

- [ ] **Step 4: Run the helper test and confirm the GREEN state**

Run:

```bash
npm run test:run -- test/column-pointer.test.ts
```

Expected: PASS with three tests.

- [ ] **Step 5: Rewrite the Header Playwright assertions before integration**

In `header-basic.spec.ts` and `header-quality.spec.ts`:

1. Remove every `waitForTimeout(1100)` used for Header or group movement.
2. After `mouse.down()`, move 6 pixels horizontally inside the source Header and assert:

```ts
await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 6, sourceBox.y + sourceBox.height / 2);
await expect(sourceHeader).toHaveAttribute("data-column-placeholder", "true");
await expect(page.getByTestId("column-move-ghost")).toBeVisible();
```

3. Preserve the existing target-marker and final-order assertions.
4. Replace the current “8 pixel horizontal move does not reorder” expectation with an 8-pixel vertical move and assert that neither order nor sort state changes.
5. Add an `Escape` case that activates at 6 horizontal pixels, presses `Escape`, and asserts that the placeholder, ghost, and marker are removed without an order change.
6. For the two-level parent-group test, assert `data-column-placeholder="true"` on the parent and each visible child Header before Pointer Up.

Run:

```bash
npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts --workers=1
```

Expected: FAIL because a six-pixel movement is cancelled by the current one-second contract and `data-column-placeholder` is absent.

- [ ] **Step 6: Consolidate the Header pointer lifecycle**

Import `getCominsColumnMouseIntent` into `src/index.tsx`. Replace `movedBeforeLongPress` and `startedAt` with this internal shape:

```ts
type CominsColumnPointerInteraction = {
  active: boolean;
  blocked: boolean;
  cancelSort: boolean;
  cleanup: () => void;
  id: string;
  kind: "column" | "group";
  pointerType: string;
  startX: number;
  startY: number;
  timer: number | null;
};

type CominsColumnPointerOptions = {
  activate: (x: number, y: number) => void;
  commitTarget: (targetId: string) => void;
  event: React.PointerEvent<HTMLTableCellElement>;
  id: string;
  kind: "column" | "group";
  sortColumnId?: string;
};
```

Implement one `beginColumnPointerInteraction(options)` in `CominsTableInner` with these exact branches:

```ts
const isMousePointer = options.event.pointerType === "mouse" || options.event.pointerType === "";

if (!current.active && !current.blocked && isMousePointer) {
  const intent = getCominsColumnMouseIntent({
    clientX: moveEvent.clientX,
    clientY: moveEvent.clientY,
    startX: current.startX,
    startY: current.startY,
  });

  if (intent === "activate") {
    activateCurrent(moveEvent.clientX, moveEvent.clientY);
  } else if (intent === "cancel") {
    current.blocked = true;
    current.cancelSort = true;
    suppressPendingSort();
  }
}

if (!current.active && !current.blocked && !isMousePointer) {
  const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);

  if (distance > 4) {
    current.blocked = true;
    current.cancelSort = true;
    window.clearTimeout(current.timer ?? undefined);
    suppressPendingSort();
  }
}
```

The controller must register and remove all five termination listeners:

```ts
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerCancel);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("blur", handleWindowBlur);
```

Initialize the interaction and retain the one-second path only for non-mouse pointers:

```ts
const interaction: CominsColumnPointerInteraction = {
  active: false,
  blocked: false,
  cancelSort: false,
  cleanup: () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerCancel);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("blur", handleWindowBlur);
  },
  id: options.id,
  kind: options.kind,
  pointerType: options.event.pointerType,
  startX: options.event.clientX,
  startY: options.event.clientY,
  timer: null,
};

if (!isMousePointer) {
  interaction.timer = window.setTimeout(() => {
    const current = columnPointerInteractionRef.current;

    if (current === interaction && !current.active && !current.blocked) {
      activateCurrent(current.startX, current.startY);
    }
  }, 1000);
}

columnPointerInteractionRef.current = interaction;
```

Use one sort-suppression function from both horizontal activation and vertical/non-mouse cancellation:

```ts
const suppressPendingSort = () => {
  if (options.sortColumnId) {
    suppressedSortColumnIdRef.current = options.sortColumnId;
  }
};
```

`handlePointerUp` calls `commitTarget(targetId)` only when active and `getColumnMoveTargetId` returns a non-null target. The column adapter returns without committing when `targetId === column.id`; the group adapter returns when `group.children.includes(targetId)`. These guards prevent unchanged drops from emitting `onChangeColumnLayout`. `pointercancel`, `Escape`, and blur call the same idempotent cleanup without committing. `clearColumnPointerInteraction` calls `interaction.cleanup()`, clears a non-null timer, and clears all move UI state. Add an unmount effect that calls this cleanup.

Define `beginHeaderPointerInteraction` and `beginGroupPointerInteraction` as thin option adapters. The column adapter supplies `sortColumnId: column.id` and commits with `moveCominsColumn`; the group adapter omits `sortColumnId` and commits with `moveCominsColumnGroup`.

- [ ] **Step 7: Render and style the source placeholder**

In `renderHeaderCell`, derive source state without changing `colSpan` or `rowSpan`:

```ts
const isMovingGroupChild = Boolean(movingGroup?.children.includes(column.id));
const isColumnPlaceholder = movingColumnId === column.id || isMovingGroupChild;
```

Set `data-column-placeholder="true"` on the active flat Header, active parent-group Header, and every child Header in the moving group. Keep the existing `data-column-moving` and target-marker attributes.

Add module-owned CSS:

```css
.comins-table__th[data-column-placeholder="true"] {
  background: color-mix(in srgb, var(--comins-table-surface-muted) 82%, transparent);
  outline: 1px dashed var(--comins-table-drop-marker);
  outline-offset: -2px;
}

.comins-table__th[data-column-placeholder="true"] > .comins-table__header-content,
.comins-table__th[data-column-placeholder="true"] > .comins-table__resize {
  opacity: 0;
  pointer-events: none;
}
```

Use opacity rather than `display: none` or `visibility: hidden` so the Header content remains in the accessibility tree. Keep the ghost `aria-hidden`.

- [ ] **Step 8: Verify Column behavior and commit**

Run:

```bash
npm run test:run -- test/column-pointer.test.ts
npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts --workers=1
npm run lint
```

Expected: helper tests, both Header specs, and TypeScript all pass; no Header move test waits 1.1 seconds.

Commit:

```bash
git add src/column-pointer.ts src/index.tsx styles.css test/column-pointer.test.ts test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts
git commit -m "feat: improve column reorder interaction"
```

### Task 2: Select the owning Row from Virtual List interactions

**Files:**
- Modify: `src/component-renderer.tsx:475-760, 765-787`
- Modify: `src/index.tsx:540-603, 1795-1809, 2525-2570`
- Modify: `test/component-renderer-api.test.tsx:658-905`
- Modify: `test/playwright/specs/component-renderer.spec.ts:496-568`

**Interfaces:**
- Produces this internal-only type in `src/component-renderer.tsx`:

```ts
export type CominsBuiltInComponentInteraction = {
  requestRowSelection?: (request: {
    event: React.KeyboardEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>;
    mode: "exclusive" | "row-click";
  }) => boolean;
};
```

- `renderCominsBuiltInComponent` accepts an optional third `interaction` argument in all overloads. Existing two-argument calls remain valid.
- `renderCominsContentWithComponents` accepts `interaction?: CominsBuiltInComponentInteraction` in its existing options object.
- The type is internal to source modules and must not be re-exported from the package root.

- [ ] **Step 1: Write failing DOM interaction tests**

Update the existing Virtual List tests in `test/component-renderer-api.test.tsx` to cover these exact assertions:

```ts
const onClickCell = vi.fn();
const onClickRow = vi.fn();
const onClickItem = vi.fn();

const element = render(
  <CominsTable
    columns={columns}
    data={listRows}
    getRowId={(row) => row.id}
    onClickCell={onClickCell}
    onClickRow={onClickRow}
    rowHeight={180}
  />,
);

const firstItem = element.querySelector<HTMLButtonElement>(
  "[data-testid='virtual-list-a-items'] [data-comins-virtual-list-item='true']",
);

act(() => firstItem?.click());

expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
expect(firstItem?.getAttribute("aria-selected")).toBe("true");
expect(onClickItem).toHaveBeenCalledTimes(1);
expect(onClickCell).not.toHaveBeenCalled();
expect(onClickRow).not.toHaveBeenCalled();
```

Add separate cases for:

- `Ctrl`/`Cmd` Item activation retaining the first selection while selecting the second Row;
- `Shift` Item activation selecting the visible range from the current anchor;
- Item `keydown` with `Enter` and `Space` selecting the owning Row;
- a disabled Row and an `item.disabled` entry producing no Row selection and no item callback;
- `more: true` rendering a `BUTTON` before selection and one click both selecting the Row exclusively and setting `data-comins-virtual-list-expanded="true"`;
- More collapsing an existing multi-selection to only its owning Row;
- Search appearing only when its Row is the single selected Row and resetting after multi-selection.

Use native events so React receives the modifier and keyboard fields:

```ts
act(() => {
  secondItem?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }),
  );
});
expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");

act(() => {
  secondItem?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }),
  );
});

act(() => {
  firstItem?.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
  );
});
```

For More, query `virtual-list-overflow-a-items`, assert `tagName === "BUTTON"` before any selection, call `.click()`, then assert only Row `a` is selected and `virtual-list-a-items` has `data-comins-virtual-list-expanded="true"`. For the disabled case, render with `rowProps={{ disabled: (row) => row.id === "b" }}` and assert the Row `b` Item leaves `data-selected-row` absent and the callback count unchanged.

Run:

```bash
npm run test:run -- test/component-renderer-api.test.tsx
```

Expected: FAIL because Item events remain isolated from Row selection and preselection More is still a `SPAN`.

- [ ] **Step 2: Add the internal component interaction context**

Add `CominsBuiltInComponentInteraction` to `src/component-renderer.tsx`. Pass an optional `interaction` through both `renderCominsBuiltInComponent` overloads and into `CominsCellVirtualListComponent`.

In `src/index.tsx`, update slot rendering signatures exactly as follows:

```ts
function renderCominsComponentSlots<TData>(
  components: ReadonlyArray<CominsRenderableComponent<TData>> | undefined,
  payload: CominsRenderablePayload<TData>,
  direction: "left" | "right",
  interaction?: CominsBuiltInComponentInteraction,
) {
  // Keep filtering and slot markup unchanged; pass interaction as argument three.
  return getRenderableCominsComponents(components, payload)
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => (component.direction ?? "left") === direction)
    .map(({ component, index }) => (
      <span
        className="comins-table__component-slot"
        data-comins-component-align={component.align ?? "center"}
        data-comins-component-direction={direction}
        data-comins-component-id={component.id ?? `${component.type}-${index}`}
        key={component.id ?? `${component.type}-${index}`}
      >
        {renderCominsBuiltInComponent(component as never, payload as never, interaction)}
      </span>
    ));
}
```

Extend `renderCominsContentWithComponents` options to:

```ts
options: {
  interaction?: CominsBuiltInComponentInteraction;
  showContent?: boolean;
} = {}
```

Pass `options.interaction` to both left and right slot calls. Header callers omit it and preserve current behavior.

- [ ] **Step 3: Generalize and reuse the Row selection helper**

Replace `selectRowFromClick` with:

```ts
type CominsRowSelectionModifierEvent = Pick<
  React.KeyboardEvent | React.MouseEvent,
  "ctrlKey" | "metaKey" | "shiftKey"
>;

const selectRowFromInteraction = (
  event: CominsRowSelectionModifierEvent,
  entry: VisibleRowEntry<TData>,
) => {
  if (event.shiftKey && lastRowAnchorRef.current !== null) {
    selectRowRangeByIds(lastRowAnchorRef.current, entry.rowId);
    lastRowAnchorRef.current = entry.rowId;
    return;
  }

  commitState((current) =>
    selectRow(current, entry.rowId, {
      multi: event.ctrlKey || event.metaKey,
      toggle: event.ctrlKey || event.metaKey,
    }),
  );
  lastRowAnchorRef.current = entry.rowId;
};
```

Use it from the existing Row `onClick`. For each rendered Cell, create an interaction object after `cellDisabled` is known:

```ts
const componentInteraction: CominsBuiltInComponentInteraction = {
  requestRowSelection: ({ event, mode }) => {
    if (cellDisabled) {
      return false;
    }

    if (mode === "exclusive") {
      commitState((current) => selectRow(current, entry.rowId));
      lastRowAnchorRef.current = entry.rowId;
      return true;
    }

    selectRowFromInteraction(event, entry);
    return true;
  },
};
```

Pass it through `renderCominsContentWithComponents(..., { interaction: componentInteraction, showContent: false })`. Do not select the Cell and do not invoke public Cell/Row callbacks from this bridge.

- [ ] **Step 4: Update Virtual List Item and More activation**

Add `interaction` to `CominsCellVirtualListComponent`. Replace `selectItem` with the following selection gate before local state/callback changes:

```ts
if (item.disabled) {
  return;
}

const accepted = interaction?.requestRowSelection?.({ event, mode: "row-click" });

if (accepted === false) {
  return;
}

setSelectedValue(item.value);
component.onClickItem?.({ ...payload, event, item, itemIndex, value: item.value } as never);
```

Render overflow with this rule:

```tsx
{showOverflowControl ? (
  more ? (
    <button
      aria-label="전체 목록 보기"
      className="comins-table__component-virtual-list-overflow comins-table__component-virtual-list-more"
      data-testid={`virtual-list-overflow-${listId}`}
      onClick={(event) => {
        preventAndStopComponentEvent(event);

        if (interaction?.requestRowSelection?.({ event, mode: "exclusive" }) === false) {
          return;
        }

        setExpanded(true);
      }}
      onKeyDown={stopComponentEvent}
      onMouseDown={stopComponentEvent}
      onPointerDown={stopComponentEvent}
      type="button"
    >
      ...
    </button>
  ) : (
    <span
      aria-hidden="true"
      className="comins-table__component-virtual-list-overflow comins-table__component-virtual-list-more"
      data-testid={`virtual-list-overflow-${listId}`}
    >
      ...
    </span>
  )
) : null}
```

Remove `moreEnabled`; keep `searchEnabled`, `virtualized`, list bounding, reset effects, and event propagation handlers unchanged.

- [ ] **Step 5: Update the Playground browser contract before rerunning it**

In `component-renderer.spec.ts`:

1. Expect More overflow to be a `BUTTON` before Row selection.
2. Remove the preliminary Cell click.
3. Click More once and assert both exclusive Row selection and `data-comins-virtual-list-expanded="true"`.
4. Click a preview Item in an unselected Row and assert `data-selected-row="true"`, `aria-selected="true"`, and the existing item event log.
5. Use `ControlOrMeta` on another Row's Item and assert multi-selection; then click More on the first Row and assert the second Row is deselected.
6. Focus an Item, press `Enter`, and assert Row selection plus the existing Item event log. Event-isolation callback assertions remain in the jsdom test where `onClickCell` and `onClickRow` spies are installed.
7. Keep the `10_000`-item bounded DOM and lower-item scroll assertions.

Run:

```bash
npm run test:run -- test/component-renderer-api.test.tsx
npm run test:e2e -- test/playwright/specs/component-renderer.spec.ts --workers=1
```

Expected: PASS for the DOM interaction suite and Component Playground spec with no browser warnings or errors.

- [ ] **Step 6: Commit the Virtual List behavior**

Run:

```bash
npm run lint
git diff --check
```

Expected: TypeScript and whitespace checks pass; no public type/export file changes are present.

Commit:

```bash
git add src/component-renderer.tsx src/index.tsx test/component-renderer-api.test.tsx test/playwright/specs/component-renderer.spec.ts
git commit -m "fix: select virtual list rows from item actions"
```

### Task 3: Synchronize Playground descriptions and public guidance

**Files:**
- Modify: `example/src/features/HeaderFeature.tsx:99-104`
- Modify: `example/src/features/ComponentFeature.tsx:80-94`
- Modify: `README.md:132`
- Modify: `docs/user/06-header.md`
- Modify: `docs/ko/06-header.md`
- Modify: `docs/user/08-cell.md`
- Modify: `docs/ko/08-cell.md`
- Modify: `test/user-docs.test.ts`

**Interfaces:**
- Consumes: the shipped 6-pixel Header interaction and Virtual List selection behavior from Tasks 1 and 2.
- Produces: synchronized English/Korean public guidance and Playground descriptions. No new public API name is introduced.

- [ ] **Step 1: Add a failing narrow documentation contract**

Add this test to `test/user-docs.test.ts`:

```ts
it("documents column drag activation and Virtual List row selection", () => {
  const header = readWorkspaceFile("docs/user/06-header.md");
  const cell = readWorkspaceFile("docs/user/08-cell.md");

  expect(header).toContain("6-pixel");
  expect(header).toContain("source placeholder");
  expect(header).toContain("non-mouse");
  expect(cell).toContain("Ctrl");
  expect(cell).toContain("Shift");
  expect(cell).toContain("More");
  expect(cell).toContain("onClickCell");
  expect(cell).toContain("onClickRow");
});
```

Run:

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: FAIL because the current English Header guide does not document the threshold or placeholder.

- [ ] **Step 2: Update English-first docs and README**

Update `README.md` from “long-press column reorder” to “6-pixel horizontal-drag column reorder with source placeholder”.

In `docs/user/06-header.md`, document:

- left-button mouse activation at a 6-pixel horizontal threshold;
- below-threshold Pointer Up preserving sort;
- vertical-intent cancellation;
- source placeholder plus ghost and target marker;
- commit on valid Pointer Up only;
- non-mouse one-second long-press compatibility;
- parent groups moving as one block;
- the dedicated drag handle as a retained future alternative, not a shipped API.

In `docs/user/08-cell.md`, document:

- plain Item click selecting only its Row;
- `Ctrl`/`Cmd` toggle and `Shift` visible-range selection;
- `Enter`/`Space` parity;
- More being actionable before selection and selecting exclusively before expansion;
- Search remaining single-selection-only;
- Item/More not invoking `onClickCell` or `onClickRow`.

- [ ] **Step 3: Apply matching Korean guidance and Playground copy**

Mirror every behavior in `docs/ko/06-header.md` and `docs/ko/08-cell.md`. Remove statements that mouse movement requires a one-second hold or that More is a non-button before Row selection. Keep the non-mouse long-press compatibility statement.

Update Playground descriptions to:

```tsx
description="헤더를 수평으로 6px 이상 드래그하면 placeholder, ghost, drop marker가 즉시 표시됩니다."
```

and:

```tsx
description="Item 클릭으로 일반 Row 선택 규칙을 적용하고, More 클릭으로 해당 Row를 단독 선택한 뒤 전체 목록을 확장하는 예제입니다."
```

Keep the separate basic, More, and Search example ids and routes unchanged.

- [ ] **Step 4: Verify documentation and commit**

Run:

```bash
npm run test:run -- test/user-docs.test.ts
rg -n "6픽셀|placeholder|단독 선택|onClickCell|onClickRow" docs/ko/06-header.md docs/ko/08-cell.md
git diff --check
```

Expected: documentation tests pass; both Korean docs contain the changed interaction contract; the diff check passes.

Commit:

```bash
git add README.md docs/user/06-header.md docs/ko/06-header.md docs/user/08-cell.md docs/ko/08-cell.md example/src/features/HeaderFeature.tsx example/src/features/ComponentFeature.tsx test/user-docs.test.ts
git commit -m "docs: update table interaction guidance"
```

### Task 4: Run the complete gates and record verification

**Files:**
- Modify: `reports/2026-07-22.md`

**Interfaces:**
- Consumes: all implementation, tests, Playground copy, and public docs from Tasks 1–3.
- Produces: a durable work record and a clean locally verified branch. It does not produce a release artifact or remote change.

- [ ] **Step 1: Run the focused regression set**

Run:

```bash
npm run test:run -- test/column-pointer.test.ts test/component-renderer-api.test.tsx test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/component-renderer.spec.ts --workers=1
npm run test:perf -- test/playwright/specs/component-renderer.spec.ts --workers=1
```

Expected: every focused test passes; the performance test keeps the `10_000`-item DOM bounded. If Playwright reports `listen EPERM` on `127.0.0.1:4002`, classify it as execution environment, do not change product code, and rerun in the approved bind-capable environment.

- [ ] **Step 2: Run the baseline and shared browser gates**

Run in this order:

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
```

Expected: repository hygiene, security, TypeScript, all Vitest tests, production build, all non-performance Playwright tests, and the full performance suite pass. Do not continue to the report while any product or test-contract failure remains unclassified.

- [ ] **Step 3: Append the work record**

Append a `Column Reorder And Virtual List Selection` section to `reports/2026-07-22.md` containing:

- work time in KST;
- the 6-pixel mouse activation, placeholder/ghost/marker, and non-mouse compatibility result;
- Virtual List Item modifier rules, exclusive More behavior, Search gating, and callback isolation;
- changed files;
- exact focused and full commands with actual pass counts;
- any environment-classified rerun;
- residual risks: touch redesign and dedicated drag handle remain deferred; no version, publish, tag, release, or push was performed.

- [ ] **Step 4: Run final repository hygiene checks**

Run:

```bash
git diff --check
git status -sb
git log -8 --oneline --decorate
```

Stage only the report, then run the exact staged snapshot gate:

```bash
git add reports/2026-07-22.md
npm run check:hygiene -- --staged
```

Expected: no whitespace or hygiene errors; only the intended report is staged; no generated Playwright, coverage, tarball, or temporary artifact is present.

- [ ] **Step 5: Commit the verification record**

Commit:

```bash
git commit -m "docs: record interaction verification"
```

Run:

```bash
git status -sb
```

Expected: clean worktree on the local implementation branch; no remote push has occurred.

## Plan self-review

- Spec coverage: Task 1 covers 6-pixel mouse intent, sort/resize isolation, source placeholder, ghost/marker, group movement, non-mouse long press, and cancellation cleanup. Task 2 covers Item modifiers, keyboard parity, exclusive More, Search gating, disabled state, and callback isolation. Tasks 3–4 cover synchronized guidance, Playground copy, full gates, report evidence, and exclusions.
- Boundary consistency: `CominsBuiltInComponentInteraction` is defined once in `src/component-renderer.tsx`, accepted by the existing renderer as an optional third argument, and consumed only by `src/index.tsx`; it is never added to the package root or public payload.
- Type consistency: `CominsColumnMouseIntent`, `getCominsColumnMouseIntent`, `CominsBuiltInComponentInteraction`, `requestRowSelection`, `selectRowFromInteraction`, `row-click`, and `exclusive` use identical names in every task.
- Scope control: no dependency, public prop, package export, version, dedicated Header drag handle, live target gap, touch redesign, release, or remote mutation is included.
