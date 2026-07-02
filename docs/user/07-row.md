# Row

Row interaction은 React event prop으로 받는다. 이벤트 payload는 `event`, `row`, `index`를 포함한다.

```tsx
<KmsfDataTable
  columns={[{ field: "name", label: "Name" }]}
  data={data}
  getRowId={(row) => row.id}
  onClickRow={({ row }) => console.log("click", row.id, row.index)}
  onContextMenuRow={({ event, row }) => {
    event.preventDefault();
    openMenu(row.id);
  }}
  onDoubleClickRow={({ row }) => console.log("double", row.id)}
  onKeyDownRow={({ event, row }) => console.log(event.key, row.id)}
  rowProps={{
    className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
    disabled: (row) => row.locked === true,
    draggable: (row) => row.locked !== true,
    style: (row) => (row.active ? { background: "#2f0f5f" } : undefined),
  }}
/>
```

Row copy/paste는 focused row에서 `Ctrl+C`, `Ctrl+V`로 동작하며 paste mode는 `insert-after`다.
Row 위치 이동은 cell range drag와 충돌하지 않도록 첫 번째 cell 안의 Row drag handle을 기준으로 수행한다.

## rowProps.draggable

`rowProps.draggable`은 row 클릭, 선택, context menu를 유지하면서 drag reorder만 끄는 옵션이다.
`rowProps.disabled`는 row와 cell interaction 전체를 차단하고, `rowProps.draggable`은 row 이동 gesture만 차단한다.
비활성 row의 기본 배경과 글자색은 theme CSS 변수 `--kmsf-data-table-row-disabled-background`, `--kmsf-data-table-row-disabled-color`로 조정한다.

```tsx
<KmsfDataTable
  columns={columns}
  data={data}
  getRowId={(row) => row.id}
  rowProps={{
    disabled: (row) => row.status === "archived",
    draggable: (row) => row.status !== "locked",
  }}
/>
```

## setMoveTargetRow

`setMoveTargetRow(targetIdx, sourceIdx)`는 현재 화면에 보이는 row index 기준으로 source row를 target 위치로 이동한다.
sort가 적용된 상태에서는 sort를 해제한 뒤 이동 결과를 data 순서에 반영한다.

```tsx
const tableRef = useRef<KmsfDataTableRef<PersonRow>>(null);

tableRef.current?.setMoveTargetRow(2, 0);
```

선택 기준:

- 최초 렌더링 시 row selection은 없다.
- 일반 click은 단일 row를 선택한다.
- `Ctrl` 또는 `Cmd` click은 row 선택을 toggle한다.
- `Shift` click은 마지막 active row부터 클릭한 row까지 visible range를 선택한다.
- Sort 이후에도 selection은 row id 기준으로 유지된다.
- `data` 배열이 교체되면 selection은 초기화된다.
- 선택 row에는 `data-selected-row="true"`와 `kmsf-row-selected` class가 적용된다.
- 기본 playground 스타일은 선택 row의 `tr`에 KMSF mint 배경색을 적용하고, `td` 배경은 투명하게 둔다.
- Row styling playground는 `rowProps.className`과 `rowProps.style.background`를 함께 사용해 기본 테마와 확실히 다른 배경, 글자색, font, border를 보여준다.
- Context menu 예제는 선택한 row data object를 보여준다.
- Row drag handle은 Row 이동 전용 gesture이며, 같은 column의 cell drag는 range selection으로만 처리한다.

Playground 검증 기준:

- `Tr Row 예제`는 row click, double click, context menu, keyboard event가 각각 어떤 callback을 발생시키는지 inline Alert로 보여준다.
- Row drag 중에는 이동할 위치를 보여주는 placeholder를 표시한다.
- Row drag 검증은 drag handle을 source로 사용하고, cell drag가 row reorder로 해석되지 않는지 함께 확인한다.
- Selection 검증은 내부 state가 아니라 `tr`의 DOM attribute와 computed CSS를 기준으로 한다.
- Row selection 관련 작업은 initial no-selection, single selection, Ctrl/Cmd toggle, Shift range, sort 후 유지, data 교체 시 초기화를 각각 증거로 남긴다.
- 사용자가 selection 색상 또는 초기화 문제를 지적한 경우 browser proof에는 selected row의 `data-selected-row`, `background-color`, 관련 event 결과를 포함한다.
