# XLSX Import / Export 설계

작성일: 2026-10-12 KST. 제품 기준: `9d7c3a8`, 브랜치 `codex/render-api-0.2.2`, 앱 관리 worktree `render-api-0-2-2/data-table`.
상태: 2026-10-12 사용자 승인 설계. 실행 단계는 [XLSX 구현 계획](../plans/2026-10-12-xlsx-import-export.md)을 따른다. 아래 API·진입점은 로컬 0.2.2 후보에 구현했다. 발행하지 않았으며 최종 UI·로컬 마무리 상태는 구현 계획의 실행 기록을 따른다. 현재 npm package version 0.2.1의 지원 기능으로 안내하지 않는다.

## 1. 목적과 확정 범위

0.2.2에서 일반 애플리케이션 행 데이터와 `.xlsx` 파일 사이의 Import / Export를 제공한다. 파일에서 얻은 결과를 애플리케이션이 검증·매핑하여 성공한 경우에만 Table의 `data`에 반영한다. React뿐 아니라 다른 프레임워크와 Worker에서도 같은 변환 계약을 사용할 수 있어야 한다.

- 일반 셀의 문자열·숫자·boolean 타입을 유지한다. 수식 셀도 저장된 결과의 원래 타입을 유지하며 수식 문자열을 행 데이터로 반환하지 않는다. 앞선 '모든 셀/수식 결과 문자열' 선택은 최신 사용자 결정으로 대체한다.
- 수식을 직접 계산하지 않는다. 저장된 결과 누락·Excel 오류 셀·매핑 실패는 Import 전체 실패로 처리한다. 캐시의 최신성을 보증하지 않는다.
- 날짜는 예외로 파일의 날짜 서식을 반영한 문자열을 반환한다. 지역에 따라 달라지는 기본 날짜 서식은 `YYYY-MM-DD`로 고정한다. 날짜를 반환한 수식에도 같은 날짜 규칙을 적용한다.
- Export는 단일 시트다. Import는 보이는 시트 하나를 처리하고, 보이는 시트가 여러 개이면 이름을 명시적으로 선택한다. 선택 시트의 병합 셀은 허용하지 않는다.
- Import 기본 한도는 압축 파일 10 MiB, 실제 압축 해제 누적 50 MiB, 선택 영역 100,000셀이다. 초과 시 전체 실패하며 일부만 잘라서 성공시키지 않는다.
- Tree·Group 구조 복원, 계층 출력·관리 열 자동 생성, PDF, 수식 편집/재계산/보존, 스타일·이미지의 원본 재현은 신규 XLSX 범위에서 제외한다. Group 화면의 일반 원본 행을 명시적으로 전달하는 것은 가능하다.
- 기존 CSV Import, CSV/JSON Export 및 Tree·Group 준비 함수는 그대로 유지한다. 이번 설계 때문에 CSV 결과의 타입·수식 문자열 정책·기존 동기 API를 변경하지 않는다.
- 과거 사용자 결정에 따라 XLSX 엔진은 기본 패키지 설치에 포함한다. 사용자가 엔진을 별도 설치·주입해야 하는 API를 기본 사용법으로 요구하지 않는다.

## 2. 현재 구현에서 재사용할 계약

`src/core/editing/import.ts`는 CSV 전체 구문·셀 한도 확인 후 `mapRow`로 일반 행을 반환한다. 매핑 콜백의 부작용까지 롤백하지는 않으므로 기존 문서처럼 순수 매핑을 요구한다.

`src/core/editing/export.ts`와 `src/model.ts`의 `CominsExportColumn`, `columnOrder`, `headerOverrides`, `valueSource`는 애플리케이션이 지정한 행·열을 사용한다. Table의 선택·페이지·필터·숨김 열을 자동 조회하지 않는다. XLSX에도 같은 소유권과 getter 의미를 적용한다.

현재 `comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`는 유지한다. 신규 파일 변환은 기존 Core의 React-free 및 외부 엔진 미유입 경계를 바꾸는 방식으로 추가하지 않는다.

