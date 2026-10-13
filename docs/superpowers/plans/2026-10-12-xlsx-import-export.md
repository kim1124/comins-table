# XLSX Import / Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the current session, or `superpowers:subagent-driven-development` only if the maintainer selects delegated execution. Steps use checkbox (`- [ ]`) syntax for tracking. This plan does not itself authorize implementation, delegation, remote writes, or publication.

**Goal:** 승인된 0.2.2 XLSX 설계를 일반 행 Import/Export, 실제 압축 해제 한도, 중립 패키지 진입점, 예제·문서 및 동일 artifact 검증까지 구현한다.

**Architecture:** Core의 순수 데이터 정규화/매핑과 외부 엔진의 ZIP·OOXML 변환을 분리한다. `comins-table/xlsx`는 byte 기반 Promise API를 제공하고 기존 root/Core에 엔진을 유입시키지 않는다. Browser 예제는 Worker에서 파싱하고 애플리케이션에서 순수 매핑·성공 결과 적용·다운로드를 담당한다.

**Tech Stack:** 기존 TypeScript/Vite/Vitest/Playwright, SheetJS CE 0.20.3 공식 artifact 후보, 제한 가능한 ZIP 해제 경로. 최초 ZIP 후보 fflate는 CRC/디렉터리 검증의 별도 구현을 요구하여 채택하지 않았다. Task 1 이후 실제 채택은 @zip.js/zip.js 2.23.0 native JS entry 및 saxes 6.0.0이다. exact artifact·라이선스·보안·해제 한도 검증을 통과한 뒤 설치했다.

**Spec:** [승인된 XLSX Import / Export 설계](../specs/2026-10-12-xlsx-import-export-design.md). 설계와 계획을 함께 읽는다.

작성일: 2026-10-12 KST. 기준 제품 HEAD `9d7c3a8`, 브랜치 `codex/render-api-0.2.2`, 앱 관리 worktree `render-api-0-2-2/data-table`를 재사용한다. 설계/관리 지침/기록의 기존 미커밋 변경은 보존하고 원본 Vue checkout은 변경하지 않는다. 아래 세부 체크리스트는 최초 계획을 보존한다. 실행 상태와 명령·구현 차이는 마지막 실행 기록 및 작업 리포트가 기준이며, 미체크 박스를 현재 미구현 판정으로 사용하지 않는다.

## Global Constraints

- 일반 셀과 수식의 저장된 결과는 문자열·숫자·boolean 타입을 유지한다. 실제 빈 셀은 null이며 빈 문자열과 구분한다. 수식은 재계산하지 않고 누락·오류 시 전체 실패한다.
- 일반/수식 날짜는 파일 서식 문자열로 반환하며 지역 의존 기본 날짜 서식 ID 14만 `yyyy-mm-dd`로 고정한다. 1900/1904 체계·시간을 보존하고 로컬 시간대 변환을 하지 않는다.
- Export는 단일 시트, Import는 보이는 시트 하나다. 여러 보이는 시트는 명시적 이름 선택, 선택 시트의 병합은 전체 실패다. 숨긴 행/열은 포함하고 숨긴 시트는 Import하지 않는다.
- Import 기본값은 `10 * 1024 * 1024` 압축 bytes, `50 * 1024 * 1024` 실제 해제 bytes, `100_000` 직사각형 셀(header/빈 슬롯 포함)이다. 정확히 한도는 허용하고 초과는 실패하며 잘라서 반환하지 않는다.
- 엔진 설치는 기본 패키지에 포함한다. 신규 `/xlsx`만 엔진을 참조하며 root/Core/clipboard/selection/CSS의 기존 계약과 React peer는 유지한다. runtime CDN/업로드/telemetry는 추가하지 않는다.
- byte/행/열/Date를 변경하지 않는다. 파일 전체 구조·셀 검증 성공 전 `mapRow` 호출 0회, 매핑 실패 시 반환 부분 행 0개다. 콜백 부작용 롤백은 보장하지 않는다.
- Export 문자열은 명시적 text cell이며 formula 속성·자동 apostrophe를 추가하지 않는다. Date는 복사한 UTC 구성요소와 `yyyy-mm-dd hh:mm:ss.000`을 사용한다. 지원하지 않는 값·metadata/Tree/Group 옵션은 오류다.
- Tree/Group 구조 지원·PDF·수식 보존/편집/재계산·Vue UI·스타일 round-trip을 추가하지 않는다. 기존 CSV/JSON/구조 준비 함수의 동기 API와 결과는 유지한다.
- package version은 0.2.1 후보 상태를 유지한다. 이번 실행은 로컬 구현/검증/checkpoint까지이며 push/PR/merge/tag/Release/배포/publish는 별도 명시적 승인 대상이다.
- 라이선스/입력 안전성 gate 실패를 skip/allowlist/로그 suppression으로 통과시키지 않는다. 같은 제품/의존성/설정의 성공 증거는 재사용하고 실패 영향만 재검증한다.

## Review Focus

