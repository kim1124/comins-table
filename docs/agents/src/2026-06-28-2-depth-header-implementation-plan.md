# 2 Depth Header / Column Group Implementation Plan

## Summary

- Add a maximum 2-depth column header model to `@kmsf/data-table`.
- Keep 1-depth tables backward compatible by preserving the existing flat `columns` API.
- Add a separate `columnGroups` model for parent headers instead of nesting children into `columns`.
- Treat parent headers as visual/group state objects, not data columns.
- Preserve current leaf column sort, resize, move, visibility, component, body cell, and layout contracts.

## Ask Gate

- ask-research / ask-question / ask-plan decision loop is closed.
- Accepted supervisor decisions:
  - Parent group resize is required.
  - Parent group resize resizes child columns while preserving each child column width ratio.
  - Parent group move is required.
  - Parent group move moves all child columns together.
  - Child columns cannot move to another group or outside their group. This is unsupported now and remains unsupported in the future.
  - Parent group hide/show hides or shows the actual child columns, not only the parent header cell.
  - Header area hide/show is independent from 2-depth behavior and hides or shows the whole header area.
  - Maximum depth is 2. N-depth groups are out of scope.
  - Public API uses flat `columns` plus separate `columnGroups`.
  - `columnGroups[].label` is used instead of `name` to match existing column API naming.
  - Parent resize uses ratio-preserving child width updates, `minWidth` / `maxWidth` clamp, remaining delta redistribution, and stops at the feasible boundary when no more redistribution is possible.
  - Ungrouped columns render with `rowSpan=2`.
- ask gate clear.

## Repo-Verified Facts

- `KmsfDataTableColumn` is currently a flat leaf column definition with `field`, `label`, optional `header`, `hidden`, `width`, `minWidth`, `maxWidth`, and `sort`.
- `KmsfColumnLayout` currently stores only leaf column state: `columns: Record<columnId, { hidden?, width? }>` and `order: string[]`.
- Current header rendering maps `visibleColumns` into a single `<tr>`.
- Header and body tables share `visibleColumns` based `colgroup` width.
- Leaf column resize currently calls `setKmsfColumnWidth(column.id, nextWidth)`.
- Leaf column move currently calls `moveKmsfColumn(state, column.id, targetIndex)`.
- Header sort, `aria-sort`, resize handles, move data attributes, and header components are all leaf-column oriented.
- Existing browser tests assume a single header row and header/body leaf-cell index alignment.

## Public API Contract

### 1 Depth

```ts
columns: [
  { id: "column1", field: "name", label: "Name" },
  { id: "column2", field: "age", label: "Age" },
]
```

### 2 Depth

```ts
columns: [
  { id: "column1", field: "name", label: "Name" },
  { id: "column2", field: "age", label: "Age" },
  { id: "column3", field: "role", label: "Role" },
],
columnGroups: [
  {
    id: "group1",
    label: "Profile",
    children: ["column1", "column2"],
  },
]
```

### New Types

```ts
export type KmsfDataTableColumnGroup = {
  id: string;
  label: React.ReactNode;
  children: string[];
  hidden?: boolean;
};
```

- `children` contains existing leaf column ids.
- A group can reference only leaf columns from `columns`.
- A leaf column can belong to at most one group.
- Groups cannot contain groups.
- Group order follows `columnGroups` order plus leaf `columnOrder`.
- Parent group does not support `field`, `sort`, `header.components`, `cell`, or data value behavior.
- Parent group renderer / component customization is out of scope for the first implementation.
- Header-wide hide/show remains a separate table option and hides the whole header area regardless of 1-depth or 2-depth mode.

## State And Layout Contract

```ts
export type KmsfColumnGroupRuntimeState = {
  hidden?: boolean;
};

export type KmsfColumnLayout = {
  columns: Record<string, KmsfColumnRuntimeState>;
  groups?: Record<string, KmsfColumnGroupRuntimeState>;
  order: string[];
};
```

- Leaf visibility remains `column.hidden` / `layout.columns[columnId].hidden`.
- Parent visibility uses `columnGroups[].hidden` / `layout.groups[groupId].hidden`.
- Effective leaf visibility is false when either the parent group is hidden or the leaf column is hidden.
- Parent show restores the previous child hidden states. It does not force all child columns visible.
- Serialized layout includes group hidden state without mutating leaf hidden state.
- Existing layouts without `groups` remain valid.