## 3. 구성 및 패키지 경계 제안

| 영역 | 책임 | 금지 사항 |
| --- | --- | --- |
| Core | 행·열 투영, 스칼라/날짜 정규화, 검증 완료된 셀 배열의 순수 매핑 | React/Vue 타입, DOM, 파일 선택·다운로드, 외부 엔진 객체 공개 |
| XLSX 모듈 | OOXML/ZIP 유효성·한도 확인, 엔진 호출, 셀 메타데이터 판독, XLSX byte 생성 | 원본 행 변경, Table 상태 조회, 네트워크 업로드, 수식 평가 |
| Browser/애플리케이션 | File → bytes, 시트 선택, 진행/오류/미리보기, 성공 후 data 교체, Blob 다운로드 | 검증 실패 후 일부 행 적용, 오래된 비동기 결과로 최신 data 덮어쓰기 |

동일 npm 패키지의 신규 `comins-table/xlsx` 진입점을 제안한다. byte 변환 함수와 자체 타입을 이 진입점에 제공하고 root 또는 `/core`에서 XLSX 엔진을 정적으로 재수출하지 않는다. 중립 데이터 계약은 Core 계층에서 정의할 수 있지만 변환 엔진 타입을 공개 선언에 유출하지 않는다.

엔진은 일반 dependency로 함께 설치되며 XLSX 진입점에서만 참조한다. 설치 용량 증가는 존재한다. Table/Core의 JS 번들에 유입되지 않는다는 주장은 실제 소비자 graph·bundle 검증 이후에만 한다. runtime CDN script 로딩은 사용하지 않는다.

Promise 반환은 엔진 로딩·변환 계약이며 백그라운드 실행을 뜻하지 않는다. 중립 함수를 Worker에서 호출할 수 있게 하고 Playground의 파일 파싱은 전용 Worker를 사용한다. `mapRow` 및 value/format 콜백을 Worker로 전달하지 않는다. Worker가 검증된 셀 배열을 반환한 뒤 애플리케이션 매핑을 수행하고, Export는 콜백을 실행해 얻은 스칼라 행·열만 Worker에 전달한다. 이 연결은 예제 소유이며 최초 버전에서 공개 Worker 관리 API를 추가하지 않는다.

React peer의 기존 설치 계약은 별도 패키지 경계 과제로 남는다. 중립 XLSX 설계만으로 Vue Table 지원 또는 React 없는 일반 npm 설치를 완료했다고 선언하지 않는다.

## 4. 공개 API 제안

```ts
// 제안용 계약이며 현재 사용 가능한 API가 아니다.
type CominsXlsxCellValue = string | number | boolean | null;

type CominsXlsxImportRow = {
  cells: readonly CominsXlsxCellValue[];
  headers: readonly string[] | null;
  rowIndex: number;       // header 제외, 0부터 시작
  sheetRowNumber: number; // 실제 Excel 행 번호, 1부터 시작
};

type CominsXlsxImportLimits = {
  maxBytes?: number;             // 기본 10 * 1024 * 1024
  maxUncompressedBytes?: number; // 기본 50 * 1024 * 1024
  maxCells?: number;             // 기본 100_000
};

type CominsXlsxImportOptions<TData> = {
  bytes: Uint8Array | ArrayBuffer;
  sheetName?: string;
  hasHeader?: boolean; // 기본 true
  limits?: CominsXlsxImportLimits;
  mapRow: (row: CominsXlsxImportRow) => TData;
};

type CominsXlsxExportOptions<TData> =
  Omit<CominsExportRowsOptions<TData>, "metadata"> & {
    sheetName?: string; // 기본 Sheet1
    maxCells?: number; // 기본 100_000, header 포함
  };

function importCominsRowsFromXlsx<TData>(
  options: CominsXlsxImportOptions<TData>
): Promise<TData[]>;

function exportCominsRowsToXlsx<TData>(
  options: CominsXlsxExportOptions<TData>
): Promise<Uint8Array>;

function inspectCominsXlsx(options: {
  bytes: Uint8Array | ArrayBuffer;
  limits?: CominsXlsxImportLimits;
}): Promise<{ sheets: readonly { name: string; visibility: "visible" | "hidden" | "veryHidden" }[] }>;
```

