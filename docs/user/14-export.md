# Export Helpers

`exportCominsRowsToCsv`와 `exportCominsRowsToJson`은 table UI와 분리된 dependency-free helper다. 현재 `rows`와 export column 정의를 입력받아 CSV 또는 JSON 문자열을 반환한다.

```ts
const exportColumns = [
  { id: "name", label: "Column1", value: (row) => row.name },
  { id: "age", label: "Column2", value: (_row, index) => `Data ${index + 1}` },
  {
    format: (row) => row.salary.toLocaleString("ko-KR"),
    id: "salary",
    label: "Column3",
    value: (row) => row.salary,
  },
];

const csv = exportCominsRowsToCsv({
  columnOrder: ["name", "age", "salary"],
  columns: exportColumns,
  headerOverrides: { salary: "급여" },
  rows,
  valueSource: "formatted",
});

const json = exportCominsRowsToJson({
  columns: exportColumns,
  rows,
});
```

`valueSource` 기본값은 `"raw"`다. `"formatted"`를 사용하면 column의 `format` 함수가 있을 때 format 결과를 export 값으로 사용한다.

CSV export는 comma, quote, newline을 RFC4180 방식으로 escape한다. `null`과 `undefined`는 빈 cell로 출력하고, object 값은 JSON 문자열로 변환한다.

Export helper는 현재 화면의 sort, filter, selection 상태를 자동으로 읽지 않는다. 필요한 row 집합은 호출자가 명시적으로 `rows`에 전달한다. 이 방식은 UI state와 export 책임을 분리해 대용량 데이터 처리와 서버 export 전략을 별도로 선택할 수 있게 한다.
