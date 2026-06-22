# Cell

Cell 값은 `field`로 읽고, `cell.format`, `cell.components`, `cell.renderer`로 ReactNode를 렌더링할 수 있다. Nested path도 지원한다.

```tsx
<KmsfDataTable
  cellSelection={false}
  columns={[
    { field: "name", label: "Name" },
    {
      field: "profile.age",
      label: "Age",
      cell: {
        format: ({ value }) => <strong>{String(value)} years</strong>,
        tooltip: ({ row, value }) => `${row.id}: ${String(value)}`,
        props: {
          className: ({ value }) => (Number(value) > 40 ? "age-high" : undefined),
          disabled: ({ row }) => row.data.locked === true,
        },
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

`column.cell.props.disabled`는 해당 cell의 click, context menu, keydown, selection, clipboard 동작을 차단한다.

`cell.renderer`는 사용자 커스텀 컴포넌트를 직접 렌더링한다.

```tsx
{
  field: "name",
  label: "Name",
  cell: {
    renderer: ({ row, column, value }) => (
      <MyCell row={row} column={column} value={value} />
    ),
  },
}
```

`cell.components`는 DataTable이 제공하는 lightweight built-in 컴포넌트만 Cell 안에 렌더링한다. `components`가 있으면 기본 value/format 텍스트는 표시하지 않는다. `renderer`가 있으면 format과 components를 모두 대체한다.

```tsx
{
  field: "enabled",
  label: "Enabled",
  cell: {
    components: [
      {
        type: "checkbox",
        direction: "left",
        props: ({ value }) => ({ checked: Boolean(value) }),
        onCheckedChange: ({ row, checked }) => {
          setData((prev) =>
            prev.map((item) =>
              item.id === row.id ? { ...item, enabled: checked } : item
            )
          );
        },
      },
    ],
  },
}
```

Cell components는 `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, `virtual-list`를 지원한다. `menu`는 Header 전용이므로 Cell에서 사용할 수 없다. Built-in component 이벤트는 Cell/Row click, keyboard, context menu 이벤트로 전파되지 않는다.

`input`은 입력 중 외부 `data`를 갱신하지 않고 내부 draft만 변경한다. `Enter` 또는 `Blur` 시점에 값이 바뀐 경우 한 번만 `onChange`/`onValueChange`를 호출한다.

`virtual-list`는 하나의 Cell 안에서 여러 item을 표시한다. 기본값은 `itemHeight: 28`이고 높이는 `itemHeight * 5`다. `more: false` 기본 모드에서는 필터링된 전체 item을 스크롤로 탐색한다. `more: true` 모드에서는 `limit` 단위로 더보기 버튼을 표시한다. item 선택 상태는 Cell 내부 일시 상태로 관리된다. virtual scroll로 Cell이 destroy/recreate되면 item 선택 상태는 초기화될 수 있다.

```tsx
{
  field: "items",
  label: "Items",
  cell: {
    components: [
      {
        type: "virtual-list",
        items: ({ row }) => row.data.items,
        props: {
          limit: 10,
          itemHeight: 28,
          searchable: true,
        },
        searchFilter: ({ item, itemIndex, value }) =>
          itemIndex === 0 || String(item.label).includes(value),
        onClickItem: ({ item, itemIndex, value }) => {
          console.log(itemIndex, item.value, value);
        },
        onContextMenuItem: ({ event, item }) => {
          event.preventDefault();
          console.log(item.value);
        },
      },
    ],
  },
}
```

`searchFilter` payload는 `item`, `itemIndex`, `value`만 받는다. 여기서 `value`는 검색 input 값이다. 검색 input은 전체 Row 선택이 정확히 1개이고, 해당 Row의 virtual-list Cell에서만 활성화된다.

Cell 내부 입력 컴포넌트는 immutable update로 외부 `data` 또는 store를 갱신해야 한다.

Cell click은 cell selection과 함께 해당 row도 선택한다. `Ctrl`/`Cmd`/`Shift` modifier가 있는 cell click도 row selection 규칙을 따른다.

`cellSelection={false}`는 cell/range selection state, `data-selected`, range style을 비활성화한다. 일반 `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell` callback과 row selection은 유지한다.
Playground에서는 `cellSelection`을 버튼으로 전환해 활성/비활성 상태의 차이를 직접 확인한다.

같은 column 안에서 cell을 세로로 drag하면 row reorder가 아니라 cell range selection으로 처리한다. Row reorder는 Row drag handle에서만 수행한다.

기본 playground 스타일은 table border를 겹치지 않게 분리하고, `TH`/`TD`의 right/bottom grid line을 1px solid로 적용한다. Cell selection은 mint inset outline으로 표시하고, range selection은 더 연한 mint 배경색으로 표시한다. Context menu 데이터 확인은 standalone `Context Menu 예제`에서 제공한다.

Playground 검증 기준:

- `셀` 예제는 format, column props style/className/disabled, cell click, double click, context menu, keyboard event를 각각 상태 출력으로 보여준다.
- Cell selection 검증은 `data-selected`, `data-range-selected`, computed CSS, row selection 동시 적용 여부를 기준으로 한다.
- `cellSelection={false}` 검증은 cell selection style이 사라지더라도 cell callback과 row selection이 유지되는지 확인한다.
- 같은 column cell drag 검증은 range selection이 유지되고 row order가 변경되지 않는지 확인한다.
- Context menu 검증은 메뉴 클릭 후 selection 유지와 선택 메뉴 Alert 표시를 함께 확인한다.
