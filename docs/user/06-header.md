# Header

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/06-header.md) · [Header](http://127.0.0.1:4002/examples/header) · [Header Groups](http://127.0.0.1:4002/examples/column-groups)

Columns can enable sorting, width constraints, resizing, and custom header content.

<!-- comins-doc-example: fragment -->
```tsx
const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", id: "name", label: "Name", sort: true, width: 160 },
  { field: "age", id: "age", label: "Age", sort: true, width: 120 },
];
```

Use `onChangeSort` to observe the primary sort rule and `onChangeColumnLayout` for width, order, and visibility persistence.

## Multi-column sort

Single-column sorting remains the default. Enable ordered multi-column sorting explicitly with `multiSort` and observe the complete model through `onChangeSortModel`.

<!-- comins-doc-example: fragment -->
```tsx
const [sortModel, setSortModel] = useState<CominsSortModel>([]);
const tableRef = useRef<CominsTableRef<PersonRow>>(null);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={rows}
  multiSort
  onChangeSortModel={setSortModel}
/>

tableRef.current?.setSortModel([
  { columnId: "department", direction: "asc" },
  { columnId: "salary", direction: "desc" },
]);
```

- A normal click or `Enter`/`Space` keeps the existing single-column `none -> asc -> desc -> none` cycle.
- `Shift` plus click or `Enter`/`Space` appends a new ascending rule, updates an existing rule in place, or removes its descending rule.
- Header badges show the 1-based comparison priority. Removing a rule compacts the remaining priorities.
- The sort indicator uses state-specific decorative Radix SVG icons (`aria-hidden="true"`) for `asc`, `desc`, and unsorted states. The Header keeps the existing click and `Enter`/`Space` keyboard cycle and continues to expose `aria-sort`.
- `getSortModel()` and `setSortModel(model)` read and restore the full ordered model. `getSortState()` and `setSortState(rule)` remain available for one-rule compatibility; `setSortState` replaces the full model.
- `clearSort()` clears every rule. `onChangeSort` continues to observe the first rule, while `onChangeSortModel` observes the complete model.
- Hidden sortable Columns keep their rules. Removed or non-sortable Columns are removed from the model.
- Two-level parent Group Headers are not sortable. Their sortable child Columns participate normally.
- Tree Grid applies the same ordered comparator to each sibling set without flattening parents and descendants together.

During multi-sort only the first rule exposes `aria-sort="ascending"` or `"descending"`. Secondary Headers include an accessible priority description because ARIA does not provide a native multi-key priority attribute.

The live [`/api/ref`](http://127.0.0.1:4002/api/ref) example applies `setSortModel`, `clearSort`, `getColumnLayout`, and `setColumnLayout` against a Flat Table. Layout methods preserve current Column order, visibility, and width.

## Column reorder

- A left-button mouse interaction activates column reorder at a 6-pixel horizontal drag threshold. Horizontal movement must be greater than vertical movement.
- Pointer Up below the threshold preserves the normal click and sort behavior. Vertical intent cancels both the pending reorder and sort.
- After activation, the source Header becomes a darker dashed source placeholder that keeps its plain Column or Group name visible while a ghost and target marker show the pending move. This presentation-only source label does not invoke custom Header renderers.
- A 24px move handle with a 15px decorative Radix SVG icon (`aria-hidden="true"`) appears at the left by default and activates immediately. The whole Header retains the 6-pixel gesture. Set `showColumnMoveHandle={false}` to hide handles without removing that existing gesture.
- Set `lockPosition: true` on a Column or Group to keep its position fixed. A locked Header has no handle, cannot be moved, and prevents another move from crossing or shifting its position.
- A valid same-depth target uses a blue two-pixel border, blue marker, and low-alpha blue background. A different-depth, cross-parent, or position-locked target uses the corresponding red treatment with a `not-allowed` cursor and cannot commit. Content opacity is unchanged.
- A committed move animates Header, rendered body cells, and Summary cells to their new horizontal positions. `prefers-reduced-motion: reduce` disables the transition.
- The built-in Header control contract uses an 88px default minimum Column width. Labels may truncate; custom Header content that needs more room should set a larger `minWidth`.
- A move commits only on Pointer Up over a valid target. Pointer cancellation, `Escape`, or window blur cancels it without changing the layout.
- For non-mouse pointer input, one-second long-press compatibility is retained.
- Parent groups use the same interaction and move all child columns as one block.

Two-level headers use `columnGroups`.

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  columns={columns}
  columnGroups={[
    { id: "profile", label: "Profile", children: ["name", "age"], lockPosition: true },
  ]}
  data={data}
/>
```

Parent groups resize their child columns proportionally and move as a block. Nested groups are not part of the first public release.

## Column Filter

Set `columns[].filter` and provide controlled `columnFiltering` state to render the Filter control at the Header's right edge after sort metadata and before resize. The semantic button and fixed popover isolate pointer, click, double-click, and keyboard events from Header sort, resize, and move interactions. The application owns both the complete Filter model and the currently open Column ID.

See the [Column Filtering guide](https://github.com/kim1124/comins-table/blob/main/docs/user/21-column-filtering.md) and run the [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering) Playground route for supported operators, read-only behavior, sorting, Summary, and Row Grouping integration.

In the Playground, parent Group visibility uses independent Checkboxes while child Column visibility uses the MultiSelect. Turning a parent off hides all of its children without deleting the child selection; turning it on restores the previously selected children.
