# Tree Grid

Tree Grid renders controlled nested rows while preserving the existing column model. Put the business row in `item`; existing columns such as `{ field: "name" }` and cell formatters continue to receive that object.

```tsx
import { useRef, useState } from "react";
import { CominsTable, type CominsTableRef, type CominsTreeNode } from "comins-table";

const columns = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
  { field: "role", label: "Role" },
];

const initialData: Array<CominsTreeNode<{ id: string; name: string; age: number; role: string }>> = [
  {
    item: { id: "engineering", name: "Engineering", age: 60, role: "Owner" },
    expand: false,
    children: [
      {
        item: { id: "platform", name: "Platform Team", age: 32, role: "Editor" },
      },
    ],
  },
];

export function DepartmentTable() {
  const [data, setData] = useState(initialData);
  const tableRef = useRef<CominsTableRef<(typeof initialData)[number]["item"]>>(null);

  return (
    <>
      <button onClick={() => tableRef.current?.expand(["engineering"])}>Expand</button>
      <button onClick={() => tableRef.current?.fold()}>Fold all</button>
      <CominsTable
        ref={tableRef}
        columns={columns}
        data={data}
        defaultExpandAll={false}
        getRowId={(item) => item.id}
        onChangeData={setData}
        summary={{ columns: { age: "sum" } }}
        tree
        virtualized
      />
    </>
  );
}
```

## Controlled data contract

- `data` is an array of `{ item, expand?, children? }` nodes.
- `item` is the row value used by columns, formatters, renderers, row callbacks, and `getRowId`.
- `defaultExpandAll` sets the initial fallback for nodes without an explicit `expand` value and defaults to `true`. An explicit node `expand` value takes precedence. Changes to `defaultExpandAll` after mount do not reset controlled node state.
- Node `expand` controls whether its direct descendants participate in the visible pre-order row list.
- `children` is a recursive node array.
- `getRowId(item)` must return a stable id that is globally unique across every level, including currently collapsed descendants.
- The expander and cell updates emit a new tree through `onChangeData`; caller-owned nodes are not mutated.

Tree sorting is recursive: each sibling set is sorted while a parent remains before its visible descendants. Summary values aggregate leaf `item` rows only, regardless of whether their parent is expanded. Parent values are excluded to avoid double counting.

## Ref expansion controls

`CominsTableRef` exposes `expand(nodeIds?)` and `fold(nodeIds?)`. Pass a readonly id array to update multiple branches in one controlled `onChangeData` emission. Omitting the argument targets every branch; an empty array is a no-op. Duplicate, unknown, and leaf ids are ignored.

```tsx
tableRef.current?.expand(["engineering", "platform"]);
tableRef.current?.fold(["platform"]);
tableRef.current?.expand(); // expand all branches
tableRef.current?.fold(); // fold all branches
```

Expanding a descendant is blocked while an ancestor remains folded. Include the folded ancestor and descendant in the same `expand` call when both must open together. The methods are safe no-ops on a flat table.

## Styles, components, and renderers

Tree Grid reuses the current row and cell contracts. Use `rowProps.className` and `rowProps.style` for hierarchy-aware row styling. Existing column `cell.components` types such as `checkbox`, `select`, and `toggle` read and update the node's `item`. `cell.renderer` can return a custom React component for any tree node; no separate component-row API is required.

The Playground includes a fixed-row-height virtualized tree with exactly `10000` nodes. Virtualization renders only the current window while hierarchy flattening and ref expansion continue to operate on the controlled tree.

## Tree Grid V1 limits

Tree Grid V1 supports the current fixed `rowHeight` virtualized layout. Pagination, lazy loading, infinite scrolling, row drag, and row-level copy/paste are intentionally unavailable because they require a hierarchy-aware data-source or move contract. Cell and range clipboard operations remain scoped to visible `item` rows.

Tree expansion is not flat Row Expand. A future Row Expand feature will render a detail region below one flat source row while retaining flat sorting, pagination, lazy loading, infinite scrolling, and row movement. Its variable-height layout must be designed separately. A future Row Grouping feature will likewise derive groups from flat row values and keep separate group expansion state.

Run the runnable example with `npm run dev`, then open `/examples/tree-grid`.