| 실제 입력/실패 조건 | 기대 동작 | 소유 테스트 |
| --- | --- | --- |
| 수식 결과 0/false/빈 문자열과 캐시 누락 | 앞의 세 값은 유효, 누락만 실패; shared/array의 비-anchor 셀도 검사 | Task 4 `preserves falsey formula caches and rejects missing shared results` |
| nonzero-offset Uint8Array view와 호출자 원본 | 지정한 view만 읽고 prefix/suffix·원본 버퍼·Date를 변경하지 않음 | Task 3/4 `reads only the supplied view and leaves source untouched` |
| 미선택 시트의 압축 폭탄·과장 range·잘못된 CRC | 실제 해제 총량 초과/컨테이너 오류는 먼저 실패; mapRow 0회 | Task 3 `enforces actual inflation across unselected entries` |
| 구조 준비 옵션을 변수로 전달·수식처럼 보이는 문자열 | TS 구조적 추가 속성에도 runtime metadata 거부; 문자열은 f 없는 text cell | Task 2/4 `rejects metadata from prepared options and writes literal formula text` |
| 취소/unmount/새 파일 뒤 오래된 Worker 응답 | 기존 data/selection 유지, 늦은 적용·다운로드 0회, Worker/URL 정리 | Task 5 `ignores superseded results and cleans worker resources` |

## 파일 책임과 인터페이스

| 경로 | 책임 |
| --- | --- |
| `src/core/editing/xlsx-model.ts` (신규) | 공개 중립 옵션/셀/행/시트/오류 타입과 내부 prepared sheet/cell descriptor |
| `src/core/editing/xlsx-data.ts` (신규) | 값·열 투영, Export 예산, 타입 보존, 검증 완료 행의 순수 매핑 |
| `src/xlsx/errors.ts` (신규) | module-owned 오류 클래스와 engine 오류 정리; Core 오류는 중립 descriptor 사용 |
| `src/xlsx/zip.ts` (신규) | 스트리밍 실제 inflate 예산, archive 무결성·경로 및 검증 container |
| `src/xlsx/workbook.ts` (신규) | OOXML 관계/시트/범위/캐시 존재·formula 영역/지원 여부 검사 |
| `src/xlsx/engine.ts` (신규) | 유일한 SheetJS adapter; 검증된 입력 decode/날짜 format/typed encode |
| `src/xlsx.ts` (신규) | inspect/import/export 오케스트레이션과 명시적 공개 exports |
| `package.json`, `package-lock.json`, `vite.config.ts` | 통과한 runtime dependency pin, `/xlsx` exports 및 외부 엔진 경계 |
| `example/src/features/XlsxFileSample.tsx`, `xlsx-file.worker.ts`, `xlsx-file-protocol.ts` (신규) | UI, Worker 실행, 직렬화 가능한 요청/결과·job identity |
| `example/src/features/ExportFeature.tsx`, `featureRegistry.tsx`, `example/src/docs/dataTableOptionGuide.ts`, `docsRoutes.tsx`, `example/src/styles.css` | 기존 route에 한영 XLSX sample·설명 연결 |
| `test/fixtures/xlsx/` (신규) | Comins가 작성한 작은 OOXML/ZIP fixture builder 및 무해한 데이터; 큰 공격 fixture는 실행 중 생성 |
| `test/xlsx-data.test.ts`, `xlsx-zip.test.ts`, `xlsx-codec.test.ts`, `xlsx-package.test.ts`, `test/typecheck/xlsx-api.ts` (신규) | 순수 함수·한도·파일·공개 타입/경계 회귀 |
| `test/fixtures/xlsx-public-consumer/`, `test/xlsx-public-package-consumer.mjs` (신규) | 같은 tarball의 ES2022-only/Worker/브라우저와 간단한 Vue 소비자 |
| `test/playwright/specs/xlsx-file.spec.ts` (신규) | 파일 처리·취소·다운로드·규모 측정; 기존 export spec은 보존 |
| `docs/user/14-export.md`, `docs/ko/14-export.md`, 두 `27-migration-0.2.2.md`, `docs/feature-manifest.json`, `test/typecheck/docs/xlsx-import-export.ts` (신규), `CHANGELOG.md` | 실제 구현과 일치하는 public 문서/compile fixture/inventory |

내부 중립 계약은 `PreparedXlsxSheet { headers: readonly string[]; rows: readonly (readonly PreparedXlsxValue[])[] }`, `PreparedXlsxValue = CominsXlsxCellValue | { kind: "date"; utc: readonly [number, number, number, number, number, number, number] }`로 둔다. utc는 year, month(1부터), day, hour, minute, second, millisecond이다. engine 타입·DOM 타입은 이 계약에 넣지 않는다.

`VerifiedXlsxContainer`는 archive 검사를 완료한 entry map과 원본 길이/실제 해제 총량을 갖는 내부 객체다. entry를 외부에서 생성하는 공개 API는 제공하지 않는다. engine에 원본 untrusted ZIP을 다시 넘기지 않는다. 재패키징이 필요하면 검증된 entry를 STORE 방식으로 만들어 해제 검사를 우회하지 못하게 한다.

## Task 1: 엔진·제한 가능한 해제 경로 선행 검증

**Files:** ignored `.local/benchmarks/xlsx-implementation-probe/probe.mjs`, probe fixtures/consumer/evidence (신규). 이 단계에서는 저장소 package/lockfile/제품 source를 변경하지 않는다.
**Consumes:** 승인 spec의 한도/타입/날짜 계약, 기존 공식 xlsx 0.20.3 조사 artifact.
**Produces:** 정확한 xlsx 및 ZIP 도구 artifact/hash/설치·라이선스·취약점 결과, Node/브라우저 ESM 및 bounded-inflate 실증. 성공한 gate의 버전·import 방식·배포 의무를 고정한 evidence.

