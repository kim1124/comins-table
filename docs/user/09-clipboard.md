# Clipboard

Core helper와 keyboard handler는 row copy/paste, cell copy/paste, multi-cell clipboard를 제공한다. Column별 `cell.props.copyable`, `cell.props.pasteable`, `cell.props.disabled` guard로 복사/붙여넣기 가능 여부를 제한할 수 있다.
`fillCominsCellRange`는 core helper로 제공하지만, 셀 모서리를 드래그하는 Visual Fill Handle UI는 아직 제공하지 않는다.

```ts
import {
  copyCominsCell,
  copyCominsCellRange,
  copyCominsRow,
  fillCominsCellRange,
  pasteCominsCell,
  pasteCominsCellRange,
  pasteCominsRow,
} from "comins-table";

const columns = [
  { field: "name", label: "Name" },
  { field: "locked", label: "Locked", cell: { props: { copyable: false, pasteable: false } } },
];

const copiedRow = copyCominsRow(state, "a");
const nextState = pasteCominsRow(state, copiedRow, { mode: "insert-after", targetRowId: "b" });

const copiedCell = copyCominsCell(nextState, { columnId: "name", rowId: "a" });
const changed = pasteCominsCell(nextState, { columnId: "name", rowId: "b" }, copiedCell);

const copiedRange = copyCominsCellRange(changed);
const pastedRange = pasteCominsCellRange(changed, { columnId: "name", rowId: "b" }, copiedRange);
const filled = fillCominsCellRange(pastedRange, {
  source: { columnId: "name", rowId: "a" },
  target: {
    anchor: { columnId: "name", rowId: "b" },
    focus: { columnId: "name", rowId: "c" },
  },
});
```

Range paste는 현재 table boundary 안에서만 적용한다.
