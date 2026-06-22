# Virtualization

`virtualized` prop은 대용량 row 표시를 위한 window rendering 경로를 사용한다. 현재 gate는 100000 rows와 1000000 rows smoke를 포함한다. Header와 body는 모든 모드에서 별도 `table` 태그로 렌더링하며, scroll은 body viewport에만 발생한다. Header는 virtual body scroll 중에도 같은 위치에 유지된다.
현재 대용량 데이터 처리는 CSR 기준이다. Server-side row model과 lazy-load row model은 후속 단계로 분리한다.

```tsx
const data: Row[] = Array.from({ length: 100000 }, (_value, index) => ({
  id: `row-${index}`,
  name: `Row ${index}`,
}));

<KmsfDataTable
  columns={[{ field: "name", label: "Name" }]}
  data={data}
  getRowId={(row) => row.id}
  pagination={{ pageIndex: 0, pageSize: data.length }}
  rowHeight={32}
  virtualized
/>
```

대용량 데이터에서 이벤트 payload는 전체 state metadata를 포함하지 않고 필요한 row, column, value만 전달한다.
