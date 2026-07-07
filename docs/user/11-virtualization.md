# Virtualization

`virtualized` prop은 대용량 row 표시를 위한 window rendering 경로를 사용한다. 현재 gate는 100000 rows smoke와 perf 검증을 포함한다. Header와 body는 모든 모드에서 별도 `table` 태그로 렌더링하며, scroll은 body viewport에만 발생한다. Header는 virtual body scroll 중에도 같은 위치에 유지된다.
현재 대용량 데이터 처리는 CSR 기준이다. Server-side row model과 viewport datasource model은 후속 단계로 분리한다.
하단 도달 시 다음 batch를 외부에서 append하는 UX는 `infiniteScroll`, `hasMoreRows`, `loadingMore`, `onLoadMore` 또는 append-mode `lazyLoad`, `onLazyLoad`로 제어한다.

100000 rows 검증은 Chrome DevTools Performance Monitor 기준으로 JS heap, DOM Node, JS event listener 증가가 스크롤 후 안정적으로 회수되는지 확인한다. 문서 예제의 목적은 브라우저에 100000개 Row를 모두 DOM으로 그리지 않고, viewport 근처 Row만 유지하는 계약을 설명하는 것이다. 수동 성능 검증에서는 GC 이후 값을 기준으로 비교하고, 기본 예제 페이지로 이동했을 때 DOM Node와 listener 수가 비정상적으로 남지 않는지 확인한다.

```tsx
const data: Row[] = Array.from({ length: 100000 }, (_value, index) => ({
  id: `row-${index}`,
  name: `Row ${index}`,
}));

<KmsfDataTable
  columns={[{ field: "name", label: "Name" }]}
  data={data}
  getRowId={(row) => row.id}
  buffer-size={10}
  pagination={{ pageIndex: 0, pageSize: data.length }}
  rowHeight={32}
  virtualized
/>
```

`"buffer-size"`는 virtualized body가 viewport 위/아래에 추가로 유지하는 row buffer 크기다. 기본값은 10이며, 컴포넌트 Cell이나 custom renderer처럼 Cell 렌더 비용이 큰 테이블에서 불필요한 pre-render 비용을 줄이는 방향으로 맞춰져 있다. 빠른 스크롤에서 blank 구간을 줄여야 하는 경우 10~20 수준에서 먼저 조정하고, buffer를 크게 잡을수록 동시에 유지되는 DOM Node와 Cell 렌더 비용이 증가한다. 논리 높이가 매우 큰 경우 body scroll height는 브라우저 한계를 피하도록 bounded coordinate로 보정된다.

`rowHeight`는 virtualized range, scroll height, render offset 계산의 기준값이다. Theme CSS에서 `tr` 또는 `td` 높이를 override할 수는 있지만, virtualized table에서는 visual height만 CSS로 바꾸면 scroll 위치와 실제 row 높이가 어긋날 수 있다. 행 높이를 바꾸는 경우 `rowHeight` prop과 `--kmsf-data-table-row-height`, `--kmsf-data-table-cell-height` 값을 같은 숫자로 맞춘다.

`data`는 immutable input으로 취급한다. Row 값을 수정할 때는 기존 배열을 직접 mutate하지 않고 새 배열 참조로 교체한다. 현재 client-side `data` 배열 계약에서는 row 객체와 row id 파생 데이터가 row 수에 비례해 browser memory를 사용한다. 화면에 보이는 row만 외부에서 공급하는 방식은 후속 lazy/viewport datasource 설계 범위다.

대용량 데이터에서 이벤트 payload는 전체 state metadata를 포함하지 않고 필요한 row, column, value만 전달한다.

## Manual Performance Checklist

- Chrome DevTools Performance Monitor를 열고 GC 이후 JS heap, DOM Node, JS event listener 값을 기록한다.
- 100000 rows 예제에서 마우스 휠 스크롤과 scrollbar drag를 모두 수행한다.
- 스크롤 후 기본 예제 페이지로 이동하고 GC 이후 DOM Node와 listener가 10% 이내 수준으로 회수되는지 확인한다.
- `rowHeight`와 `--kmsf-data-table-row-height`, `--kmsf-data-table-cell-height` 값이 불일치하면 virtual range 계산과 실제 row 높이가 어긋날 수 있으므로 같은 숫자로 맞춘다.
