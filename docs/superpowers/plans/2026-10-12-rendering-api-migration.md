# 0.2.2 Rendering API Migration Implementation Plan

> 실행 시 `superpowers:executing-plans`로 아래 작업을 순차 수행한다. 계획 검토 후 승인에 따라 A/B/C 및 관련 E를 구현했다. 실행 결과는 reports/2026-10-12.md를 참고한다. D와 릴리스 작업은 후속 범위다. 프로젝트 Contract의 범위·권한·검증 규칙이 일반 스킬 절차보다 우선한다.

**Goal:** 승인된 `.render` 대응표를 기존 0.x 사용 코드와 함께 동작하도록 구현하고, Summary 렌더링 및 셀 커스텀 툴팁을 제공한다.

**Architecture:** 공개 설정과 호환 처리는 React 어댑터에 둔다. 호출 경로 선택과 콘텐츠 결과 판정을 구분하고 기존 렌더링 지점에 연결한다. Core 데이터/상태 경계와 프레임워크별 생명주기를 유지하며 `src/index.tsx` 전체를 재구성하지 않는다.

**Tech Stack:** TypeScript strict, React 18/19, Vite, Vitest/jsdom, Playwright. 신규 의존성·패키지 진입점·Core 렌더 타입을 추가하지 않는다.

**Spec:** [승인된 렌더링 API 대응표](../specs/2026-10-12-rendering-api-migration-design.md).

검토일: 2026-10-12 KST. 확인한 checkout: `codex-0.3.0-vue3`, HEAD `f0f4265`. 이 문서는 해당 소스에 근거한 실행 계획이며 실제 구현/브라우저 통과 기록이 아니다.

## Global Constraints

- 사용자 정의 UI의 최종 진입점은 `render`. 기존 API와 인자는 0.x 유지, 1.0.0 제거 대상 안내. 0.3.0에서 제거하지 않는다.
- 새 콜백 우선, 새 콜백 미지정 시 기존 경로. 새 반환값 `undefined`는 기본 콘텐츠, `null`/`false`/빈 문자열은 빈 콘텐츠. 기존 반환값 처리에는 소급 적용하지 않는다.
- 기존 `format`, `aggregate`, `label`, `components`, 클래스·스타일, 외부 `td`/`tr`/`th` 소유권을 보존한다.
- 새 콜백에서 deprecated 콜백으로 되돌아가지 않는다. 콜백 오류를 삼키거나 컴포넌트 타입으로 추측하지 않는다.
- 문자열/기존 콜백 툴팁은 기존 title 동작 유지. 새 툴팁은 정보 표시용이며 대화형 팝오버를 추가하지 않는다.
- application-owned data/callback 흐름과 `.`, `/core`, `/clipboard`, `/selection`, `/styles.css` 공개 경계를 유지한다.
- 파일 입출력 엔진, Vue UI 구현, 릴리스/배포는 이 계획의 실행 범위가 아니다.

## 범위와 작업 분리

렌더링 전환은 A(기존 API 호환), B(Summary), C(셀 툴팁)로 나누고 각각 동작·문서·검증이 가능한 단위로 구현한다. 신규 값 목록 필터는 독립 기능이므로 D의 연결 요구사항을 별도 필터 설계/계획에 넘긴다. 대응표의 필터 경로를 삭제하거나 0.2.2 범위에서 제외하는 것이 아니다.

현재 Vue 전용 브랜치에 기능 구현을 섞지 않는다. 실행 시작 시 실제 main 및 첨부 worktree 상태를 확인하고 0.2.2용 격리 작업 공간을 사용한다. 기존 변경 문서와 Vue 소비자 커밋은 보존하며, 필요한 설계 문서만 0.2.2 작업에 반영한다. 계획 검토 단계에서는 checkout 변경·커밋·원격 쓰기를 수행하지 않았다. 구현은 별도 앱 관리 worktree의 `codex/render-api-0.2.2`에서 수행한다.

## Review Focus

