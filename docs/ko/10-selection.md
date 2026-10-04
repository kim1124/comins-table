# Selection

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/10-selection.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Selection은 Row, 단일/비연속 Cell, 직사각형 Cell range를 지원한다. React ref method는 화면에 보이는 visible Row index 기준으로 Row selection을 설정한다.

0.2.x에서 루트와 `/selection`은 React state 계약을 사용합니다. 중립 state에는 `/core`의 선택 helper를 사용합니다. [0.2.0 마이그레이션](26-migration-0.2.0.md)을 참고하고 state 생성과 선택 연산의 계약을 일치시킵니다.

일반·Tree 테이블에서 행 ID 순서가 바뀌면(Tree 접기·펼치기 포함) 선택이 초기화되고 `onChangeSelection`으로 전달된다. 동일한 ID와 순서를 유지하는 값 변경은 선택을 보존한다. 이미 빈 선택은 행이 바뀌어도 중복 변경 알림을 발생시키지 않는다.

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

`CominsSelectionState.cell`은 active focus와 단일 Cell Clipboard 주소를 유지한다. `CominsSelectionState.cells`는 Ctrl/Cmd 비연속 Cell 집합이며 application이 만든 legacy state와의 호환성을 위해 optional이다. `range`는 별도 상태이고 range 선택 시 비연속 집합을 clear한다. `clipboard` 활성화 시 비연속 Cell 집합도 미선택 위치가 비어 있는 Clipboard matrix로 복사할 수 있다.

controlled React 사용법은 [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard)에서 확인한다. 이 예제는 `onChangeSelection` 전체 payload와 `copyable`, `pasteable` guard를 함께 표시한다.

[`/api/ref`](http://127.0.0.1:4002/api/ref) live 예제는 `setSelectedRow(index)`와 `setSelectedRows(indexes)`를 실행한다. 두 method의 index는 sort와 pagination 적용 후 현재 보이는 Row 기준이다.

Column Filtering은 숨겨진 Row의 selected business Row ID를 dormant 상태로 유지하여 Filter 변경 후 다시 나타날 수 있게 한다. Hidden Cell selection 또는 Cell range는 visible address가 더 이상 유효하지 않으므로 clear한다.

## Row·Cell 독립 선택 및 조회

`rowSelectionOnClick={false}`를 설정하면 Cell 클릭, Ctrl/Cmd 클릭, Shift 범위 선택과 우클릭이 Row 선택을 변경하지 않습니다. Row 선택은 application의 체크박스와 기존 `setSelectedRows`로 제어합니다. 기본값 `true`는 기존 Row 클릭 흐름을 유지합니다. `clipboard`를 활성화하면 비연속 Cell도 미선택 위치를 비운 행렬로 복사할 수 있습니다.

`CominsTableRef<TData>`는 `getSelectedRows(): TData[]`, `getSelectedCells(): CominsSelectedCell[]`, `getSelection(): CominsSelectionState`를 제공합니다. `CominsSelectedCell`은 원본 값을 포함하는 `{ rowId, columnId, value }`입니다. 조회는 복사나 선택 변경을 수행하지 않습니다. Row 결과는 데이터 순서, Cell 범위는 투영된 표시 순서를 따릅니다. 선택 배열과 주소는 복사본이며 Row 객체와 Cell 값은 application 소유 참조를 유지합니다.

조회는 로딩된 Row만 반환하고 Viewport 요청을 실행하지 않습니다. `getSelection().rowIds`의 선택 ID와 실제 조회 가능한 Row 데이터를 구분해야 합니다. 큰 범위는 조회 시 열거 비용이 있으므로 매 렌더링 대신 필요한 시점에 호출합니다.

<!-- comins-doc-example: fragment -->
```tsx
const tableRef = useRef<CominsTableRef<PersonRow>>(null);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  cellSelection
  rowSelectionOnClick={false}
  clipboard
/>;

// 애플리케이션 조작으로 Cell 선택과 별개로 Row 5개를 선택합니다.
tableRef.current?.setSelectedRows([0, 1, 2, 3, 4]);
// 사용자가 Cell 3개를 선택한 뒤에도 Row 5개와 Cell 3개를 각각 조회합니다.
const selectedRows = tableRef.current?.getSelectedRows();
const selectedCells = tableRef.current?.getSelectedCells();
const selection = tableRef.current?.getSelection();
```

전체 데이터를 보유한 위 예제에서 Cell 3개를 선택해도 Row 5개 선택은 유지됩니다. `copySelection()`은 Cell을, `copySelection("rows")`는 Row를 명시적으로 복사합니다. 사용자 조작 조건과 오류 처리는 [Clipboard](09-clipboard.md)를 참고합니다. Viewport에서 선택 setter는 절대 인덱스를 받고 미로딩 Row를 건너뛰며, getter는 현재 로딩된 선택 데이터만 반환합니다.
