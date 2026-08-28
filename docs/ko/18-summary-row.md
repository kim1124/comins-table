# Summary Row

Summary Row는 현재 visible-column layout에 맞춰 고정 footer 집계 값을 출력한다. 각 컬럼은 resolved column id, 즉 명시한 `id` 또는 id가 없을 때의 `field`를 key로 설정한다.

Visible Column이 수평으로 overflow되면 하나의 native horizontal scrollbar를 Summary Row 다음, 즉 전체 Table 최하단에 표시한다. Scrollbar 직접 입력과 Body 위의 horizontal wheel 입력은 Header, Body와 Summary를 같은 위치로 동기화한다. Summary가 없으면 동일한 scrollbar가 Body 바로 다음에 표시된다.

```tsx
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  summary={{
    label: "합계",
    columns: {
      item: "count",
      quantity: "sum",
      unitPrice: "avg",
      amount: {
        aggregate: "sum",
        className: "summary-amount",
        format: ({ value }) => `₩${Number(value).toLocaleString()}`,
        style: { fontWeight: 700 },
      },
      score: "max",
    },
  }}
/>
```

## 기본 및 커스텀 집계

기본 집계 이름은 `count`, `sum`, `avg`, `min`, `max`다. `count`는 전달된 Row 개수를 반환한다. 숫자 집계는 유한한 숫자가 아닌 값을 제외하며 숫자 값이 하나도 없으면 빈 cell을 반환한다.

도메인 계산이 필요하면 기본 집계 대신 함수를 사용할 수 있다.

```tsx
summary={{
  columns: {
    amount: ({ rows, values, column }) => calculateTotal(rows, values, column),
  },
}}
```

집계 함수는 runtime `column`, 전체 집계 대상 `rows`, 원본 field `values`를 받는다.

## colSpan과 format

Object 설정으로 visible summary cell을 병합하거나 집계 결과를 가공한다.

```tsx
summary={{
  columns: {
    item: { aggregate: "count", colSpan: 2 },
    amount: {
      aggregate: "sum",
      format: ({ value, values, rows, column }) => formatAmount(value),
    },
  },
}}
```

`colSpan`은 설정한 visible column부터 시작해 포함된 summary cell을 건너뛰며 남은 visible column 수를 초과하지 않는다. `format`은 집계 후 실행되며 `value`, `values`, `rows`, `column`을 받는다. 공개 옵션 이름은 기존 cell formatting 용어와 일치하는 `format`을 유지한다.

## Row 및 Cell 스타일

`summary.className`과 `summary.style`은 footer row에 적용한다. 컬럼 Object의 `className`과 `style`은 해당 summary cell에만 적용한다.

```tsx
summary={{
  className: "summary-row",
  style: { background: "#f8fafc" },
  columns: {
    amount: {
      aggregate: "sum",
      className: "summary-cell--emphasis",
      style: { color: "#0369a1" },
    },
  },
}}
```

Flat `infiniteScroll` 또는 `lazyLoad`에서는 controlled `data`에 현재 적재된 Row만 집계하며 아직 로드하지 않은 원격 total을 의미하지 않는다. Tree Grid에서는 접힌 부모 아래의 leaf를 포함한 모든 leaf `item`을 집계하고 중복 계산을 방지하기 위해 부모 값을 제외한다.

`npm run dev` 실행 후 `/examples/summary-row`에서 기본 집계, `colSpan`, `format`, 스타일 예제를 확인할 수 있다.

Controlled Column Filtering에서는 flat pagination 전에 filtered leaf Row를 Summary Row 집계에 사용한다. Row Grouping 결합에서는 Summary와 Group aggregate가 같은 filtered membership input을 사용하고 모든 explicit Group은 계속 표시된다.
