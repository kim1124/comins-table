# Cell

Cell 값은 `field`로 읽고, `format`으로 ReactNode를 렌더링할 수 있다. Nested path도 지원한다.

```tsx
<KmsfDataTable
  cellSelection={false}
  columns={[
    { field: "name", label: "Name" },
    {
      field: "profile.age",
      format: ({ value }) => <strong>{String(value)} years</strong>,
      label: "Age",
      props: {
        className: ({ value }) => (Number(value) > 40 ? "age-high" : undefined),
        disabled: ({ row }) => row.locked === true,
      },
    },
  ]}
  data={data}
  getRowId={(row) => row.id}
  onClickCell={({ column, row, value }) => console.log(row.index, column.id, value)}
  onContextMenuCell={({ event, row, column }) => {
    event.preventDefault();
    openCellMenu(row.id, column.id);
  }}
  onKeyDownCell={({ event, row, column }) => console.log(event.key, row.id, column.id)}
/>
```

`column.props.disabled`는 해당 cell의 click, context menu, keydown, selection, clipboard 동작을 차단한다.

Cell click은 cell selection과 함께 해당 row도 선택한다. `Ctrl`/`Cmd`/`Shift` modifier가 있는 cell click도 row selection 규칙을 따른다.

`cellSelection={false}`는 cell/range selection state, `data-selected`, range style을 비활성화한다. 일반 `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell` callback과 row selection은 유지한다.

기본 playground 스타일은 table border를 겹치지 않게 분리하고, `TH`/`TD`의 right/bottom grid line을 1px solid로 적용한다. Cell selection은 mint inset outline으로 표시하고, range selection은 더 연한 mint 배경색으로 표시한다. Context menu 데이터 확인은 standalone `컨텍스트 메뉴` 예제에서 제공한다.
