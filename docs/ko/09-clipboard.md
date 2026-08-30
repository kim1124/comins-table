# Clipboard

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/09-clipboard.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

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

React에서는 `data={rows}`와 `onChangeData={setRows}`를 함께 전달하면 Ctrl/Cmd+C, Ctrl/Cmd+V 결과가 controlled state에 반영된다. 보호해야 하는 Column은 `cell.props.copyable`과 `cell.props.pasteable`을 `false`로 설정한다.

[`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard)에서 `cellSelection`, `onChangeSelection`, protected Column을 함께 확인할 수 있다.