1. 같은 콜백 참조를 기존/신규 속성에 사용하거나 이동 중 callback을 교체하는 경우: 헤더 캐시가 반환 규칙을 혼동하지 않아야 한다. A에서 검증.
2. 새 Summary render가 첫 셀에서 null을 반환하는 경우: 기존 `?? summary.label`이 숨김을 되돌리지 않아야 한다. B에서 검증.
3. 새 설정 객체가 rerender 중 바뀌는 경우: 그룹 config 재구성과 memo 의존성이 새 콜백을 빠뜨리지 않아야 한다. A에서 검증.
4. 잘못된 JavaScript 입력 또는 props spread: Tree/Viewport에서 새 rowDetail이 기존 제한을 우회하지 않아야 한다. A에서 타입 및 런타임 검증.
5. 가상화로 DOM을 재사용하거나 화면에서 셀을 제거하는 경우: 툴팁이 다른 행의 내용/ARIA 연결을 유지하지 않아야 한다. C에서 검증.

## 소스 확인에서 발견한 구현 주의점

| 현재 위치 | 확인한 동작 | 계획상 대응 |
| --- | --- | --- |
| `src/index.tsx` 헤더 렌더링 | renderer 함수 참조로 이동 중 콘텐츠 캐시, renderer 존재 여부로 내장 슬롯 표시 결정 | 선택된 경로 종류와 원래 함수 참조를 캐시에 포함. 새 undefined 기본 표시와 기존 undefined 빈 표시 구분 |
| `src/index.tsx` normalizedGrouping memo | 기존 getGroupLabel만 골라 config 재구성 | 새 label.render 전달과 의존성 갱신을 함께 반영 |
| `src/index.tsx` summaryCells | 첫 셀의 nullish 값을 summary.label로 대체 | 새 render 적용 여부를 결과와 별도로 전달하여 명시적 빈 콘텐츠 보존 |
| `src/index.tsx` Tree/Viewport wrapper | renderRowDetail을 타입/런타임에서 차단 | rowDetail도 같은 위치에서 차단 |
| `src/react/model.ts` projectReactColumn | filter를 spread하여 Core로 전달 | 필터 UI 추가 전 데이터 속성 allowlist로 투영. 현재 UI 유출이 확인됐다는 의미는 아님 |
| `src/tooltip.tsx` | 이동 거부 안내가 role=status/aria-live와 포인터 좌표 사용 | 셀 툴팁 컨트롤러 분리, 시각 요소만 필요 범위에서 재사용 |
| `test/public-package-consumer.mjs` | 0.2.0 가이드만 읽어 예제를 컴파일 | 0.2.2 가이드를 명시적으로 추가해 실제 배포 선언 타입으로 검증 |

## A. 기존 렌더 API의 호환 전환

**Files:** 수정 `src/react-types.ts`, `src/index.tsx`, `src/grouping.ts`, `src/react/table-transfer.ts`. 테스트 추가 `test/render-api-compat.test.tsx`, `test/typecheck/render-api-compat.tsx`; 기존 `test/component-renderer-api.test.tsx`, `test/tree-slots.test.tsx`, `test/grouping.test.ts`, `test/typecheck/row-expand-api.tsx`, `test/typecheck/viewport-auto-height-api.tsx` 보강.

**Interfaces:**

- `cell.render?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode`
- `header.render?: (params: CominsHeaderComponentPayload<TData, TValue>) => React.ReactNode`
- `rowDetail?: { render?: (params: CominsRowDetailParams<TData>) => React.ReactNode }`
- `rowGrouping.content?: { render?: (params: CominsRowGroupRenderParams<TData, TGroup>) => React.ReactNode }`
- `rowGrouping.label?: { render?: (group: TGroup) => React.ReactNode }`
- Tree 각 슬롯: 기존 콜백 타입 또는 `{ render?: (params: CominsTreeSlotParams<TData>) => React.ReactNode }`
- `rejectionFeedback.tooltip?: { render?: (rejection: CominsTableTransferRejection<TData, TGroup>) => React.ReactNode }`
- `loadingContent`/`emptyContent`: `{ render?: () => React.ReactNode }`. `rowDetail` 외의 기존 상세 행 속성은 이동하지 않는다.

