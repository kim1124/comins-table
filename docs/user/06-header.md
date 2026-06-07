# Header

Header는 표시/숨김, DOM props, label, column boundary resize, TH 영역 1초 long-press column move, animated sort indicator, layout save/load를 제공한다. Layout save/load는 ref method로 처리한다.

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

동작 기준:

- 컬럼과 컬럼 경계는 resize 영역이며 cursor는 `col-resize`다.
- Resize line은 평소에는 숨겨지고, 컬럼 경계에 hover하거나 resize 중일 때만 표시된다.
- 최초 resize width는 현재 렌더링된 `TH`의 실제 너비를 기준으로 계산한다.
- TH body 영역은 column move 후보 영역이며 cursor는 `grab`이다.
- 왼쪽 버튼을 1초 이상 누르면 column move mode가 되고 cursor는 `grabbing`이다.
- Column move mode에서는 이동 중인 header ghost와 drop marker를 표시한다.
- 1초 전에 pointer move가 발생하면 column move와 sort click을 모두 취소한다.
- Sort cycle은 `none -> asc -> desc -> none`이다.
- Sort icon은 `lucide-react` 기반이며 asc/desc/none 전환 시 CSS rotate/opacity animation으로 표시한다.
- Multi-column sort는 후속 설계 항목이다.
