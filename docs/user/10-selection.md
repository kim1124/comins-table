# Selection

Selection supports row selection, single-cell selection, and range selection.

```ts
import {
  getCominsSelectedCellRange,
  isCominsCellSelected,
  isCominsRowSelected,
  selectCell,
  selectCellRange,
  selectRow,
} from "comins-table/selection";
```

`selectRow`, `selectCell`, and `selectCellRange` update the core state. `getCominsSelectedCellRange` reads the active range.

React users can subscribe to `onChangeSelection` on `CominsTable`.

```tsx
<CominsTable
  columns={columns}
  data={data}
  onChangeSelection={(selection) => setSelection(selection)}
/>
```
