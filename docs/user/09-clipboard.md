# Clipboard

Core helper와 keyboard handler는 row copy/paste, cell copy/paste, multi-cell clipboard를 제공한다. Column별 `props.copyable`, `props.pasteable`, `props.disabled` guard로 복사/붙여넣기 가능 여부를 제한할 수 있다.

```ts
import {
  copyKmsfCell,
  copyKmsfCellRange,
  copyKmsfRow,
  fillKmsfCellRange,
  pasteKmsfCell,
  pasteKmsfCellRange,
  pasteKmsfRow,
} from "@kmsf/data-table";

const columns = [
  { field: "name", label: "Name" },
  { field: "locked", label: "Locked", props: { copyable: false, pasteable: false } },
];

const copiedRow = copyKmsfRow(state, "a");
const nextState = pasteKmsfRow(state, copiedRow, { mode: "insert-after", targetRowId: "b" });

const copiedCell = copyKmsfCell(nextState, { columnId: "name", rowId: "a" });
const changed = pasteKmsfCell(nextState, { columnId: "name", rowId: "b" }, copiedCell);

const copiedRange = copyKmsfCellRange(changed);
const pastedRange = pasteKmsfCellRange(changed, { columnId: "name", rowId: "b" }, copiedRange);
const filled = fillKmsfCellRange(pastedRange, {
  source: { columnId: "name", rowId: "a" },
  target: {
    anchor: { columnId: "name", rowId: "b" },
    focus: { columnId: "name", rowId: "c" },
  },
});
```

Range paste는 현재 table boundary 안에서만 적용한다.