- [ ] **사실 확인:** xlsx artifact SHA-256 `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`와 source URL/0.20.3 metadata를 재대조한다. fflate는 upstream 0.8.3이 첫 후보이며 registry exact artifact의 실제 가용성/metadata/integrity를 확인한다. 후보 확인을 설치·안전성 통과로 간주하지 않는다.
- [ ] **라이선스/보안:** disposable consumer에 exact artifacts만 `--ignore-scripts`로 설치하고 license·NOTICE/ESM 포함물·known advisory를 확인한다. repo lockfile은 변경하지 않는다. registry audit이 URL 배포 버전을 제대로 다루지 못하면 그 한계를 기록하고 실제 버전/advisory를 검증한다. 불명확한 배포 의무·취약점은 그 gate를 닫기 전 채택하지 않는다.
- [ ] **실패 대조군:** full-unzip 후 검사만 하는 경로가 50 MiB 초과 fixture에서 초과 allocation 이후 실패함을 기록한다. 스트리밍 출력 누적 검사 버전은 제한 초과 chunk를 저장하지 않고 중단하는지 비교한다. header length 위조, 선택 밖 entry, cached empty-string 구분, 날짜 ID14/1904/serial60도 같은 artifact로 확인한다.
- [ ] **중립/패키징:** actual ESM import를 Node 및 Vite Worker에서 호출하여 byte decode/encode를 검증한다. 재구성 STORE ZIP로 engine을 읽는 경로, browser용 ZIP import의 Node built-in 미유입 및 no runtime CDN을 확인한다. 별도 ZIP 도구를 채택해야 하는 필요성과 exact version을 기록한다.
- [ ] **실행:** `node .local/benchmarks/xlsx-implementation-probe/probe.mjs`. 이 파일은 실행 단계에서 작성하고 ignored consumer의 exact artifacts를 사용한다. 결과는 gate별 pass/fail/not-run, 최대 실제 해제 bytes·원본/format 타입·XML 검사 결과·runtime 모듈 목록으로 기록한다. 측정 로그는 큰 ZIP 원문이나 사용자 데이터를 출력하지 않는다.
- [ ] **판정:** 모든 필수 gate 통과 후 Task 2로 진행한다. 실패하면 affected gate만 원인/대안으로 재검토하며 기능 scope·한도·기본 포함을 몰래 변경하지 않는다. 이 조사 기록만으로 공개 XLSX API를 shipped로 표시하지 않는다.

## Task 2: Core의 중립 타입·데이터 전이 구현

**Files:** 신규 `src/core/editing/xlsx-model.ts`, `xlsx-data.ts`, `test/xlsx-data.test.ts`, `test/typecheck/xlsx-api.ts`; 신규 source 책임을 `test/fixtures/core-boundary-map.json`에 추가.
**Consumes:** 설계의 `CominsXlsxCellValue`, `CominsXlsxImportRow`, Import/Export 옵션과 Task 1의 검증된 날짜 경계.
**Produces:** `prepareCominsXlsxExport<TData>(options: CominsXlsxExportOptions<TData>): PreparedXlsxSheet`, `normalizeCominsXlsxCell(cell: XlsxCellDescriptor): CominsXlsxCellValue`, `mapCominsXlsxImportRows<TData>(rows: readonly CominsXlsxImportRow[], mapRow: (row: CominsXlsxImportRow) => TData): TData[]` (모두 내부 중립 함수).

`XlsxCellDescriptor`는 kind(blank/text/number/boolean/date/error), scalar value, formula 여부/cachePresent, dateText를 명시한 판별 union이다. 날짜 formatter는 adapter가 dateText를 만들어 주며 Core에 SheetJS import를 넣지 않는다. Core의 owned 검증 오류는 내부 `XlsxDataError extends Error`에 code/좌표만 저장하고 Task 3에서 public CominsXlsxError로 변환한다. getter/mapRow의 사용자 예외를 이 변환 대상으로 추측하지 않는다.

같은 모델 파일에 `CominsXlsxInspectOptions { bytes; limits? }`, `CominsXlsxSheetInfo { name; visibility: "visible" | "hidden" | "veryHidden" }`, `CominsXlsxWorkbookInfo { sheets: readonly CominsXlsxSheetInfo[] }`, `CominsXlsxErrorCode`를 정의한다. code union은 spec §8의 INVALID_OPTIONS/UNSUPPORTED_FILE/INVALID_WORKBOOK/LIMIT_EXCEEDED/SHEET_SELECTION_REQUIRED/SHEET_NOT_FOUND/MERGED_CELLS/MISSING_FORMULA_RESULT/CELL_ERROR/UNSUPPORTED_VALUE를 그대로 사용한다.

- [ ] **RED 작성:** `preserves typed normal and cached formula values`, `distinguishes blank cells from empty text`, `keeps copied UTC dates immutable`, `rejects metadata from prepared options`, `retains legacy export projection semantics` 테스트를 작성한다. 0/false/빈 문자열·missing/error, dateText 예외, raw/formatted/order/header, unsupported values 및 getter callback 오류 전파를 단언한다.
신규 unit의 최소 핵심 단언은 아래와 같다. helper/descriptor는 이 Task의 Interfaces 계약을 사용한다.

