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

## XLSX (0.2.2 candidate)

`comins-table/xlsx`는 `inspectCominsXlsx`, `importCominsRowsFromXlsx`, `exportCominsRowsToXlsx`를 제공합니다. 엔진은 기본 설치에 포함되지만 이 진입점에서만 로딩합니다. 미발행 0.2.2 후보에 구현된 API이며 발행된 0.2.1 API에는 포함되지 않습니다. 일반 값과 수식 캐시의 문자열·숫자·boolean·null 타입을 유지하며 날짜는 파일 서식을 사용하고 기본 날짜 서식 14는 `yyyy-mm-dd`로 고정합니다. 수식 재계산과 Tree/Group 계층 복원은 지원하지 않습니다.

<!-- comins-doc-example: compile=xlsx-files -->
```ts
import { CominsXlsxError, inspectCominsXlsx, importCominsRowsFromXlsx, exportCominsRowsToXlsx } from "comins-table/xlsx";
type Row = { id: string; score: number; active: boolean };
async function roundTrip() {
  const bytes = await exportCominsRowsToXlsx<Row>({
    rows: [{ id: "001", score: 0, active: false }],
    columns: [
      { id: "id", value: row => row.id },
      { id: "score", value: row => row.score },
      { id: "active", value: row => row.active },
    ],
  });
  const workbook = await inspectCominsXlsx({ bytes });
  try {
    return await importCominsRowsFromXlsx<Row>({
      bytes, sheetName: workbook.sheets.find(sheet => sheet.visibility === "visible")?.name,
      mapRow: ({ cells, headers }) => {
        const [id, score, active] = cells;
        if (headers?.join(",") !== "id,score,active" || typeof id !== "string" || typeof score !== "number" || typeof active !== "boolean") throw new Error("Invalid application row");
        return { id, score, active };
      },
    });
  } catch (error) {
    if (error instanceof CominsXlsxError) throw new Error(`File error: ${error.code}`);
    throw error;
  }
}
void roundTrip;
```

함수는 `Uint8Array`(offset view 포함) 또는 `ArrayBuffer`를 받고 Promise를 반환합니다. `CominsXlsxImportOptions<TData>`는 `bytes`와 `mapRow`를 요구하고 `hasHeader` 기본값은 true입니다. `CominsXlsxImportRow`에는 readonly `cells`, readonly 문자열 `headers` 또는 null, 데이터 기준 0부터 시작하는 `rowIndex`, 시트 기준 1부터 시작하는 `sheetRowNumber`가 있습니다. 헤더는 문자열로 변환하고 빈 헤더는 빈 문자열, 중복 이름은 그대로 유지합니다. 열 위치로 매핑하며 객체 경로를 추론하지 않습니다. 실제 빈 셀은 null이고 캐시의 빈 문자열·false·0과 앞자리 0 식별자는 구분합니다. 날짜는 스칼라 타입 보존의 예외입니다.

`inspectCominsXlsx({ bytes, limits? })`는 엔진 Workbook이나 리소스 handle 대신 이름과 visible/hidden/veryHidden 상태를 담은 `CominsXlsxWorkbookInfo`를 반환합니다. 보이는 시트가 하나면 자동 선택하고 여러 개면 대소문자를 포함한 정확한 `sheetName`을 지정해야 합니다. 숨긴 시트는 가져오지 않지만 숨긴 행·열은 포함합니다. 보이는 시트 없음, 없는 이름, 선택 시트의 병합, 잘못된 XML·ZIP, 암호화 파일과 매크로 Workbook은 실패합니다. 다른 시트의 병합만으로 선택 시트를 실패시키지는 않습니다. OOXML XLSX를 지원하며 XLS·XLSB·이름만 바꾼 CSV·PDF는 지원하지 않습니다.

A1부터 마지막 실제 값·수식까지 직사각형으로 가져오고 중간 빈 행·열을 포함합니다. 빈 시트와 헤더만 있는 시트는 `[]`를 반환합니다. 스타일만 있는 뒤쪽 셀은 데이터 행을 추가하지 않지만 과장된 선언 범위도 엔진 파싱 전에 검사합니다. `CominsXlsxImportLimits` 기본값은 `maxBytes: 10 * 1024 * 1024`, `maxUncompressedBytes: 50 * 1024 * 1024`, `maxCells: 100_000`입니다. 셀 수에는 헤더·빈 슬롯을 포함하고 선택 시트에 적용하며 bytes 예산은 inspect에도 적용합니다. 정확히 한도는 허용하고 초과 시 전체 실패하며 잘라서 반환하지 않습니다. 양의 안전한 정수만 허용하고 신뢰할 수 있는 작업에서 명시적으로 올릴 수 있습니다. 선택하지 않은 시트를 포함한 **모든** 항목의 실제 해제 bytes를 누적합니다. 원본 ZIP의 CRC·디렉터리 검증을 완료한 컨테이너만 엔진에 전달합니다. XML DTD·잘못된 entity·256단계를 초과하는 중첩도 거절합니다.

한도는 입력 예산이며 JS heap의 절대 상한이 아닙니다. 디코딩 XML·메타데이터·정규화 ZIP·결과 행이 메모리에 함께 존재할 수 있습니다. 파일을 업로드하거나 Workbook URL을 요청하지 않으며 정상 캐시가 있는 외부 참조 수식도 가져올 수 있습니다. 수식 텍스트를 반환하거나 재계산하지 않고 캐시 누락·Excel 오류 셀은 전체 실패합니다. 저장된 결과의 최신 여부는 보증하지 않습니다. 날짜 결과는 파일 숫자 서식 문자열로 반환하고 지역 의존 기본 서식 ID 14만 `yyyy-mm-dd`로 고정합니다. 1900·1904 체계와 사용자 시간 서식, Excel의 가상 날짜 `1900-02-29`를 지원합니다. ISO 날짜 셀은 기록된 달력·시간 요소를 유지하고 로컬 시간대를 임의로 부여하지 않습니다. Date Export는 원본을 변경하지 않고 UTC 요소를 복사하여 `yyyy-mm-dd hh:mm:ss.000`으로 기록합니다. 잘못된 날짜는 실패합니다.

