# Export Helpers

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/14-export.md) · [Playground](http://127.0.0.1:4002/examples/export)

`exportCominsRowsToCsv`와 `exportCominsRowsToJson`은 table UI와 분리된 dependency-free helper다. 현재 `rows`와 export column 정의를 입력받아 CSV 또는 JSON 문자열을 반환한다.

Playground의 **CSV 파일 가져오기·내보내기** 예제(0.2.1)는 Core 헬퍼를 브라우저의 로컬 파일과 연결합니다. 예제 CSV를 다운로드하거나 `id,name,score` 헤더를 가진 최대 1 MB UTF-8 파일을 선택합니다. ID는 비어 있지 않고 고유해야 하며, 이름과 유한한 숫자 점수가 필요합니다. 모든 행의 검증이 성공해야 테이블 데이터를 교체하고, 빈 파일은 예제에서 거부합니다. 초기화하면 예제 행을 복원합니다. 서버로 파일을 전송하지 않습니다.

예제는 다운로드할 ID·이름이 공백 뒤 수식 접두사로 시작하거나 첫 문자가 탭·줄바꿈이면 작은따옴표를 앞에 추가합니다. 다시 가져오면 이 문자도 보존됩니다. 이는 예제의 애플리케이션 정책이며 Core Export는 수식을 자동으로 escape하지 않습니다. CSV 해석은 스프레드시트 애플리케이션에 따라 다를 수 있습니다.

<!-- comins-doc-example: fragment -->
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

## CSV Import (0.2.1)

`importCominsRowsFromCsv<TData>`는 `comins-table/core`와 `comins-table`에서 제공합니다. CSV 문자열을 일반 업무 행 배열로 반환하며 Table 갱신, ID 생성, Tree·Group 구조 복원과 파일 읽기는 수행하지 않습니다. 파일은 애플리케이션에서 읽고 디코딩한 문자열을 Core로 전달합니다.

<!-- comins-doc-example: compile=csv-import -->
```ts
import { importCominsRowsFromCsv } from "comins-table/core";

type Row = { id: string; score: number };
const rows = importCominsRowsFromCsv<Row>({
  text: 'id,score\r\n"001",42',
  mapRow: ({ cells, headers, rowIndex }) => {
    if (headers?.[0] !== "id" || headers[1] !== "score") throw new Error("Unexpected columns");
    const score = Number(cells[1]);
    if (!cells[0] || !Number.isFinite(score)) throw new Error(`Invalid row ${rowIndex + 1}`);
    return { id: cells[0], score };
  },
});
// rows: [{ id: "001", score: 42 }]
```

`CominsCsvImportOptions<TData>`의 필수 값은 `text`와 `mapRow`입니다. `hasHeader` 기본값은 `true`이며, `false`이면 첫 레코드부터 데이터로 처리합니다. 콜백의 `CominsCsvImportRow`에는 읽기 전용 `cells`, 읽기 전용 `headers`(헤더가 없으면 `null`), 데이터 행 기준 0부터 시작하는 `rowIndex`가 전달됩니다. 앞자리 0, 공백, 수식 문자열과 중복 헤더 이름을 그대로 보존합니다. 위치로 매핑하고 헤더를 직접 검증하며, 입력 헤더로 필드 경로나 객체 속성을 자동 생성하지 않습니다. 콜백 입력은 직접 변경하지 않습니다.

쉼표 구분과 이중 따옴표 이스케이프는 [RFC 4180](https://www.rfc-editor.org/info/rfc4180/)의 CSV 표현을 따릅니다. 레코드 구분에는 CRLF·LF·CR을 허용하며 따옴표 안의 줄바꿈은 보존합니다. 처음의 BOM은 제외하고 마지막 줄바꿈은 추가 행으로 만들지 않으며 실제 빈 레코드는 유지합니다. 빈 입력이나 헤더만 있는 입력은 `[]`를 반환합니다. 모든 레코드의 필드 수가 같아야 하므로 여러 열이 있는 파일의 빈 레코드는 검증에 실패합니다.

닫히지 않은 따옴표, 따옴표로 감싸지 않은 필드 안의 따옴표, 닫는 따옴표 뒤의 문자, 불일치하는 필드 수는 `SyntaxError`를 발생시킵니다. 전체 CSV를 파싱·검증한 뒤 `mapRow`를 호출합니다. 매핑 오류도 그대로 전달하며 일부 행만 반환하지 않습니다. 다만 콜백 내부 부수효과를 되돌리지는 않으므로 매핑은 순수하게 작성하고 성공한 반환값을 받은 뒤 데이터를 적용합니다.

`maxCharacters` 기본값은 초기 BOM을 포함한 UTF-16 코드 단위 `1_000_000`, `maxCells` 기본값은 헤더 셀을 포함한 `100_000`입니다. 양의 안전한 정수만 허용하며 잘못된 제한값이나 한도 초과는 `RangeError`를 발생시킵니다. 신뢰할 수 있는 처리량에 맞춰 명시적으로 늘릴 수 있습니다. 동기 메모리 처리 방식이며 스트리밍이 아닙니다. 수식을 실행하거나 이후 스프레드시트 Export·HTML 렌더링용으로 값을 정제하지 않습니다. 기존 CSV·JSON Export 동작은 유지합니다.

## Tree·Group 메타데이터 (0.2.1)

Playground의 **Tree·Group 내보내기** 카드에서 원본 구조와 CSV/JSON 미리보기를 전환합니다. 원본 테이블을 접어도 전체 입력 행이 Export에 포함되는지 확인할 수 있습니다. 다운로드는 JSON 미리보기 중에도 선택한 구조의 CSV를 생성합니다. Group 예제에는 빈 그룹이 있으며 Export에 가상 데이터 행을 추가하지 않습니다.

관리 열에는 언더바 두 개(`__`)를 붙입니다. `CominsExportMetadata<TData>`는 `CominsExportRowsOptions.metadata`에서 선택적인 `__rowId`, `__parentId`, `__depth`, `__groupId` 값 getter를 제공합니다. 활성화된 관리 열은 이 고정 순서대로 선택된 업무 열 뒤에 추가됩니다. 원본 업무 행에 관리 속성을 주입하지 않습니다. 같은 이름의 업무 속성은 유지하지만, 이를 활성 관리 열과 같은 헤더로 내보내면 값을 덮어쓰지 않고 오류를 발생시킵니다.

`columnOrder`, `headerOverrides`, `valueSource`는 업무 열에 적용됩니다. 관리 헤더는 `__` 접두사와 고정 이름을 유지하며 format 콜백으로 메타데이터를 바꾸지 않습니다. CSV는 기존 escaping 규칙을 적용하고 null 부모를 빈 셀로 출력합니다. JSON은 null과 숫자·문자열 ID 타입을 보존합니다. CSV는 이러한 타입 구분을 보존할 수 없으므로 필요하면 JSON이나 앱의 매핑 규칙을 사용합니다. metadata를 생략하면 기존 Export 동작을 유지합니다.

<!-- comins-doc-example: fragment -->
```ts
import { createCominsTreeExportOptions, createCominsGroupedExportOptions, exportCominsRowsToCsv } from "comins-table/core";

const treeCsv = exportCominsRowsToCsv(createCominsTreeExportOptions({
  columns: exportColumns,
  nodes: treeNodes,
  getRowId: item => item.id,
}));
// 업무 열 뒤에 __rowId,__parentId,__depth

const groupedCsv = exportCominsRowsToCsv(createCominsGroupedExportOptions({
  columns: exportColumns,
  rows,
  groups,
  getGroupId: group => group.id,
  getRowGroupId: item => item.groupId,
  getRowId: item => item.id,
}));
// 업무 열 뒤에 __rowId,__groupId
```

`createCominsTreeExportOptions`는 `CominsExportTreeOptions<TData>`를 받아 접힌 자식까지 포함한 전체 입력 노드를 전위 순회합니다. 루트의 `__parentId`는 null, `__depth`는 0입니다. `getRowId`의 인덱스도 전체 전위 순서를 따릅니다. 중복 ID와 순환 참조는 거부하며, 접힌 노드를 제외하는 UI의 visible-row projection을 사용하지 않습니다.

`createCominsGroupedExportOptions`는 `CominsExportGroupedOptions<TData, TGroup>`를 받습니다. 명시한 `groups` 순서를 따르고, 그룹 내부는 입력 행 순서를 유지합니다. `getRowId`·`getRowGroupId`에는 원래 입력 인덱스, Column value/format에는 최종 Export 행 인덱스가 전달됩니다. 중복 그룹/행 ID와 등록되지 않은 그룹을 참조하는 행은 거부합니다. 빈 그룹은 데이터 행을 추가하지 않습니다. 현재 단일 계층 Group의 소속은 `__groupId`로 표현하며 제목·집계·보고서용 가상 행은 추가하지 않습니다.

두 함수는 동일한 CSV·JSON 헬퍼가 소비하는 `CominsExportRowsOptions<TData>`를 반환합니다. 업무 행 객체 참조는 유지하고 준비 시점의 메타데이터를 연결합니다. 반환된 옵션의 rows를 따로 교체·재정렬하지 말고 함께 사용하며, 데이터나 구조가 바뀌면 옵션을 다시 생성합니다. 정렬·필터·페이지·선택 범위는 앱이 결정하여 내보낼 원본 rows/tree/groups를 명시적으로 전달합니다. Import는 mapper로 일반 행 데이터를 반환하며 Tree·Group을 자동 복원하지 않습니다. React·DOM은 필요하지 않습니다.