- [x] **A1 — RED:** 영역별 기존/신규/동시 지정 테스트를 작성한다. 새 callback 존재 시 기존 spy 호출 0회, 새 undefined 반환 시 기본 콘텐츠, null/false/빈 문자열은 비움, 0은 표시됨을 확인한다. 기존 callback의 undefined/null 처리와 정적 loading/empty의 nullish 대체 동작을 별도 고정한다.
- [x] **A2 — RED 실행:** `npm run lint`와 `npm run test:run -- test/render-api-compat.test.tsx`에서 신규 속성/동작 부재로 실패함을 확인한다. 타입 테스트에는 TData/TGroup/TValue 추론, Tree/Viewport의 rowDetail 금지 사례를 포함한다.
- [x] **A3 — 최소 구현:** 위 타입과 소비 지점에 표준 경로를 연결한다. 경로를 먼저 선택한 후 콘텐츠를 평가한다. legacy는 기존 조건을 유지하고 새 경로만 `result === undefined`로 기본값을 선택한다. 전역 `newResult ?? legacyResult` 방식은 사용하지 않는다. format의 기존 평가 흐름은 유지하며 렌더 콜백을 선택 과정에서 중복 실행하지 않는다.
- [x] **A4 — 캐시/제약 회귀:** 헤더 캐시에 `kind: "render" | "legacy"`와 원래 callback 참조를 저장한다. 렌더 중 새 wrapper 함수로 cache key를 바꾸지 않는다. 그룹 라벨 전달/memo 의존성, Tree 함수/객체 혼용, `defaultContent`, 상세 행 enabled 판정·측정 경로·Tree/Viewport runtime 차단을 확인한다. 동일 callback을 legacy→new로 이동하는 테스트와 group label rerender 테스트를 추가한다.
- [x] **A5 — GREEN:** `npm run lint` 및 `npm run test:run -- test/render-api-compat.test.tsx test/component-renderer-api.test.tsx test/tree-slots.test.tsx test/grouping.test.ts test/row-height.test.tsx` 통과를 확인한다. 공개 타입 JSDoc에는 대체 경로와 1.0.0 제거 대상을 명시한다. 문서/Playground 전환은 E의 해당 영역 변경을 이 단위에 포함한다.

## B. Summary의 aggregate → format → render

**Files:** 수정 `src/summary.ts`, `src/index.tsx`, `test/summary-core.test.ts`; A의 신규 API 타입/런타임 테스트에 Summary 사례 추가. 브라우저 테스트 `test/playwright/specs/summary-row.spec.ts` 보강.

**Interfaces:** 공개 `CominsSummaryRenderPayload<TData> = CominsSummaryFormatPayload<TData> & { formattedValue: React.ReactNode }`, 객체형 Summary 설정에 `render?: (params: CominsSummaryRenderPayload<TData>) => React.ReactNode` 추가. 루트 타입 export 및 manifest를 함께 갱신한다.

내부 `resolveCominsSummaryValues<TData>(rows, columns, summary)`는 기존 공개 `getCominsSummaryValues`와 같은 입력 타입을 받고 `{ values: Record<string, React.ReactNode>; renderedColumnIds: ReadonlySet<string> }`를 반환한다. `renderedColumnIds`에는 새 render callback이 존재하여 사용된 열만 담는다. 내부 resolver는 루트/Core에 export하지 않는다.

현재 `src/index.tsx`는 `export * from "./summary"`를 사용한다. 내부 resolver를 같은 모듈에 추가할 때 이 구문을 명시적 export로 바꾼다. 기존 `getCominsSummaryValues`, `CominsSummaryBuiltin`, `CominsSummaryAggregator`, `CominsSummaryFormatPayload`, `CominsSummaryColumnConfig`, `CominsSummaryColumn`, `CominsTableSummaryConfig`를 모두 유지하고 `CominsSummaryRenderPayload`만 공개 추가한다. `test/public-api-boundary.test.ts`에 내부 resolver의 루트 export 부재를 확인하는 사례를 넣는다.