`inspectCominsXlsx`는 시트 선택 UI를 위한 제한된 메타데이터만 반환한다. 외부 Workbook 객체나 해제해야 하는 공개 handle을 반환하지 않는다. 압축 전후 한도는 inspect에도 적용하고 셀 한도는 선택 시트 Import에 적용한다. inspect 후 Import는 별도 호출이며 전역 캐시·원본 bytes의 소유권 이전을 하지 않는다. 내부 최적화가 없어도 두 호출 모두 제한을 준수해야 한다.

공개 옵션 이름과 정확한 타입은 이 문서 검토 후 구현 계획의 타입 fixture에서 고정한다. `File`, `Blob`, DOM 이벤트, ReactNode, VNode 및 engine Workbook은 이 API에 넣지 않는다. 호출자는 작업 종료까지 전달한 bytes를 변경하지 않아야 한다. 라이브러리는 원본 bytes/rows/columns/Date를 변경하지 않는다.

## 5. Import 셀 및 수식 계약

| 입력 | `cells` 결과 |
| --- | --- |
| 문자열 `00123` | 문자열 `"00123"`; 앞자리 0·공백·개행 보존 |
| 숫자 2500, 통화 서식 | 숫자 `2500`; 통화 표시 문자열로 바꾸지 않음 |
| boolean | `true` / `false` |
| 실제 빈 셀 | `null`; 빈 문자열 셀 `""`와 구분 |
| 수식 + 저장된 숫자/boolean/문자열 결과 | 각각 `number` / `boolean` / `string` 유지 |
| 수식 + 저장된 날짜 결과와 날짜 서식 | 일반 날짜와 같은 날짜 문자열 |
| 수식 결과 없음, 오류 셀 | 위치를 포함한 오류로 전체 실패 |
| 하이퍼링크/리치 텍스트 | 표시 텍스트만 문자열; 링크·HTML·서식 객체 반환하지 않음 |

값 변환 우선순위는 오류/지원 여부 확인 → 수식 캐시 유무 확인 → 날짜 판별·문자열 변환 → 일반 스칼라 값이다. `0`, `false`, 유효한 수식 결과 `""`를 결과 누락으로 오판하지 않는다. 유효한 빈 문자열 캐시와 캐시 부재의 구분은 실제 파일 fixture로 검증한다. 엔진 객체의 truthiness만으로 판정하지 않는다.

공유·배열 수식은 원본 정의를 반환하지 않고 해당 셀의 저장된 결과만 사용한다. 이를 독립 셀 수식과 동일하게 누락/오류 검사할 수 있어야 한다. 외부 링크 및 다른 시트 참조도 저장된 결과만 사용하며 계산·조회·네트워크 요청하지 않는다. 최신 값인지 판단하거나 새로운 캐시를 만들어 넣지 않는다.

유한한 Excel 숫자는 JS number로 보존한다. 원본 파일이 이미 잃은 정밀도를 복원하지 않는다. 긴 ID는 Excel에서 텍스트로 저장해야 한다. 유효하지 않은 숫자·지원하지 않는 셀 표현은 조용히 문자열화하지 않고 실패시킨다.

### 날짜와 시간

날짜형 셀 또는 날짜 서식이 적용된 숫자를 날짜로 판별한다. `45000`이라는 숫자나 ISO처럼 보이는 문자열만으로 날짜를 추측하지 않는다. workbook의 1900/1904 기준을 반영하며 JS 로컬 시간대로 이동시키지 않는다.

파일의 명시적 날짜/날짜·시간/시간 서식을 유지한다. 지역 의존 기본 날짜 서식 ID 14는 실제 formatter 코드 `yyyy-mm-dd`로 대체한다. 다른 명시적 시간 서식을 날짜-only로 잘라내지 않는다. 시스템 locale·열 너비·Excel 앱 버전에 따른 화면 표시까지 완전히 동일하다고 보장하지 않는다.

