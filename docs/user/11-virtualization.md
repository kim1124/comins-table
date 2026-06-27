# Virtualization

`virtualized` prop은 대용량 row 표시를 위한 window rendering 경로를 사용한다. 현재 gate는 100000 rows smoke와 perf 검증을 포함한다. Header와 body는 모든 모드에서 별도 `table` 태그로 렌더링하며, scroll은 body viewport에만 발생한다. Header는 virtual body scroll 중에도 같은 위치에 유지된다.
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
  buffer-size={25}
  pagination={{ pageIndex: 0, pageSize: data.length }}
  rowHeight={32}
  virtualized
/>
```

`"buffer-size"`는 virtualized body가 viewport 위/아래에 추가로 유지하는 row buffer 크기다. 기본값은 25이며, 빠른 스크롤에서 blank 구간을 줄이고 싶으면 20~30 수준에서 조정한다. 논리 높이가 매우 큰 경우 body scroll height는 브라우저 한계를 피하도록 bounded coordinate로 보정된다.

`data`는 immutable input으로 취급한다. Row 값을 수정할 때는 기존 배열을 직접 mutate하지 않고 새 배열 참조로 교체한다. 현재 client-side `data` 배열 계약에서는 row 객체와 row id 파생 데이터가 row 수에 비례해 browser memory를 사용한다. 화면에 보이는 row만 외부에서 공급하는 방식은 후속 lazy/viewport datasource 설계 범위다.

대용량 데이터에서 이벤트 payload는 전체 state metadata를 포함하지 않고 필요한 row, column, value만 전달한다.