`CominsXlsxExportOptions<TData>`는 일반 `rows`, 기존 export `columns`, `columnOrder`, `headerOverrides`, `valueSource`, 선택적 `sheetName`(기본 Sheet1), `maxCells`(기본 100,000)를 받습니다. raw는 원래 타입을, formatted는 애플리케이션 `format` getter 결과를 사용합니다. `=`, `+`, `-`, `@`로 시작하는 문자열은 수식이나 apostrophe를 추가하지 않은 명시적 텍스트 셀입니다. null·undefined는 빈 셀이며 유한 숫자·boolean·문자열·유효 Date를 지원합니다. 객체·배열·BigInt·유한하지 않은 숫자·잘못된 Date는 실패합니다. 문자열은 32,767 UTF-16 code units로 제한하며 supplementary 문자는 2개 단위를 사용합니다. Excel의 1,048,576행·16,384열 상한에는 헤더도 포함합니다. 잘못된 시트명을 자동 변경하지 않습니다. 단일 시트를 만들고 임의 셀 스타일 round-trip을 지원하지 않습니다. `metadata`, `nodes`, `groups`는 runtime 오류이며 `metadata?: never`는 호환 변수의 metadata도 타입 단계에서 거절합니다. `__` 업무 열은 일반 열로 유지하고 관리용 메타데이터를 자동 생성하거나 Tree·Group 계층을 복원하지 않습니다. 기존 CSV·JSON 동작은 그대로입니다.

`CominsXlsxError`에는 `CominsXlsxErrorCode`와 선택적 `sheetName`, `cellAddress`, `rowNumber`, `sheetNames`만 제공합니다. 메시지에 원본 셀 값·엔진 진단을 복사하지 않습니다. 오류 코드는 INVALID_OPTIONS, UNSUPPORTED_FILE, INVALID_WORKBOOK, LIMIT_EXCEEDED, SHEET_SELECTION_REQUIRED, SHEET_NOT_FOUND, MERGED_CELLS, MISSING_FORMULA_RESULT, CELL_ERROR, UNSUPPORTED_VALUE입니다. 파일·셀 전체 검증 후에만 `mapRow`를 호출합니다. 사용자 getter·mapper 예외는 그대로 전파하고 부분 결과 배열을 반환하지 않습니다. 콜백 부작용을 롤백하지 못하므로 순수 매핑을 사용하고 성공 후에만 애플리케이션 데이터를 교체해야 합니다.

[Export Playground](/examples/export)의 독립 Excel 카드에서 수식 캐시·날짜 예제 다운로드, 시트 선택, 취소·재시도, 최대 100행 미리보기를 제공합니다. inspect·Import·Export는 전용 module Worker에서 처리하며 main의 콜백을 전송하지 않습니다. id/name/score/active/date 타입과 고유 ID를 애플리케이션에서 검증한 뒤 교체하며 빈 Import는 기존 예제 데이터를 보존합니다. 취소·파일 교체·unmount에서 Worker를 종료하고 늦은 결과·다운로드를 무시합니다. Worker 시작 실패 시 main 전체 파싱으로 자동 우회하지 않습니다. 파일 크기는 할당 전에 검사하고 다운로드 object URL을 해제합니다. Promise 반환 자체는 백그라운드 실행을 의미하지 않으므로 byte API를 직접 사용하는 앱은 자신의 Worker 전략을 선택해야 합니다.

Transitional·Strict OOXML namespace를 모두 지원합니다. 마지막 날짜 `9999-12-31`의 일반 달력 시간과 기본 밀리초 Date 서식은 지원하지만 시간 fraction이 있는 elapsed·숫자 조건 custom 서식은 합계를 변경하지 않고 UNSUPPORTED_VALUE로 실패합니다. 엔진이 지원하지 않는 날짜 서식 문법도 이 자체 오류로 변환합니다.

선택하지 않은 XML은 노드 트리를 보관하지 않고 검증합니다. Workbook·스타일·선택 시트 메타데이터는 XML 문서별 `max(1_000_000, 8 * maxCells)` 노드로 제한하고 다음 객체 생성 전에 검사합니다. 신뢰할 수 있는 복잡한 메타데이터에서만 `maxCells`를 명시적으로 올릴 수 있습니다. 이 구조 제한은 선택 시트의 직사각형 셀 수와 별개이며 inspect에도 적용합니다. 서로 겹치는 수식 범위는 잘못된 파일로 거절하고 중복 순회하지 않습니다.

0.2.2 후보의 CSV·Excel 파일 예제에는 **1000행 예제**, **10000행 예제** 버튼을 제공합니다. 크기를 선택해 전체 파일을 다운로드한 후 초기화하고 해당 파일을 가져오면 전체 행 수를 확인할 수 있습니다. 표는 최대 100행이며 CSV 텍스트 미리보기도 데이터 100행으로 제한합니다. 이 제한으로 Import 데이터나 다운로드 파일이 잘리지는 않습니다. CSV 변환은 동기 Core 헬퍼를 사용하고 XLSX 변환은 전용 Worker에서 수행합니다.