```ts
it("preserves typed normal and cached formula values", () => {
  expect(normalizeCominsXlsxCell({ kind: "number", value: 0, formula: true, cachePresent: true })).toBe(0);
  expect(normalizeCominsXlsxCell({ kind: "boolean", value: false, formula: true, cachePresent: true })).toBe(false);
  expect(normalizeCominsXlsxCell({ kind: "text", value: "", formula: true, cachePresent: true })).toBe("");
});
```

- [ ] **RED 실행:** `npm run test:run -- test/xlsx-data.test.ts test/export-core.test.ts test/structured-export-core.test.ts`. 신규 함수 부재/새 계약 단언의 실패를 확인하며 기존 CSV/JSON 기대값은 유지한다.
- [ ] **타입 구현:** spec의 공개 타입과 내부 prepared/descriptor 타입을 정의한다. Import `headers`는 string[]|null, cells는 scalar|null, indices 의미를 고정한다. `metadata?: never`로 새 Export 타입을 강화하고 runtime에서도 metadata/구조 옵션을 검사한다. root/Core의 기존 공개 exports를 임의로 추가하지 않는다.
- [ ] **데이터 구현:** 기존 columnOrder/headerOverrides/getter 의미만 최소 재사용한다. Date를 원본 변경 없이 UTC tuple로 만들고 null/undefined Export를 blank로 정규화한다. 기본 maxCells 100,000과 XLSX 1,048,576행·16,384열 상한과 최초 구현의 문자열 32,767 UTF-16 code units 한도를 검증한다. 문자열 한도는 surrogate pair 경계도 검사하고 표시 glyph 수와 동일하다고 안내하지 않는다. 표준 형식 상한은 안전한 override로도 초과시키지 않는다.
- [ ] **GREEN:** 위 unit 및 `npm run lint` 통과. readonly 입력 freeze/원본 Date timestamp·이전 CSV/JSON output 불변, callback의 부분 부작용을 되돌렸다고 주장하지 않음을 확인한다.
- [ ] **기록/checkpoint:** 관련 파일만 기록하고 필요 시 한국어 subject `XLSX 중립 데이터 계약 추가`로 로컬 checkpoint한다. 기능 전체 완료로 표시하지 않는다.

## Task 3: ZIP·OOXML 입력 경계 구현

**Files:** 신규 `src/xlsx/zip.ts`, `workbook.ts`, `errors.ts`, `test/xlsx-zip.test.ts`, `test/fixtures/xlsx/build-fixtures.mjs`; 필요 runtime ZIP dependency의 package/lockfile 및 배포 notice.
**Consumes:** Task 1의 성공한 ZIP 경로/version/import 방법, Task 2의 중립 오류/한도/셀 descriptor.
**Produces:** `readBoundedXlsxContainer(bytes: Uint8Array | ArrayBuffer, limits: Required<CominsXlsxImportLimits>): Promise<VerifiedXlsxContainer>`, `inspectCominsXlsxContainer(container: VerifiedXlsxContainer): CominsXlsxWorkbookInfo`, 선택 시트의 관계/범위/formula cache metadata를 제공하는 내부 `readCominsXlsxSheetMetadata(container, sheetName): XlsxSheetMetadata`.

공개 오류는 `CominsXlsxError extends Error`로 code와 optional sheetName/cellAddress/rowNumber/sheetNames만 제공한다. engine 메시지/원본 값/stack을 custom message에 복사하지 않는다. schema/옵션 검증 오류도 이 오류 계약을 사용하고 application mapRow/getter의 자체 예외는 그대로 유지한다.

- [ ] **RED 작성:** `enforces actual inflation across unselected entries`, `reads only the supplied view and leaves source untouched`, `rejects malformed archive and relationships before mapping`, `accepts exact limits and rejects one byte over` 테스트를 작성한다. 압축 10 MiB/해제 50 MiB 정확한 경계, all-hidden workbook·없는/숨긴 시트 지정·과장 range, 선언값 위조·CRC·중복/비정상 entry path·암호화/macro/HTML 위장·DTD/external entity·누락 관계·잘못된 XML 및 전체 inflate 검사 후 mapRow 0회를 단언한다.
- [ ] **RED 실행:** `npm run test:run -- test/xlsx-zip.test.ts`. 판정은 valid fixture도 통과할 수 있는 gate여야 하며 단순히 모든 파일을 거절하여 통과시키지 않는다.
- [ ] **ZIP 구현:** Task 1의 streaming 경로로 모든 entry의 실제 출력량을 누적한다. 초과 chunk는 보관하지 않고 추가 처리를 중단한다. 부정확한 header 길이/압축률도 신뢰하지 않는다. CRC·실제 길이·central/local entry 일치와 unsafe 경로를 검사하고 검증된 entry만 다음 단계에 전달한다. 원본 ZIP을 engine에 재전달하는 우회는 금지한다.
- [ ] **OOXML 구현:** 허용 workbook 콘텐츠/relationship/시트 visibility·정확한 sheetName·선택 시트 범위·merges·명시/공유/배열 formula 영역과 cache 존재를 검사한다. 외부 링크는 요청하지 않으며 정상 cached external formula를 링크 존재만으로 거절하지 않는다. 실제 null/빈 문자열 cache 구분을 metadata에 남긴다.
- [ ] **GREEN:** 위 unit, `npm run lint`, `npm run test:security`, dependency/배포 변화에 해당하는 `npm run check:licenses` 통과. 최신값/압축예산을 JS heap 절대 상한으로 과장하지 않는다. 새 보안 경계는 최종 diff scan 범위에 포함한다.
- [ ] **기록/checkpoint:** source/확정 ZIP dependency·한도 evidence를 기록하고 관련 파일만 한국어 subject `XLSX 입력 컨테이너와 해제 한도 검증 추가`로 checkpoint한다.