## Required Behavior

### Header Row Model

- 1-depth table renders one header row.
- 2-depth table renders:
  - parent row with group cells and ungrouped `rowSpan=2` leaf cells.
  - child row with grouped visible leaf cells.
- Parent group `th` uses `colSpan` equal to visible child leaf count.
- If every child of a group is effectively hidden, the parent group header is not rendered.
- Header/body alignment checks must target visible leaf header cells, not parent group cells.

### Parent Resize

- Parent resize handle is shown on parent group headers.
- Resize starts from the current child leaf widths.
- Width change is distributed across child columns while preserving the current width ratio.
- Child `minWidth` and `maxWidth` are respected.
- If a child reaches min/max, it is clamped and remaining delta is redistributed across unclamped children by their remaining ratio.
- If no child can accept remaining delta, parent resize stops at the feasible boundary.
- Result is persisted as leaf column widths in `columnState`.

### Parent Move

- Parent move is shown on parent group headers.
- Moving a parent group moves all child leaf columns together.
- Child columns cannot be dropped into another group or outside their group.
- Ungrouped columns can be moved relative to groups only through the existing leaf move path when it does not split an existing group.
- Grouped child internal order may be changed only within the same group if the existing leaf move interaction is used on child headers.

### Visibility

- Parent group hide hides the actual child columns from header, body, colgroup, keyboard order, selection column order, resize targets, and move targets.
- Parent group show restores effective visibility based on each child column's own hidden state.
- Child column hide/show remains independent while parent group is visible.
- Header-wide hide/show hides or shows the complete header area and does not alter column or group visibility state.

### Accessibility

- Parent group headers are `th` cells with `scope="colgroup"` where practical.
- Leaf headers keep `scope="col"` and existing sort `aria-sort` behavior.
- Parent group headers do not expose `aria-sort`.
- Keyboard navigation must not create unreachable focus targets in the hidden child/header states.

## Scope

### In Scope

- `src/core.ts`
  - group public type.
  - group normalization.
  - derived visible leaf columns.
  - derived header rows.
  - group state in layout serialization and application.
  - parent resize and move helpers.
- `src/index.tsx`
  - `columnGroups` prop.
  - 2-row header render.
  - parent resize / move / visibility integration.
  - leaf header/body alignment updates.
- `styles.css`
  - 2-depth header layout.
  - parent/child border and resize affordance.
  - move ghost/drop marker adjustments.
- `example/src/features/HeaderFeature.tsx`
  - 2-depth header examples.
  - parent resize, parent move, parent visibility, child visibility examples.
- `example/src/fixtures/columns.tsx` or local header feature fixtures.
- `docs/user/06-header.md`
  - API and behavior documentation.
- `test/basic-core.test.ts`
- `test/table-interaction.test.tsx`
- `test/playwright/specs/header-basic.spec.ts`
- `test/playwright/specs/header-quality.spec.ts`
- `test/playwright/specs/virtual-sticky-header.spec.ts`
- `reports/YYYY-MM-DD.md`

### Out Of Scope

- N-depth column groups.
- Parent sort.
- Parent header component slots.
- Parent data field / value behavior.
- Moving child columns to another group or outside a group.
- Group split behavior.
- Column virtualization.
- Server-side row model, grouping, aggregation, pivoting, tree data, export, or charts.
- New dependency.

## TDD Sequence

1. RED: Add core normalization tests.
   - Accept flat 1-depth columns without `columnGroups`.
   - Accept 2-depth `columnGroups` referencing existing column ids.
   - Reject or ignore invalid group children deterministically.
   - Enforce max 2-depth by type/runtime normalization.
   - Expected RED reason: no group type or normalization exists.

2. RED: Add layout serialization tests.
   - Serialize and apply `layout.groups[groupId].hidden`.
   - Preserve child hidden state when parent hides and shows.
   - Keep existing layouts without `groups` valid.
   - Expected RED reason: layout supports only leaf column state.

3. RED: Add visible leaf/header-row derivation tests.
   - Parent hidden removes children from effective visible leaves.
   - Child hidden removes only that child while parent remains visible.
   - Ungrouped leaves produce `rowSpan=2`.
   - Parent group produces `colSpan` from visible children.
   - Expected RED reason: only flat `visibleColumns` exists.

