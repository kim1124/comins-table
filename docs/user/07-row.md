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
  }}
/>
```

Row copy/paste는 focused row에서 `Ctrl+C`, `Ctrl+V`로 동작하며 paste mode는 `insert-after`다.

선택 기준:

- 최초 렌더링 시 row selection은 없다.
- 일반 click은 단일 row를 선택한다.
- `Ctrl` 또는 `Cmd` click은 row 선택을 toggle한다.
- `Shift` click은 마지막 active row부터 클릭한 row까지 visible range를 선택한다.
- Sort 이후에도 selection은 row id 기준으로 유지된다.
- `data` 배열이 교체되면 selection은 초기화된다.
- 선택 row에는 `data-selected-row="true"`와 `kmsf-row-selected` class가 적용된다.
- 기본 playground 스타일은 선택 row의 `tr`에 KMSF mint 배경색을 적용하고, `td` 배경은 투명하게 둔다.
- Context menu 예제는 선택한 row data object를 보여준다.