## Task 4: public XLSX codec·진입점 구현

**Files:** 신규 `src/xlsx/engine.ts`, `src/xlsx.ts`, `test/xlsx-codec.test.ts`, `test/xlsx-package.test.ts`; `package.json`, `package-lock.json`, `vite.config.ts`; 필요 포함 notice/license; `docs/feature-manifest.json`과 최소 한영 API 설명을 실제 구현에 맞춰 함께 갱신.
**Consumes:** Task 2 중립 함수/타입, Task 3 VerifiedXlsxContainer/metadata/error, Task 1 exact xlsx artifact 및 성공한 ESM 방법.
**Produces:** `/xlsx`의 `importCominsRowsFromXlsx<TData>(options): Promise<TData[]>`, `exportCominsRowsToXlsx<TData>(options): Promise<Uint8Array>`, `inspectCominsXlsx({ bytes, limits? }): Promise<CominsXlsxWorkbookInfo>` 및 자체 타입/CominsXlsxError.

- [ ] **RED 작성:** `preserves falsey formula caches and rejects missing shared results`, `imports formatted dates without local timezone conversion`, `writes literal formula text and typed cells`, `requires an exact visible sheet selection`, `maps only after complete validation`, `keeps xlsx engines out of existing entrypoints`를 작성한다. 오류 뒤 partial array/mapRow 호출, nonzero-offset bytes, 원본 rows/Date 변화도 검사한다.
- [ ] **RED 실행:** `npm run test:run -- test/xlsx-codec.test.ts test/xlsx-package.test.ts test/xlsx-data.test.ts test/xlsx-zip.test.ts`와 `npm run lint`. runtime/API 부재와 타입 부재가 실제 실패 원인인지 구분한다.
- [ ] **adapter 구현:** 전용 engine.ts에서만 SheetJS를 import한다. errors→formula cache→date→scalar 순서로 descriptor를 만들고 날짜 ID14/1900/1904/serial60·시간/numeric General·ISO text를 구분한다. shared/array 비-anchor 및 외부 참조 결과도 원래 타입을 보존한다. 유효한 cached ""를 누락으로 바꾸지 않는다.
- [ ] **API/파일 구현:** inspect에도 압축 전후 한도를 적용한다. 선택 시트 A1부터 마지막 실제 값/수식까지 null padding, header string 변환·중복 보존·blank/header-only []·hidden row/column 포함을 구현한다. mapRow는 전체 검증 후 호출한다. encode는 prepared tuple과 typed cells를 사용하고 text 값에 f 속성을 만들지 않는다. 잘못된 sheetName/metadata/unsupported 값은 자동 수정하지 않는다.
- [ ] **패키지/타입:** xlsx는 검증한 공식 URL exact artifact와 lockfile integrity로 고정한다. `/xlsx`의 JS/type entry만 추가하고 engine/ZIP dependency는 기존 root/Core graph 밖에 둔다. 공개 타입에는 Date(Export getter 결과) 외 DOM/File/Blob/React/Vue/engine 객체를 노출하지 않는다. `test/typecheck/xlsx-api.ts`는 잘못된 input/ref/metadata/Tree 옵션의 @ts-expect-error와 ES2022-only 소비자 타입을 검사한다.
- [ ] **독립 GREEN:** writer와 다른 ZIP/XML 검사에서 셀 t/v/f·header·Date UTC format·text 수식 부재를 단언한다. reader fixture는 엔진 writer가 만든 정상 파일만 쓰지 않고 손으로 정의한 OOXML cache 없음/blank/shared/array/error 파일을 사용한다. 같은 엔진 왕복 단독 통과는 불충분하다. unit/lint/build/`npm run verify:core-package`와 기존 API/경계 negative controls를 통과시킨다.
- [ ] **기록/checkpoint:** additive inventory와 동작하는 API를 함께 기록한다. 기존 public baseline 기대값을 덮어쓰거나 경계 검사를 완화하지 않는다. 한국어 subject `XLSX Import Export 진입점 구현`으로 관련 파일 checkpoint한다.

## Task 5: Worker 기반 Playground 및 실제 파일 회귀

