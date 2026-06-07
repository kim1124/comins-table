# Selection

Selection은 row, cell, cell range를 지원한다. React ref method는 화면에 보이는 visible row index 기준으로 row selection을 설정한다.

```tsx
const tableRef = useRef<KmsfDataTableRef<Row>>(null);

<KmsfDataTable
  ref={tableRef}
  columns={[{ field: "name", label: "Name" }]}
  data={data}
  getRowId={(row) => row.id}
  onChangeSelection={(selection) => setSelection(selection)}
/>

tableRef.current?.setSelectedRow(1);
tableRef.current?.setSelectedRows([0, 2]);
```

Core helper는 `selectRow`, `selectRows`, `selectCell`, `selectCellRange`, `getKmsfSelectedCellRange`, `clearKmsfSelection`을 제공한다. 이전 `selectKmsfRow`, `selectKmsfCell`, `selectKmsfCellRange` 이름은 공개 API에서 제거했다.

`cellSelection={false}`를 사용하면 cell/range selection state와 스타일을 적용하지 않는다. Row selection과 일반 cell event callback은 별개로 유지된다.