Excel의 1900 기준 serial 60은 그 체계의 날짜 문자열 `1900-02-29`로 표현하되 실제 Gregorian Date로 생성하지 않는다. 날짜 문자열을 Gregorian 값으로 검증하려는 애플리케이션은 `mapRow`에서 거부할 수 있다. 시간-only·누적 시간도 파일 서식에 따른 문자열로 유지한다. 날짜/시간 판별·서식 해석이 실패한 경우 일련번호로 몰래 되돌리지 않는다.

### 행·헤더·시트

- 자동 선택은 보이는 시트가 정확히 하나일 때만 한다. 여러 보이는 시트이면 `SHEET_SELECTION_REQUIRED`와 선택 가능한 이름을 제공한다. 명시한 이름은 정확히 일치해야 하며 최초 버전은 숨긴 시트를 Import하지 않는다.
- 실제 셀과 문서 범위를 함께 검증하여 sparse/과장된 범위를 무제한 순회하지 않는다. 시작은 A1이고 마지막 실제 데이터/수식 셀까지의 직사각형 영역을 사용한다. 서식만 있는 꼬리는 행 데이터로 만들지 않되 비정상 선언 범위는 검사한다.
- 셀 한도는 이 직사각형의 빈 슬롯·header도 포함한다. 전체가 빈 시트는 `[]`; header-only도 `[]`다. 내부 빈 행/열은 `null`로 유지하고 꼬리의 완전히 빈 영역은 제외한다. 숨긴 행·열은 일반 데이터로 포함한다.
- 선택 시트에 병합이 있으면 영역과 관계없이 실패한다. 다른 시트의 병합만으로 선택 시트를 실패시키지 않는다. 단 파일 전체 압축·컨테이너 검사 실패는 예외다.
- header는 첫 행을 같은 셀 규칙으로 읽은 뒤 문자열로 변환하며 빈 셀은 `""`다. 중복·빈 header를 자동 수정하지 않고 위치 기준으로 매핑한다. header에서 `__proto__` 등을 읽어 객체 경로를 자동 생성하지 않는다.
- 모든 구조/셀/한도 검사가 성공한 뒤에만 `mapRow`를 호출한다. `mapRow` 오류는 그대로 전달하며 부분 배열을 반환하지 않는다. callback 부작용은 롤백할 수 없으므로 순수 콜백을 사용한다.

## 6. Export 계약

- 전달받은 행·열 순서와 기존 `columnOrder`, `headerOverrides`, raw/formatted getter 의미를 따른다. 원본 Table의 필터·페이지·선택·정렬·숨김 열은 자동 반영하지 않는다. 애플리케이션이 원하는 행·열을 명시적으로 전달한다.
- raw 기본값에서는 문자열·유한한 숫자·boolean을 해당 XLSX 타입으로 쓴다. null/undefined는 빈 셀이다. 빈 문자열은 텍스트 셀이다. formatted에서는 format callback의 결과를 같은 지원 타입 검사 후 쓴다.
- 모든 문자열은 텍스트 셀로 명시한다. `=`, `+`, `-`, `@`로 시작하는 문자열에 formula 속성을 만들지 않고 값 자체를 변형하는 apostrophe도 자동 추가하지 않는다. 수식 생성·자동 변환 옵션은 최초 버전에 제공하지 않는다.
- 유효한 Date는 복사하여 UTC 구성요소 기준으로 XLSX 날짜·시간 셀을 생성한다. 기본 표시는 `yyyy-mm-dd hh:mm:ss.000`이며 명시적 날짜-only 표현은 애플리케이션 format callback에서 문자열로 제공한다. 이 방식은 사용자 실행 환경의 시간대에 따라 파일 값이 달라지는 것을 방지하며 Excel에 timezone을 저장하는 기능은 아니다.
- BigInt/객체/배열/React 요소/함수/심볼/NaN/Infinity/invalid Date는 실패한다. 필요한 값은 애플리케이션의 value/format callback에서 문자열·스칼라로 명시적으로 변환한다. 이미 부정확한 JS 숫자의 원래 값을 복구하지 않는다.
- 선택 열이 없으면 잘못된 요청으로 실패한다. 행이 없으면 header-only 단일 시트를 만든다. header를 포함한 셀 한도를 넘거나 XLSX 형식의 행·열·텍스트 길이 제한을 넘으면 실패하며 자르지 않는다.
- sheetName 기본은 Sheet1이다. Excel 시트명 제한에 맞지 않는 이름은 자동 수정하지 않고 오류로 반환한다.
- 신규 XLSX에서 `metadata` 또는 Tree/Group 구조 옵션을 전달하면 실패한다. 이를 조용히 무시하지 않는다. `__` 이름의 일반 업무 열을 자동 삭제하거나 예약하지 않는다. 관리 열 자동 생성 기능은 기존 CSV/JSON API에만 유지한다.
- table CSS/theme/JSX, Summary 및 Group heading을 자동 생성하지 않는다. 시각적 서식과 수식 round-trip은 약속하지 않는다. 반환 bytes로 다운로드하는 시점은 Browser/애플리케이션이 결정한다.