**Files:** 신규 sample/worker/protocol과 `test/playwright/specs/xlsx-file.spec.ts`, 무해한 작은 `example/public/fixtures/xlsx-import-sample.xlsx` 및 그 재현 source를 `test/fixtures/xlsx/`에 둔다. 기존 ExportFeature/한영 registry/option guide/routes/style 수정. 기존 CsvFileSample과 structured sample 구현은 변경하지 않는다.
**Consumes:** Task 4 public API. Worker Import는 `mapRow: row => row`로 중립 payload를 얻고 main application이 검증·매핑한다. Export는 main이 getter를 적용해 만든 scalar 행을 전달하고 Worker 내부의 고정 getter로 encode한다.
**Produces:** 기존 `/examples/export` route의 독립 `[data-feature-option="xlsx-files"]` card; typed 결과·시트 선택·오류·취소·download 및 bounded preview. protocol은 `{ jobId: number; kind: "inspect" | "import" | "export"; payload }` request와 동일 jobId/kind를 가진 result/error union이며 Function/File/ReactNode를 전달하지 않는다.

- [ ] **RED 작성:** download→Import의 숫자/boolean/ID/날짜 확인, 여러 visible sheet 선택, cached formula fixture·cache 없음·merges/limit 실패, 같은 파일 재선택, `ignores superseded results and cleans worker resources`, 10,000행 미리보기 DOM 한도를 Playwright에 작성한다. page console/error와 workererror를 수집한다. preview는 `xlsx-file-preview`, 현재 전체 행 데이터의 테스트 상태는 `xlsx-file-model` testid를 사용한다.
- [ ] **RED 실행:** `npm run test:e2e -- test/playwright/specs/xlsx-file.spec.ts --workers=1`. sample 부재 또는 새 동작 단언 FAIL을 기록한다. 기존 export/CSV/Tree·Group 단언을 새 card 수에 맞춰 삭제하지 않는다.
- [ ] **sample 구현:** id/name/score/active/date를 사용하여 원래 타입을 화면과 상태 출력에서 확인할 수 있게 한다. 고유 string ID·비어 있지 않은 name·유한 number score·boolean active·string/null date를 application mapper가 검사한다. 모든 행 성공 뒤에만 data 교체/selection 초기화한다. empty/header-only는 library []를 유지하고 sample은 '데이터 없음'으로 실패시켜 기존 data를 보존한다.
- [ ] **Worker/lifecycle:** `new Worker(new URL('./xlsx-file.worker.ts', import.meta.url), { type: 'module' })`를 호출 시 생성한다. job 종료·취소·파일 교체·unmount에서 worker를 종료하고 pending job 상태를 해제한다. 선택 파일 원본과 jobId를 대조하고 늦은 결과/다운로드를 무시한다. File.size를 bytes allocation 전에 검사하고 object URL을 해제한다. worker 생성 실패 시 위험한 main-thread 전체 파싱으로 자동 fallback하지 않는다.
- [ ] **preview/fixture:** 상태는 전체 행 수를 표시하되 table preview는 최대 100행, text preview는 만들지 않고 header/셀 타입만 보여준다. cached formula 예제는 Comins가 작성한 작은 OOXML fixture로 만들며 본 public Export helper에 수식 생성 옵션을 넣지 않는다. 명명된 타사 비교나 실제 사용자 데이터를 예제/fixture에 넣지 않는다.
- [ ] **GREEN/측정:** 위 spec과 `test/playwright/specs/export-helper.spec.ts`를 통과시키고 10,000행 이하/100,000셀 workload의 parse·map·download·cancel 시간과 DOM/Worker 수를 관측값으로 기록한다. 규모 측정은 `@perf`로 분리하여 focused 실행하고 SLA로 선언하지 않는다. timeout/error는 성공으로 취급하지 않는다.
- [ ] **기록/checkpoint:** 한영 UI 설명·lifecycle 결과·미실행을 기록하고 한국어 subject `XLSX 파일 Playground와 Worker 처리 추가`로 관련 파일 checkpoint한다.

## Task 6: public 문서·동일 패키지 소비자 계약

**Files:** 파일 표의 한영 docs/migration/compile fixture/manifest/CHANGELOG; 신규 xlsx-public-consumer runner/fixtures; 기존 `test/public-package-consumer.mjs` 또는 기존 소비자 fixture는 필요한 연결만 수정.
**Consumes:** 구현된 Task 4 API/entrypoint와 Task 5 sample. **Produces:** 0.2.2 도입 예정의 실제 지원 설명 및 동일 tarball ES2022/Node/브라우저·Worker/React18·19/Vue 단순 소비자 결과.

