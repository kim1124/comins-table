# Header

Header는 표시/숨김, DOM props, label, column boundary resize, TH 영역 1초 long-press column move, keyboard sort, `aria-sort`, animated sort indicator, layout save/load를 제공한다. Layout save/load는 ref method로 처리한다.

```tsx
const tableRef = useRef<KmsfDataTableRef<Row>>(null);

<KmsfDataTable
  ref={tableRef}
  columns={[
    {
      field: "name",
      header: { props: { className: "name-header", title: "Full name" } },
      label: "Full Name",
      sort: true,
    },
    { field: "age", label: "Age", sort: true },
  ]}
  data={data}
  getRowId={(row) => row.id}
  onChangeColumnLayout={(layout) => setLayout(layout)}
  onChangeSort={(sort) => setSort(sort)}
  showHeader={showHeader}
/>

const saved = tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(saved);
tableRef.current?.setSortState({ columnId: "age", direction: "desc" });
tableRef.current?.clearSort();
```

Header custom UI는 `header.renderer` 또는 `header.components`로 렌더링한다. `renderer`가 있으면 label과 components를 모두 대체한다.

```tsx
{
  field: "name",
  label: "Name",
  header: {
    renderer: ({ column }) => <span>{column.label}</span>,
  },
}
```

```tsx
{
  field: "role",
  label: "Role",
  header: {
    components: [
      {
        type: "select",
        direction: "right",
        options: [
          { label: "Owner", value: "Owner" },
          { label: "Viewer", value: "Viewer" },
        ],
        props: { value: "Owner" },
        onValueChange: ({ value }) => setHeaderFilter(value),
      },
    ],
  },
}
```

Header components는 배열 순서대로 렌더링되며 `direction`으로 label 왼쪽 또는 오른쪽에 붙인다. 기본값은 `direction: "left"`, `align: "center"`다. Built-in component 이벤트는 Header sort, resize, move 이벤트로 전파되지 않는다. `input`은 Cell input과 동일하게 `Enter` 또는 `Blur` 시점에만 변경 값을 commit한다.

Phase 2 Header components는 `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, `menu`를 지원한다. `menu`는 Header 전용이며 `document.body` portal과 fixed position으로 버튼 바로 아래에 popover를 표시한다. `popup`은 built-in으로 제공하지 않는다.

```tsx
{
  field: "status",
  label: "상태",
  header: {
    components: [
      {
        type: "menu",
        direction: "right",
        items: [
          { label: "상태 확인", value: "status-check" },
          { type: "divider" },
          { label: "도움말", type: "label" },
        ],
        onBeforeChange: ({ open }) => open,
        onOpenChange: ({ open }) => setMenuOpen(open),
        onSelect: ({ value }) => handleHeaderMenu(value),
      },
    ],
  },
}
```

동작 기준:

- 컬럼과 컬럼 경계는 resize 영역이며 cursor는 `col-resize`다.
- Resize line은 평소에는 숨겨지고, 컬럼 경계에 hover하거나 resize 중일 때만 표시된다.
- 최초 resize width는 현재 렌더링된 `TH`의 실제 너비를 기준으로 계산한다.
- TH body 영역은 column move 후보 영역이며 cursor는 `grab`이다.
- 왼쪽 버튼을 1초 이상 누르면 column move mode가 되고 cursor는 `grabbing`이다.
- Column move mode에서는 이동 중인 header ghost와 drop marker를 표시한다.
- 1초 전에 pointer move가 발생하면 column move와 sort click을 모두 취소한다.
- Sort cycle은 `none -> asc -> desc -> none`이다.
- Sort 가능한 Header는 focus 가능하며 `Enter` 또는 `Space`로 sort cycle을 실행한다.
- Sort 가능한 Header는 `aria-sort="none" | "ascending" | "descending"` 상태를 노출한다.
- Sort icon은 `lucide-react` 기반이며 asc/desc/none 전환 시 CSS rotate/opacity animation으로 표시한다.
- Header menu 버튼 클릭은 sort, resize, column move를 발생시키지 않는다.
- Header menu는 바깥 클릭, `Escape`, item 선택 시 닫히며 `onBeforeChange`가 `false`를 반환하면 open/close를 취소한다.
- Multi-column sort는 후속 설계 항목이다.

Playground 검증 기준:

- `헤더` 예제는 resize와 move를 같은 pointer 흐름에서 검증한다.
- Header sort 접근성은 mouse click, keyboard `Enter`/`Space`, `aria-sort`, sort indicator 상태를 함께 검증한다.
- Resize는 width 변경, 최초 drag jump 없음, column move 미발생을 함께 확인한다.
- Move는 1초 long-press, 이동 ghost, drop marker, 의도한 column order 변경을 함께 확인한다.
- Virtualized mode에서는 header/body가 다른 table이어도 resize 후 column left/width가 같아야 한다.
- 사용자가 header 위치, resize, sort 표시 문제를 지적한 경우 Playwright assertion 외에 screenshot 또는 DOM geometry evidence를 report에 남긴다.