- [x] **B1 — RED:** 원본 집계값/value, formattedValue, 최종 콘텐츠를 구분하여 확인한다. 첫 열 render=null이 summary.label로 대체되지 않는 테스트, render=undefined가 formattedValue로 돌아가는 테스트, 기존 format=null의 label 대체 유지 테스트를 추가한다. 집계/format/render 각 단계가 한 평가에서 중복 호출되지 않는지도 확인한다.
- [x] **B2 — RED 실행:** `npm run test:run -- test/summary-core.test.ts test/render-api-compat.test.tsx`로 새 순서와 null 보존 실패를 확인한다.
- [x] **B3 — 최소 구현:** resolver가 기존 집계·format을 실행한 후 새 render만 적용한다. 공개 getCominsSummaryValues는 resolver.values를 반환하여 기존 입력의 결과를 유지하고 새 설정은 최종 표시값을 반환한다. Table은 동일 resolver 결과를 한 번 사용한다. 새 render를 사용한 열은 nullish label 대체를 하지 않는다. 기존 집계 대상(필터 적용 행, Tree summaryRows)과 colSpan·pinned geometry는 변경하지 않는다.
- [x] **B4 — GREEN:** 위 테스트와 `npm run lint`를 통과시킨다. colSpan·숨긴 열·Tree/Group summary의 기존 브라우저 사례 및 첫 셀 숨김 사례를 `npm run test:e2e -- test/playwright/specs/summary-row.spec.ts --workers=1`로 검증한다. E의 Summary 가이드를 함께 갱신한다.

## C. 커스텀 콘텐츠 셀 툴팁

**Files:** 신규 `src/react/cell-tooltip.tsx`, `test/cell-tooltip.test.tsx`, `test/playwright/specs/cell-tooltip.spec.ts`. 수정 `src/react-types.ts`, `src/index.tsx`, `styles.css`, `example/src/features/BodyFeature.tsx`. `src/tooltip.tsx`는 시각 요소 공유가 필요한 경우에만 최소 수정.

**Interfaces:** `cell.tooltip`에 `{ render?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode }` union 추가. 기존 문자열/콜백 타입은 유지한다. React 내부 컨트롤러가 Table당 열린 툴팁 하나와 `{ rowId, columnId, anchor }`를 소유하며, 표시 콘텐츠는 현재 행·열 payload로 평가한다. 셀마다 portal/root/전역 listener를 만들지 않는다.

- [x] **C1 — RED:** 기존 string/callback 문자열은 title, 기존 callback ReactNode는 미표시, 새 객체는 role=tooltip·aria-describedby 연결과 title 없음으로 구분한다. undefined/null/false/빈 문자열 반환 시 빈 tooltip shell/ARIA 연결을 만들지 않는다. 숫자 0은 표시한다. 기존 title 기반 속성 조합도 중복되지 않는지 확인한다.
- [x] **C2 — RED 실행:** `npm run test:run -- test/cell-tooltip.test.tsx`에서 새 툴팁 부재로 실패함을 확인한다.
- [x] **C3 — 최소 구현:** hover/focus의 실제 anchor와 활성 cell을 추적하고 Escape로 닫는다. focus/hover 둘 중 하나가 유지되는 동안 표시하며, 툴팁 표면으로 포인터를 옮겨 내용을 읽을 수 있게 한다. 내부 focusable UI와 Tab 진입은 지원하지 않는다. Escape 후 같은 대상에 즉시 재표시하지 않고 이탈/재진입 시 다시 연다. 기존 셀 이벤트/사용자 속성을 합성하며 선택·편집·drag를 가로채지 않는다.
- [x] **C4 — 생명주기/위치:** DOM 접근은 effect/event에서 수행하고 portal은 해당 Table의 ownerDocument를 따른다. viewport 경계에 배치하고 스크롤·resize·행/열 재사용·대상 제거 시 이전 콘텐츠와 aria-describedby를 정리한다. 기존 aria-describedby ID가 있으면 tooltip ID만 추가/제거한다. 같은 ID의 행 데이터 갱신 시 현재 payload로 갱신한다. 이동 거부 tooltip의 role=status와 타이머는 유지한다.
- [x] **C5 — GREEN:** 단위 및 `npm run lint` 후 `npm run test:e2e -- test/playwright/specs/cell-tooltip.spec.ts test/playwright/specs/cell-row-examples.spec.ts test/playwright/specs/cross-table-drag.spec.ts --workers=1`로 포인터/키보드/Escape/경계 위치/스크롤/가상화/두 테이블 동시 mount/unmount를 검증한다. JSDOM만으로 위치·포커스 동작 통과를 판단하지 않는다. E의 셀 가이드와 예제를 함께 갱신한다.