- [ ] **문서:** 같은 계약의 기본 포함/별도 import, 원래 타입/수식 캐시/날짜 예외·UTC Date Export, 기본/상향 한도·메모리 한계, visible sheet/merges/blank/header/unsupported 값, application atomic mapping, Worker 취소/미리보기 및 CSV와 차이를 한영으로 작성한다. 짧은 README 링크와 GIF를 유지하며 미발행 API를 0.2.1 shipped로 안내하지 않는다.
- [ ] **타입 fixture:** 자립된 docs example에서 typed `mapRow`와 inspect/Import/Export/Error를 사용한다. engine Workbook/File/Blob를 공개 API에 넣을 수 없는 대조군, generic TData 추론, metadata 변수의 runtime 오류도 검증한다.
- [ ] **소비자 runner:** 신규 `node test/xlsx-public-package-consumer.mjs <trusted-local.tgz>`를 작성한다. artifact hash를 고정하고 disposable 소비자만 설치한다. Node ES2022-only strict 타입·runtime, Vite browser/Worker, 간단한 Vue 앱에서 XLSX 데이터 변환을 확인한다. Vue Table 어댑터 또는 React-free 일반 npm 설치 지원이라고 보고하지 않는다.
- [ ] **대조군:** xlsx.d.ts 제거→타입 실패, xlsx.js 또는 exact engine 제거→해당 Import/Export 실패, root/Core 소비자의 xlsx/ZIP module 유입→경계 실패를 단언한 뒤 복원한다. clipboard.d.ts/CSS의 기존 제거·복원 검증도 유지한다. React는 DOM 초기화 후 import하여 uncaught 오류 0건을 검사한다.
- [ ] **동일 artifact:** `npm run build` 뒤 ignored artifact 디렉터리를 만들고 `npm pack --offline --ignore-scripts --json --pack-destination .local/xlsx-implementation/artifacts`를 실행한다. 실제 생성 경로/hash를 사용하며 version 0.2.1이면 미발행 후보임을 기록한다. 같은 artifact를 기존 `node test/public-package-consumer.mjs <tarball>`와 신규 runner 양쪽에 사용한다.
- [ ] **GREEN/checkpoint:** `npm run test:run -- test/user-docs.test.ts`, docs compile/lint, 두 같은 artifact 소비자 및 licenses/notice/artifact contents 검사 통과. package/lockfile/source가 바뀌면 해당 artifact를 다시 만들고 영향받는 소비자 결과를 갱신한다. 한국어 subject `XLSX 문서와 패키지 소비자 검증 추가`로 관련 파일 checkpoint한다.

## Task 7: 최종 통합 검증·리뷰·Astra 실제 조작

**Files:** 구현 전체 diff, `reports/2026-10-12.md` (실행일이 달라지면 그 날짜 report), ignored `.local/xlsx-implementation/` evidence. **Consumes:** Task 1～6의 source/dependency/fixture/동일 artifact.

- [ ] **전체 gate:** 마지막 의미 있는 source/package/test 변경 후 `npm run verify`, `npm run test:e2e -- --workers=1`을 실행한다. 신규 library/type/build 및 공용 export route 영향 때문에 focused만으로 완료하지 않는다. failed job은 제품/테스트 계약/환경으로 분류하며 성공한 무관 gate를 반복하지 않는다.
- [ ] **focused 성능:** `npm run test:perf -- test/playwright/specs/xlsx-file.spec.ts --workers=1`로 Task 5의 새 규모/취소 fixture를 확인한다. 가상화/scroll/memory-counter 자체를 의미 있게 바꾸었을 때만 관련 focused 후 전체 `npm run test:perf -- --workers=1`을 실행한다.
- [ ] **리뷰:** 한 번의 최종 diff 리뷰에서 API/날짜/캐시 유무/실제 inflate 한도/engine 공급망/노출·동일 artifact/Worker 정리를 확인한다. untrusted ZIP/XML이라는 새 보안 경계는 해당 Security diff route로 검토하고 저장소 전체/Deep scan으로 범위를 늘리지 않는다. 발견된 결함은 focused RED→minimal fix→GREEN 뒤 영향받는 final evidence를 갱신한다.
- [ ] **Astra Computer Use:** 위 자동화 gate 뒤 Astra가 후보 URL의 XLSX sample을 직접 조작한다. sample 다운로드→Import·숫자/boolean/수식/date 표시·시트 선택·오류 후 기존 data·취소/재시도·키보드/좁은 화면을 확인한다. 모델/URL/시각/trace/실행 및 미실행을 코드·Playwright 증거와 분리한다. unavailable/미조작을 자동 통과로 간주하지 않는다.
- [ ] **완료 기록:** 마지막 source revision/미커밋 diff, dependency versions 및 supplier artifact hash, 최종 Comins tarball hash, command/exit/result, 실제 UI 증거·미실행·잔여 리스크를 기록한다. 기본 예산/ZIP 제한은 입력 예산이며 heap hard cap은 아님을 유지한다. 같은 source/artifact에서 필요한 증거가 모두 충족됐을 때만 XLSX 기능 구현 완료로 처리한다.
- [ ] **로컬 마무리:** 승인 범위의 변경만 checkpoint하고 worktree 상태·원본 checkout 보존을 확인한다. 홈페이지 동기화/0.2.2 version bump/원격 PR/릴리스/배포/publish/cleanup은 이 계획으로 자동 수행하지 않는다.

## 실행 순서·판정 및 현재 상태

Task 1 → 2 → 3 → 4 → 5 → 6 → 7. 별도 공개 Worker API를 늘리거나 Core에 엔진을 연결하는 빠른 우회는 허용하지 않는다. Task 1의 제한 가능성·후보 안전성 실패는 해당 채택/변환 경로만 중단하고 원인을 보고한다. 이미 승인된 타입·수식·날짜·시트·한도를 반복 질문하지 않으며 새 근거가 계약을 바꾸어야 할 때만 그 결정으로 돌아간다.

계획 자체 검토: 설계 §1～2는 Global Constraints/Task 2, §3～4는 Task 2/4/5/6, §5는 Task 2/3/4, §6은 Task 2/4, §7～8은 Task 1/3/5, §9는 Task 6/7에 배정했다. Review Focus의 5조건을 각각 소유 테스트에 배정했고 내부/공개 함수 이름과 payload 의미를 대조했다.