## 7. 엔진 후보와 검증 상태

권고 후보는 SheetJS CE `xlsx` 0.20.3의 공식 ESM 배포다. 셀 원래 값/타입과 날짜 format을 구분할 수 있고, 현재 요구하는 데이터 변환에 맞는 경계를 제공한다. 공식 설치 문서는 npm registry의 xlsx가 오래된 0.18.5이며 공식 CDN 배포를 기준으로 설치하도록 안내한다. 구버전 registry 패키지 또는 제3자 재발행을 조용히 대체 사용하지 않는다.

2026-10-12 공식 tarball을 설치·실행 없이 확인했다.

- 출처: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`
- package metadata: xlsx 0.20.3, Apache-2.0, dependencies `{}`, ESM `xlsx.mjs`.
- 포함 LICENSE의 Apache License 2.0 헤더 확인. 보안 감사·전체 소스 라이선스/NOTICE·ESM bundle 및 자원 한도 검증은 아직 수행하지 않았다. dependencies `{}`는 공급망/보안 위험이 없다는 뜻이 아니다.
- 조사 artifact와 상세 메타데이터는 ignored `.local/benchmarks/xlsx-design-2026-10-12/`에 보존했다. package.json/lockfile은 변경하지 않았다.

엔진 채택은 설계 승인 후 정확한 artifact의 라이선스·NOTICE/번들 내용·알려진 취약점·공급 경로·lockfile integrity를 검사하는 구현 선행 gate로 둔다. 기본 포함과 별도 XLSX 진입점은 함께 유지한다. 외부 dependency를 Comins가 번들/복사하는 경우의 기록·배포 의무는 실제 결과에 맞춰 적용한다. 검증 실패를 allowlist/취약점 경고 suppression으로 넘기지 않는다.

## 8. 자원·오류·비동기 처리

10 MiB 압축 입력 제한은 byte 파싱 전에 적용한다. 50 MiB는 ZIP header의 선언값이 아니라 실제 inflate 출력의 누적 상한이다. entry별 압축 해제 중 누적 상한을 초과하는 출력이 발생하면 즉시 중단해야 한다. 정확히 상한과 같은 입력은 허용한다. 엔진의 통째 unzip 이후 검사 또는 Worker timeout만으로 이 요구사항을 충족했다고 선언하지 않는다.

구현 선행 검증은 제한 가능한 ZIP 해제 경로와 검증된 XML entry만 엔진에 전달하는 방법을 확인한다. 별도 해제 도구가 필요하면 기존 구현 재사용 여부·정확한 dependency/라이선스·번들을 검토한다. 제한을 우회하는 fallback은 두지 않는다. 이 경로의 실증 없이 untrusted XLSX Import를 완료하거나 출시하지 않는다.

ZIP/OOXML 콘텐츠로 형식을 확인하며 확장자/MIME/엔진의 자동 형식 추론만 믿지 않는다. 암호화, 매크로-enabled/다른 형식, 중복·비정상 archive 경로, 잘못된 관계·XML, 외부 entity 해석을 거부한다. 외부 링크를 따라가지 않고 파일을 서버에 올리지 않는다. 선택 밖 시트도 압축 해제 총량 검사 대상이다.

모든 limits는 양의 안전한 정수다. 이는 설정 가능한 입력 예산이며 JS heap의 절대 메모리 상한이 아니다. 기본값 상향은 신뢰할 수 있는 workload를 대상으로 명시해야 하며 실제 성능·peak allocation을 측정한다.

형식·파일·셀 오류는 module-owned error에 code와 sheetName/cellAddress/row 정보만 포함한다. 원본 전체 데이터나 엔진 stack을 사용자 오류 메시지에 노출하지 않는다. 주요 code는 INVALID_OPTIONS, UNSUPPORTED_FILE, INVALID_WORKBOOK, LIMIT_EXCEEDED, SHEET_SELECTION_REQUIRED, SHEET_NOT_FOUND, MERGED_CELLS, MISSING_FORMULA_RESULT, CELL_ERROR, UNSUPPORTED_VALUE다. mapRow의 예외는 application 오류로 그대로 전파한다.

Browser 예제는 진행 상태·시트 선택·오류를 표시하고 미리보기 행 수를 제한한다. Worker 종료로 취소하고 파일 변경·unmount 시 오래된 결과를 적용하지 않는다. 실패/취소 시 기존 data·selection은 유지한다. 성공 후 data 교체 및 selection 초기화는 기존 CSV 예제의 application 정책을 따른다. 다운로드 URL은 해제하며 취소된 요청이 다운로드를 실행하지 않는다.

## 9. 구현 계획에 포함할 검증

1. **엔진 선행 gate:** 위 exact artifact/license/NOTICE/audit, 실제 bounded inflate, 브라우저 ESM·Worker·React-free 소비자 및 번들 경계 실증. 부정확한 선언 길이·과도한 압축률의 fixture로 실제 50 MiB 중단 확인.
2. **Core 및 타입:** 숫자/boolean/문자열/빈 값/빈 문자열·수식의 같은 값 결과, 0/false/빈 문자열 캐시와 캐시 부재, error/공유/배열/외부 참조 수식, 날짜 1900/1904·기본/custom·날짜 수식·시간 및 환경 시간대 차이, 불변성·callback 실행 전 검증·중복 header·순수 mapRow 오류 전파.
3. **파일 독립 검증:** writer와 다른 reader 또는 XML/ZIP 검증기로 실제 파일의 셀 타입·값·문자열 수식 속성 부재·날짜 metadata를 확인한다. 같은 엔진의 왕복만으로 정확성을 선언하지 않는다. CSV의 문자열 타입은 기존대로 유지한다.
4. **지원 경계:** 시트 선택/숨김/빈 시트/병합, 잘못된 ZIP·암호화·macro·sparse/과장 range, 입력·해제·셀 한도 정확한 경계, metadata/unsupported 값 오류, header-only Export.
5. **실제 Browser:** 기존 export route의 별도 XLSX sample에서 다운로드→선택→타입별 행·수식 캐시·날짜·시트 선택·실패 시 원본 보존·취소/늦은 완료·동일 파일 재선택·unmount 및 console/page error를 확인한다. 대량 미리보기는 전체 DOM/전체 텍스트를 만들지 않는다.
6. **패키지·문서:** root/core 기존 graph 불변, 신규 xlsx 선언/ESM/엔진 포함·미유입 대조군, 같은 tarball React18/19·React-free 및 단순 다른 프레임워크 소비자, 한영 Export 가이드·0.2.2 migration·compile fixture·Playground 설명·manifest·CHANGELOG. README는 기존 짧은 링크 방식을 유지한다.
7. **모듈 게이트:** 실제 source/package/lockfile 변경 후 npm run verify, 영향 Playwright 및 공유 route 영향 시 전체 E2E, 파일 처리 규모·취소 성능 측정 후 Astra Computer Use를 별도 기록한다. 가상화/scroll 계산 변경 없이 전체 perf suite를 의무화하지 않는다. XLSX 실패를 이번 구현하지 않은 Vue UI와 혼동하지 않는다.

## 10. 현재 상태와 다음 단계

사용자의 데이터 타입·수식·날짜·시트/병합/한도 결정에 따라 로컬 구현과 자동 검증을 수행했다. 실제 채택한 엔진은 SheetJS CE 0.20.3, ZIP 무결성/해제는 @zip.js/zip.js 2.23.0 native JS entry, XML 검증은 saxes 6.0.0이다. 새 /xlsx 진입점 밖으로 엔진을 연결하지 않았다. 공급망·오류·한도·날짜·같은 artifact 및 회귀 결과는 구현 계획과 reports/2026-10-12.md의 후속 기록을 따른다.

독립 리뷰 및 Security diff scan의 자원 문제를 수정했다. 선택하지 않은 XML은 노드 트리를 보관하지 않고 검증한다. 보관하는 메타데이터는 XML 문서별 max(1_000_000, 8 * maxCells) 노드까지 허용하며 다음 객체 생성 전에 LIMIT_EXCEEDED로 실패한다. 겹치는 수식 범위는 INVALID_WORKBOOK으로 실패하고 고유 셀만 순회한다. heap 절대 상한을 보증하지 않는다. 날짜 최종일 9999-12-31의 분수 시간에서 elapsed/numeric-conditional 사용자 서식은 잘못된 합계를 반환하지 않고 UNSUPPORTED_VALUE로 실패한다.

추가 사용자 요청에 따라 CSV·XLSX 예제에 1000/10000행 선택을 제공한다. 전체 행을 파일로 내보내고 전체 Import 결과를 보존하며 표와 CSV 텍스트 미리보기만 100행으로 제한한다. 공개 package version은 0.2.1이며 0.2.2 후보를 발행한 것으로 안내하지 않는다. Vue Table 어댑터·homepage 동기화·버전/릴리스 작업은 별도 단계다.

## Approved implementation revision: Export styles and parser replacement

The subsequent maintainer-approved implementation replaces the XML adapter with `@federicocarboni/saxe` 0.8.0 and Export encoding with `write-excel-file` 4.1.1. ZIP validation remains `@zip.js/zip.js`; SheetJS CE 0.20.3 remains the Import/date-format engine. This revision supersedes the earlier parser/Export-engine selection. Dependencies stay external to Comins library chunks and load only through `/xlsx`.

The owned `CominsXlsxExportStyles` API offers a default Comins theme, a plain preset, global header/body styles and per-column overrides by column ID. It exposes no vendor feature hooks or arbitrary XML. A private writer transform preserves literal text including empty strings, prototype-named strings and OOXML escape sequences; numeric/boolean/null and UTC Date semantics remain unchanged. Import limits, namespace validation, cached formula values, callback ownership and unsupported Tree/Group reconstruction remain the existing contract.

Validation covers type/encoding preservation, invalid styles, namespace/DTD/depth limits, bilingual docs, custom-style Worker download/re-import, 1000/10000-row workloads and the same packed artifact in Node, Vue byte consumers and a production module Worker. License evidence and third-party research are retained only under ignored `.local/benchmarks/`; required distribution notices remain in THIRD_PARTY_NOTICES.md.

## Playground display revision — 2026-10-13

The maintainer subsequently requested removing the 100-row display cutoff. This supersedes that Playground-only provision: CSV/XLSX samples start with 1000 rows, accept 1000/10000-row presets, pass all rows to the table and use virtual scrolling to reach the final row. CSV text output contains all rows. Import byte/cell budgets and library byte APIs remain the previously approved contract.