## D. 값 목록 필터 계획으로 넘길 연결 계약

상태·커스텀 UI 세부 설계: [값 목록 필터 계약](../specs/2026-10-12-value-list-filter-design.md). 체크 즉시 적용, 전체 옵션 유지/다른 열 조건 기반 건수, 검색 결과에 한정한 전체 선택을 사용자 답변으로 확정했다. 아래 구현·검증 항목은 [값 목록 필터 구현 계획](./2026-10-12-value-list-filter.md)에서 수행한다.

구현 위치는 `src/filtering.ts`, `src/column-filter.tsx`, `src/react/model.ts`, `src/core/model.ts`, `src/core/rows/filtering.ts`다. React 렌더 타입은 filtering.ts, 상태/판정은 Core, DOM 이벤트/ref/포커스는 column-filter.tsx에 둔다.

이번 대응표로 확정된 경로는 `filter.trigger.render`, `filter.option.render`, `filter.panel.render`다. 상태 타입이 미정인 채 `any` payload나 동작 없는 설정을 먼저 공개하지 않는다. 별도 필터 설계에서는 아래 항목을 함께 완료한다.

- [x] 선택 값의 식별/직렬화, 빈 값, 옵션 수집 범위, 검색 중 전체 선택, 적용 시점, 옵션 카운트 기준을 기존 controlled model과 연결하여 결정한다. 구현 및 동작 검증은 아직 수행하지 않았다.
- [x] 트리거·검색 입력·체크박스·옵션의 이벤트/ref/ARIA 바인딩과 panel의 option 렌더 도우미 계약을 정한다. panel.render 반환 undefined는 기본 패널, null은 패널 콘텐츠 없음, 커스텀 패널은 option.render를 자동 중복 삽입하지 않는 규칙을 따른다. 공개 TypeScript 선언의 compile 검증은 구현 단계에 수행한다.
- [ ] projectReactColumn의 filter spread를 Core 데이터 속성만 명시하는 투영으로 변경한다. `caseSensitive`, `getValue`, `kind` 및 신규 데이터 필드만 전달하고 trigger/option/panel은 제외한다. 실제 실행 객체에서 UI callback 참조가 없는지 `test/react-core-bridge.test.ts`로 검증한다. 타입 검사만으로 유출 방지를 주장하지 않는다.
- [ ] `test/filtering.test.ts`, `test/column-filter-control.test.tsx`, `test/typecheck/column-filtering-api.tsx`, `test/playwright/specs/column-filtering.spec.ts`에 같은 값 목록 내 OR/열 간 AND, 커스텀 badge, 패널 태그 교체, 키보드와 class/style 조합 검증을 배정한다.

D가 별도 계획/구현/검증을 마치기 전에는 전체 대응표 또는 0.2.2 구현 완료로 보고하지 않는다.

## E. 문서·예제·패키지 소비자 검증

**Files:** 새 `docs/user/27-migration-0.2.2.md`, `docs/ko/27-migration-0.2.2.md`. 기존 양 언어의 `06-header.md`, `08-cell.md`, `13-loading-empty.md`, `17-tree-grid.md`, `18-summary-row.md`, `19-row-expand.md`, `20-row-grouping.md`, `23-cross-table-drag.md`, 각 README를 갱신한다. 필터의 `21-column-filtering.md`는 D와 함께 갱신한다.

추가 수정 대상: 루트 `README.md`, `CHANGELOG.md`, `docs/feature-manifest.json`, `example/src/docs/codeSamples.ts`, `example/src/docs/dataTableOptionGuide.ts`, `example/src/docs/featureRouteManifest.ts`, 관련 `example/src/features/`와 `example/src/fixtures/`의 새 API 예제. 테스트는 `test/user-docs.test.ts`, `test/documentation-contract.test.ts`, `test/typecheck/render-api-compat.tsx`, `test/fixtures/react-public-consumer/consumer.tsx`, `test/fixtures/react-public-consumer/smoke.mjs`, `test/public-package-consumer.mjs`.