사용자가 현재 세션 직접 구현과 최종 독립 리뷰를 선택하여 Task 1~6의 구현·검증을 수행했다. 최초 계획의 단계별 checkpoint는 마지막 관련 변경을 묶는 하나의 로컬 commit으로 통합한다. 기존 지침 변경과 원본 Vue checkout의 미커밋 문서는 보존한다. Task 7의 실제 UI 및 최종 commit 상태는 아래 후속 기록을 따른다.

## 조사 근거

- [fflate 공식 streaming ZIP 문서](https://github.com/101arrowz/fflate#usage): 스트리밍 entry output을 받는 경로가 후보의 근거다. 그 API 존재만으로 이 계획의 50 MiB 중단을 입증하지 않는다.
- [fflate upstream package metadata](https://github.com/101arrowz/fflate/blob/master/package.json): 조회 시 0.8.3/MIT/browser entry. registry exact artifact와 실제 타입/동작은 Task 1에서 확인한다.
- [Microsoft Excel 사양/상한](https://support.microsoft.com/en-us/excel/excel-specifications-and-limits): 형식의 행·열·문자 수 상한 근거.
- SheetJS의 정확한 supplier artifact 및 현재 조사 상태는 승인 spec §7을 따른다.

## 실행 기록 — 2026-10-12 KST

- Task 1~4: 완료. 공식 SheetJS 0.20.3, zip.js 2.23.0, saxes 6.0.0을 채택하고 공급망·라이선스·압축 예산·공개 /xlsx·중립 Core/엔진 격리 검증을 통과했다. 임의 ZIP/CRC 파서는 작성하지 않았다.
- Task 5~6: 완료. 실제 Worker 파일 처리·취소/교체/unmount·한영 문서·같은 tarball의 Node/ES2022/browser Worker/Vue3 데이터 API/React18·19 소비자 및 누락 대조군이 통과했다. Vue Table UI 구현을 뜻하지 않는다.
- Task 7: 기능/보안 독립 리뷰의 발견 사항을 수정했다. 수정 후 verify는 단위 737(68파일), 보안 21, 라이선스 27, Core checker 43, 타입·빌드·모든 경계 통과. 전체 E2E 251, focused XLSX 10000행 1건 통과. 보안 scan은 수정 전 immutable diff이고 수정 검증은 별도 artifact로 보존한다.
- 최종 library tarball SHA-256: 61bd843747c722d06297ec01e15b07e4ecdc80f009de4824467a0bf02e3c8842. 이름 comins-table-0.2.1.tgz는 미발행 0.2.2 후보다.
- 추가 요청: CSV·Excel에 1000행 선택을 추가하고 기존 XLSX 10000행 경로 및 신규 CSV 10000행 경로를 제공한다. 표/CSV 텍스트 미리보기는 100행, 전체 데이터는 파일/Import에 보존한다. 추가 Playwright RED 2건을 확인한 뒤 15건 focused GREEN. 추가 성능 3건, 최종 전체 verify 737건 및 전체 E2E 253건이 통과했다. 독립 대용량 리뷰에서 추가 결함 없음. Astra는 기본 native roundtrip·대용량 크기/preview·키보드를 직접 확인했고 추가 Import 등은 도구/사용자 foreground 제한으로 미실행이다. 로컬 commit 및 실행/미실행의 상세 근거는 최종 리포트와 완료 보고를 따른다.

Task 7 로컬 구현·자동 검증·독립 리뷰는 완료했다. Astra 미실행 영역을 통과로 간주하지 않고 리포트에 보존했다. 승인된 전체 변경을 하나의 로컬 checkpoint로 전달하며 원격 반영/발행은 수행하지 않는다.

## Approved implementation revision: Export styles and parser replacement

The subsequent maintainer-approved implementation replaces the XML adapter with `@federicocarboni/saxe` 0.8.0 and Export encoding with `write-excel-file` 4.1.1. ZIP validation remains `@zip.js/zip.js`; SheetJS CE 0.20.3 remains the Import/date-format engine. This revision supersedes the earlier parser/Export-engine selection. Dependencies stay external to Comins library chunks and load only through `/xlsx`.

The owned `CominsXlsxExportStyles` API offers a default Comins theme, a plain preset, global header/body styles and per-column overrides by column ID. It exposes no vendor feature hooks or arbitrary XML. A private writer transform preserves literal text including empty strings, prototype-named strings and OOXML escape sequences; numeric/boolean/null and UTC Date semantics remain unchanged. Import limits, namespace validation, cached formula values, callback ownership and unsupported Tree/Group reconstruction remain the existing contract.

Validation covers type/encoding preservation, invalid styles, namespace/DTD/depth limits, bilingual docs, custom-style Worker download/re-import, 1000/10000-row workloads and the same packed artifact in Node, Vue byte consumers and a production module Worker. License evidence and third-party research are retained only under ignored `.local/benchmarks/`; required distribution notices remain in THIRD_PARTY_NOTICES.md.

## Playground display revision — 2026-10-13

The maintainer subsequently requested removing the 100-row display cutoff. This supersedes that Playground-only provision: CSV/XLSX samples start with 1000 rows, accept 1000/10000-row presets, pass all rows to the table and use virtual scrolling to reach the final row. CSV text output contains all rows. Import byte/cell budgets and library byte APIs remain the previously approved contract.
