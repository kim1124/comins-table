# Header

Columns can enable sorting, width constraints, resizing, and custom header content.

```tsx
const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", id: "name", label: "Name", sort: true, width: 160 },
  { field: "age", id: "age", label: "Age", sort: true, width: 120 },
];
```

Use `onChangeSort` to observe the primary sort rule and `onChangeColumnLayout` for width, order, and visibility persistence.

## Multi-column sort

Single-column sorting remains the default. Enable ordered multi-column sorting explicitly with `multiSort` and observe the complete model through `onChangeSortModel`.

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
- `getSortModel()` and `setSortModel(model)` read and restore the full ordered model. `getSortState()` and `setSortState(rule)` remain available for one-rule compatibility; `setSortState` replaces the full model.
- `clearSort()` clears every rule. `onChangeSort` continues to observe the first rule, while `onChangeSortModel` observes the complete model.
- Hidden sortable Columns keep their rules. Removed or non-sortable Columns are removed from the model.
- Two-level parent Group Headers are not sortable. Their sortable child Columns participate normally.
- Tree Grid applies the same ordered comparator to each sibling set without flattening parents and descendants together.

During multi-sort only the first rule exposes `aria-sort="ascending"` or `"descending"`. Secondary Headers include an accessible priority description because ARIA does not provide a native multi-key priority attribute.

## Column reorder

- A left-button mouse interaction activates column reorder at a 6-pixel horizontal drag threshold. Horizontal movement must be greater than vertical movement.
- Pointer Up below the threshold preserves the normal click and sort behavior. Vertical intent cancels both the pending reorder and sort.
- After activation, the source header becomes a source placeholder while a ghost and target marker show the pending move.
- A move commits only on Pointer Up over a valid target. Pointer cancellation, `Escape`, or window blur cancels it without changing the layout.
- For non-mouse pointer input, one-second long-press compatibility is retained.
- Parent groups use the same interaction and move all child columns as one block.
- A dedicated drag handle remains a future alternative; it is not a shipped API.

Two-level headers use `columnGroups`.

```tsx
<CominsTable
  columns={columns}
  columnGroups={[
    { id: "profile", label: "Profile", children: ["name", "age"] },
  ]}
  data={data}
/>
```

Parent groups resize their child columns proportionally and move as a block. Nested groups are not part of the first public release.