- [x] 대응 영역 구현과 같은 단위에서 새 표준 예제로 전환하고, 이전 문법은 마이그레이션/호환 테스트에 남긴다. 기존 기능 manifest 항목을 삭제하거나 전체 문자열 치환하지 않는다. README는 짧은 안내·언어별 링크만 유지한다.
- [x] 양 언어 가이드에 신·구 경로, 0.2.2 도입, 0.x 호환, 1.0.0 제거 대상, undefined/null 차이, 콜백 안 Hook 금지, 콘텐츠와 외부 DOM 교체 구분을 동일하게 명시한다. 아직 구현하지 않은 필터를 현재 지원 기능으로 기재하지 않는다.
- [x] 공개 소비자 runner에 새 마이그레이션 가이드의 독립 실행 가능한 예제를 추가한다. 기존 0.2.0 예제 4개 검증은 유지한다. 새 예제 누락/0개 추출을 실패로 처리한다. React 18/19 설치 소비자에서 신규·기존 경로 타입과 실제 mount를 확인한다.
- [ ] 홈페이지 반영은 독립 website 저장소 작업으로 기록한다. 이 계획 검토에서 다른 저장소를 수정하거나 원격 배포하지 않는다. 릴리스 검증 시 사이트 문서와 실제 지원 버전의 일치를 확인한다.

## 최종 검증 및 완료 판정

아래는 **향후 구현 후 실행할 명령**이며 이번 계획 검토에서 실행 완료한 것으로 간주하지 않는다.

1. 각 A/B/C 단위의 RED→최소 구현→GREEN 결과를 기록한다. 문서 갱신 후 `npm run test:run -- test/user-docs.test.ts test/documentation-contract.test.ts` 및 `npm run check:docs`를 실행한다.
2. 의미 있는 코드/타입 변경의 최종 상태에서 `npm run verify`를 한 번 실행한다. UI 공유 지점 변경이므로 최종 `npm run test:e2e -- --workers=1`을 실행한다. 이후 실패나 추가 변경이 없으면 같은 전체 검증을 반복하지 않는다.
3. 툴팁 정리에서 가상화/스크롤 로직 또는 메모리 측정 계약을 실제 변경했다면 먼저 해당 집중 성능 spec, 마지막에 `npm run test:perf -- --workers=1`을 실행한다. 일반 렌더 속성 추가만으로 성능 전체 검증을 강제하지 않는다.
4. 최종 build 후 `npm pack --offline --ignore-scripts --json --pack-destination .local/render-api-artifacts`로 만든 하나의 신뢰된 tarball을 `node test/public-package-consumer.mjs <tgz-path>`에 전달한다. 디렉터리는 사전 생성하고 실제 반환 파일명과 SHA-256을 기록한다. 이 과정은 npm 게시가 아니다. React 18/19와 React-free Core 소비자 결과를 구분한다.
5. 사용자 요청의 실제 Computer Use 검증은 자동화 결과와 별도 기록한다. 툴팁·Tree·상세 행·그룹·Summary·로딩/빈 상태·필터(구현 시)를 조작한다. 브라우저나 모델 실행 실패를 제품 결함/통과로 바꾸어 보고하지 않는다.
6. 승인 대응표의 각 행을 구현 파일·타입 테스트·동작 테스트·한/영 문서에 연결해 누락을 점검한다. 의미 있는 구현 단계는 `reports/YYYY-MM-DD.md`에 검증과 잔여 이슈를 기록한다. 원격 push/PR/배포/publish는 별도 권한 범위다.

## 계획 검토 결론

A~C는 현재 승인된 결정만으로 순차 구현할 수 있다. 명칭 전환을 위해 Core에 새 렌더 타입을 넣거나 신규 라이브러리를 설치할 필요가 없다. 주요 회귀 위험은 캐시·nullish 처리·기능 제한 우회·툴팁 생명주기이며 위 테스트로 직접 대응한다. D는 별도 필터 설계가 선행되어야 하므로 아직 실행 가능한 전체 0.2.2 계획으로 취급하지 않는다.

실행 상태(2026-10-12 KST): A/B/C와 관련 E 구현 및 자동화·패키지 소비자 검증 완료. 실제 Astra Computer Use는 리포트에 별도 기록했다(순수 hover 이동은 도구 한계로 미실행). D와 전체 0.2.2 릴리스 완료를 의미하지 않는다.
