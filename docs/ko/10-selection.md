# Selection

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/10-selection.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Selection은 Row, 단일/비연속 Cell, 직사각형 Cell range를 지원한다. React ref method는 화면에 보이는 visible Row index 기준으로 Row selection을 설정한다.

<!-- comins-doc-example: fragment -->
```tsx
const tableRef = useRef<CominsTableRef<Row>>(null);

<CominsTable
  ref={tableRef}
  columns={[{ field: "name", label: "Name" }]}
  data={data}
  getRowId={(row) => row.id}
  onChangeSelection={(selection) => setSelection(selection)}
/>

tableRef.current?.setSelectedRow(1);
tableRef.current?.setSelectedRows([0, 2]);
```

Core helper는 `selectRow`, `selectRows`, `selectCell`, `selectCellRange`, `getCominsSelectedCellRange`, `clearCominsSelection`을 제공한다. `CominsCellSelectionOptions`의 `multi`와 `toggle`로 `selectCell` 비연속 선택을 제어한다. 이전 `selectCominsRow`, `selectCominsCell`, `selectCominsCellRange` 이름은 공개 API에서 제거했다.

`cellSelection={false}`를 사용하면 cell/range selection state와 스타일을 적용하지 않는다. Row selection과 일반 cell event callback은 별개로 유지된다.

일반 클릭은 선택 Row와 Cell을 교체한다. Ctrl/Cmd+클릭은 Row와 해당 Cell을 함께 추가/해제하며, Shift+클릭은 마지막 anchor부터 visible Row range와 직사각형 Cell range를 선택한다. `cellSelection`을 활성화한 상태에서 Cell 사이를 drag해도 직사각형 Cell range가 생성된다.

`CominsSelectionState.cell`은 active focus와 단일 Cell Clipboard 주소를 유지한다. `CominsSelectionState.cells`는 Ctrl/Cmd 비연속 Cell 집합이며 application이 만든 legacy state와의 호환성을 위해 optional이다. `range`는 별도 상태이고 range 선택 시 비연속 집합을 clear한다. 0.1.9에서는 비연속 Cell 집합을 Clipboard matrix로 변환하지 않는다.

controlled React 사용법은 [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard)에서 확인한다. 이 예제는 `onChangeSelection` 전체 payload와 `copyable`, `pasteable` guard를 함께 표시한다.

[`/api/ref`](http://127.0.0.1:4002/api/ref) live 예제는 `setSelectedRow(index)`와 `setSelectedRows(indexes)`를 실행한다. 두 method의 index는 sort와 pagination 적용 후 현재 보이는 Row 기준이다.

Column Filtering은 숨겨진 Row의 selected business Row ID를 dormant 상태로 유지하여 Filter 변경 후 다시 나타날 수 있게 한다. Hidden Cell selection 또는 Cell range는 visible address가 더 이상 유효하지 않으므로 clear한다.
