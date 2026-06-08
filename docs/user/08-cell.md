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
Playground에서는 `cellSelection`을 버튼으로 전환해 활성/비활성 상태의 차이를 직접 확인한다.

같은 column 안에서 cell을 세로로 drag하면 row reorder가 아니라 cell range selection으로 처리한다. Row reorder는 Row drag handle에서만 수행한다.

기본 playground 스타일은 table border를 겹치지 않게 분리하고, `TH`/`TD`의 right/bottom grid line을 1px solid로 적용한다. Cell selection은 mint inset outline으로 표시하고, range selection은 더 연한 mint 배경색으로 표시한다. Context menu 데이터 확인은 standalone `컨텍스트 메뉴` 예제에서 제공한다.

Playground 검증 기준:

- `셀` 예제는 format, column props style/className/disabled, cell click, double click, context menu, keyboard event를 각각 상태 출력으로 보여준다.
- Cell selection 검증은 `data-selected`, `data-range-selected`, computed CSS, row selection 동시 적용 여부를 기준으로 한다.
- `cellSelection={false}` 검증은 cell selection style이 사라지더라도 cell callback과 row selection이 유지되는지 확인한다.
- 같은 column cell drag 검증은 range selection이 유지되고 row order가 변경되지 않는지 확인한다.
- Context menu 검증은 메뉴 클릭 후 selection 유지와 선택 메뉴 Alert 표시를 함께 확인한다.
