# Clipboard

<!-- comins-restriction: fill-helper-no-visual-handle -->

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/09-clipboard.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Core helper와 keyboard handler는 row copy/paste, cell copy/paste, multi-cell clipboard를 제공한다. Column별 `cell.props.copyable`, `cell.props.pasteable`, `cell.props.disabled` guard로 복사/붙여넣기 가능 여부를 제한할 수 있다.
`fillCominsCellRange`는 core helper로 제공하지만, 셀 모서리를 드래그하는 Visual Fill Handle UI는 아직 제공하지 않는다.

<!-- comins-doc-example: fragment -->
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

Cell을 클릭해 포커스를 둔 뒤 Ctrl/Cmd+C로 복사하고, 대상 Cell을 클릭한 뒤 Ctrl/Cmd+V로 붙여넣는다. `cellSelection`으로 범위를 드래그하면 시작 Cell에 키보드 포커스가 유지되므로 선택 범위를 바로 복사할 수 있다. `cell.renderer` 내부 입력 요소나 버튼을 클릭하면 해당 요소의 기본 포커스를 유지한다. 기본 키보드 흐름은 내부 복사 버퍼를 사용한다. `clipboard`를 활성화하면 선택 정책에 따라 OS Clipboard에도 복사한다.

## 선택 복사와 OS 클립보드

`CominsTable`의 `clipboard`를 활성화하면 브라우저의 native copy 이벤트를 처리합니다. 기본값은 기존 내부 버퍼 흐름을 유지하는 `false`입니다. 활성화 시 키보드 복사와 `ref.current.copySelection()`은 여러 Cell → 선택 Row → 단일 Cell 순서를 동일하게 사용합니다. Row 5개와 Cell 3개를 선택하면 Cell 3개를 복사하며 Row 5개 선택은 유지됩니다. Row 5개와 Cell 1개라면 Row를 복사합니다.

`copySelection(target?: CominsCopyTarget)`은 `"auto"`, `"cells"`, `"rows"`를 받습니다. 사용자 조작에 따른 버튼이나 Context Menu에서 호출하고 클립보드 접근 거부를 처리합니다. 이 Ref 메서드는 `clipboard` prop이 false여도 OS 클립보드에 기록하며, prop은 키보드 복사 활성화 여부를 제어합니다. 복사된 문자열을 `Promise<string | null>`로 반환합니다. 복사 가능한 선택이 없으면 `null`, 브라우저 클립보드 접근이 불가능하거나 거부되면 Promise rejection이 발생합니다. 키보드 복사는 native `copy` 이벤트를 사용하며 입력 요소의 텍스트 복사는 유지합니다.

| 대상 | 복사 데이터 |
| --- | --- |
| `"auto"` 또는 생략 | 여러 선택 Cell → 선택 Row → 단일 선택 Cell |
| `"cells"` | Row 선택과 무관하게 선택한 Cell 집합 또는 사각형 |
| `"rows"` | Cell 선택과 무관하게 선택한 Row의 표시 Column |

`cellSelection` 사용 시 일반 클릭, Shift+클릭, 범위 드래그는 Cell에 포커스를 두고 페이지 텍스트 선택을 정리하므로 Ctrl/Cmd+C로 Table 선택을 바로 복사할 수 있습니다. 복사는 내부 붙여넣기 버퍼도 최신 복사값으로 갱신합니다. 선택한 Cell 집합이나 범위 안에서 우클릭하면 선택을 유지하여 Context Menu에서 복사할 수 있습니다. 선택 조회 API는 복사와 독립적이며 [Selection](10-selection.md)을 참고합니다.

TSV의 탭·줄바꿈은 인용 처리하고 문자열 수식 접두어는 스프레드시트 붙여넣기를 위해 escape합니다. 숫자와 내부 붙여넣기 값은 원본을 유지합니다. `copyable: false` 또는 disabled Cell은 빈 위치로 처리합니다. 비연속 Cell은 선택 전체를 감싸는 최소 사각형으로 복사하고 미선택 위치는 비웁니다. 내부 붙여넣기는 이 빈 위치를 건너뜁니다. 복사 순서는 표시 Column과 투영된 Row 순서이며 숨겨지거나 접힌 Row는 제외합니다. 조회 API는 로딩된 선택 business Row를 반환합니다.

Viewport 복사는 미로딩 Row를 요청하지 않습니다. Cell 사각형이 미로딩 구간을 가로지르면 복사를 거절하고, Row 복사는 로딩된 선택 Row만 사용합니다. `CominsSelectionCopy`는 결정된 복사 대상·문자열·내부 행렬의 타입입니다. OS 클립보드의 외부 데이터 붙여넣기는 추가하지 않으며 Ctrl/Cmd+V는 Table 내부 버퍼를 계속 사용합니다.
