# Selection

Selection은 row, cell, cell range를 지원한다. React ref method는 화면에 보이는 visible row index 기준으로 row selection을 설정한다.

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

Core helper는 `selectRow`, `selectRows`, `selectCell`, `selectCellRange`, `getCominsSelectedCellRange`, `clearCominsSelection`을 제공한다. 이전 `selectCominsRow`, `selectCominsCell`, `selectCominsCellRange` 이름은 공개 API에서 제거했다.

`cellSelection={false}`를 사용하면 cell/range selection state와 스타일을 적용하지 않는다. Row selection과 일반 cell event callback은 별개로 유지된다.

일반 클릭은 선택 Row를 교체하고, Ctrl/Cmd+클릭은 Row를 추가/해제하며, Shift+클릭은 마지막 anchor부터 현재 visible Row까지 범위를 선택한다. `cellSelection`을 활성화한 상태에서 Cell 사이를 drag하면 Cell range가 생성된다.

controlled React 사용법은 [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard)에서 확인한다. 이 예제는 `onChangeSelection` 전체 payload와 `copyable`, `pasteable` guard를 함께 표시한다.

[`/api/ref`](http://127.0.0.1:4002/api/ref) live 예제는 `setSelectedRow(index)`와 `setSelectedRows(indexes)`를 실행한다. 두 method의 index는 sort와 pagination 적용 후 현재 보이는 Row 기준이다.

Column Filtering은 숨겨진 Row의 selected business Row ID를 dormant 상태로 유지하여 Filter 변경 후 다시 나타날 수 있게 한다. Hidden Cell selection 또는 Cell range는 visible address가 더 이상 유효하지 않으므로 clear한다.