4. RED: Add parent resize helper tests.
   - Ratio-preserving growth.
   - Ratio-preserving shrink.
   - Min/max clamp and redistribution.
   - Boundary stop when no child can accept delta.
   - Expected RED reason: only single leaf width setter exists.

5. RED: Add parent move helper tests.
   - Move grouped children as a contiguous block.
   - Prevent group split.
   - Prevent child move to another group/outside group.
   - Preserve ungrouped column ordering.
   - Expected RED reason: current `moveKmsfColumn` moves a single leaf by flat index.

6. GREEN: Implement core model.
   - Add public group types.
   - Add group state to layout with backward compatibility.
   - Add helpers for effective visible leaves and header rows.
   - Add parent resize and move helpers.

7. RED: Add jsdom render tests.
   - 1-depth still renders one header row.
   - 2-depth renders parent row and child row.
   - Parent header has no sort behavior or header components.
   - Leaf sort/components still work.
   - Parent hide/show updates actual body columns.
   - Expected RED reason: React render has only one header row.

8. GREEN: Implement React header rendering.
   - Add `columnGroups` prop.
   - Render parent row + child row only when groups are present.
   - Wire parent visibility, resize, and move interactions.
   - Keep leaf header behavior unchanged.

9. RED: Add Playwright browser geometry tests.
   - Header/body visible leaf cell left/width alignment.
   - Parent resize preserves ratio within tolerance.
   - Parent move moves child columns together.
   - Child cannot be dropped outside its group.
   - Ungrouped `rowSpan=2` visual alignment.
   - Sticky/virtual header remains aligned during vertical scroll.
   - Expected RED reason: browser DOM/CSS does not yet support 2-depth geometry.

10. GREEN: Implement CSS and browser interaction polish.
    - Update 2-depth header height, sticky offsets, resize hit area, and move marker.
    - Keep text clipping and no-overlap requirements.
    - Preserve table body virtualization alignment.

11. Documentation and examples.
    - Add Header feature examples for 1-depth and 2-depth.
    - Document `columnGroups`, group visibility, resize, move, and limitations.
    - Update report with commands and browser evidence.

## Requirement-To-Test Matrix

| Requirement | Focused Test | Browser Proof |
| --- | --- | --- |
| 1-depth backward compatibility | `test/basic-core.test.ts`, `test/table-interaction.test.tsx` | existing header specs remain passing |
| Separate `columnGroups` API | core normalization tests | header playground renders grouped example |
| Max 2-depth only | core normalization/type tests | grouped example has exactly two header rows |
| Parent resize ratio preservation | core helper tests | Playwright width-ratio measurement |
| Parent resize min/max clamp | core helper tests | Playwright boundary resize measurement |
| Parent move with child block | core move helper tests | Playwright group drag result |
| No child move to another group | core move helper tests | Playwright blocked drop path |
| Parent hide/show hides actual columns | layout + visibility tests | body `td`/colgroup/header count changes |
| Child hide independent under visible parent | layout + visibility tests | header feature visibility interaction |
| Header-wide hide/show independent | render option tests | header area disappears while columns remain in body behavior where applicable |
| Ungrouped `rowSpan=2` | header row model tests | Playwright geometry/DOM assertion |
| Parent has no sort/components | jsdom render tests | Playwright no sort change on parent click |
| Leaf sort/components preserved | existing + focused tests | existing component/header specs |
| Sticky/virtual alignment | visible leaf alignment helper | `virtual-sticky-header` Playwright spec |

## Verification Commands

Focused RED/GREEN commands:

```bash
../../node_modules/.bin/vitest run test/basic-core.test.ts test/table-interaction.test.tsx
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/virtual-sticky-header.spec.ts
```

Package gates:

```bash
npm --workspace=@kmsf/data-table run verify
npm --workspace=@kmsf/data-table run verify:full
git diff --check
```

## Residual Risks

- 2-depth header changes the DOM shape for grouped tables, so header/body alignment tests must explicitly target visible leaf headers.
- Parent resize ratio preservation may produce fractional widths. Browser tests should use a small tolerance and production code should use stable rounding.
- Parent group visibility requires group state and leaf state separation. Incorrect merging can lose child hidden preferences.
- Parent move and leaf move share the same visual gesture area. Event isolation must prevent resize, sort, and move gestures from conflicting.
- Existing consumer CSS that targets internal header row structure may need adjustment because grouped tables render two header rows.
