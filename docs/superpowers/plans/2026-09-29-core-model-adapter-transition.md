# Core Model and Adapter Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 기존 세션에서 순차 실행하며 새 브랜치·worktree를 만들지 않는다. Task 1~7 구현·제품 검증 완료, Task 8~10 미실행. Task 3 보안 스캔의 공식 coverage는 이전 보류 기록이 남은 partial이며 전체 보안 인증을 의미하지 않는다. 실행 증거는 `reports/2026-09-29.md`, `reports/2026-10-01.md`에 기록한다.

**Goal:** 상위 단계 3·4의 Core 상태·모델 및 Browser·React 어댑터를 함께 전환하여, React 루트 호환성을 유지하면서 공개·내부 Core의 React/DOM 의존을 제거한다.

**Architecture:** 데이터 계산은 Core, 브라우저 자원 실행은 Browser, 렌더링·생명주기·사용자 callback 호출은 React가 소유한다. 먼저 중립 모델과 React 호환 bridge를 마련하고 공개 facade를 원자적으로 전환한 다음, React 내부의 상태 조정·projection·요청·이동·측정 책임을 기능별로 이전한다. `/core` 격리 검사 통과만으로 내부 분리까지 완료됐다고 판단하지 않는다.

**Tech Stack:** 기존 TypeScript 7, React 18/19 호환 계약, Vitest, Node.js ESM, Vite, Playwright. 새 의존성 없음.

**Spec:** [상위 경계 설계](../specs/2026-09-29-core-platform-boundary-design.md), [B1~B9 경계 조사](../specs/2026-09-29-core-boundary-research.md), [공개 API 이동표](../specs/2026-09-29-core-public-api-migration.md).

## Global Constraints

- `codex-0.2.0-core-separation`을 유일한 0.2.0 통합 브랜치로 사용한다. `main`의 0.1.x 제품선은 변경하지 않는다.
- 0.2.0은 Core 분리와 React 어댑터 리팩터링에 집중한다. Vue 3 지원은 0.2.0 이후 별도 버전으로 진행한다.
- 단일 npm 패키지와 `comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`를 유지한다. `/browser` 진입점은 추가하지 않는다.
- React → Browser/Core, Browser → Core만 허용한다. Core는 React·DOM·AbortSignal·JSX·CSSProperties를 참조하지 않는다. DOM 없는 Core는 SSR 지원 선언이 아니다.
- 애플리케이션이 소유하는 `data`와 callback 흐름, client-only 경계는 유지한다. 전역 store, event bus, plugin engine을 도입하지 않는다.
- 기존 모드 조합, ID/좌표 의미, 통지 순서, 편집·transfer 원자성, 높이 인덱스의 갱신·복제·캐시 계약을 보존한다.
- React 루트의 JSX label, renderer, theme, custom aggregate 반환과 Row/Value 제네릭은 보존한다. `any`, 확대된 `unknown`, 이중 assertion으로 호환성 문제를 숨기지 않는다.
- 현재 `0.1.11` 버전, dependency/peerDependency, lockfile은 변경하지 않는다. 패키지 설치 단위의 React peer 분리는 범위 밖이다.
- 공개 facade는 유지한다. 기능별 실제 이전에 필요한 파일만 만든다. 빈 계층 scaffold나 관련 없는 전체 파일 이동은 하지 않는다.
- 원격 push, PR, 병합, 태그, Release, publish·배포는 이 계획의 실행 권한에 포함하지 않는다.

## Review Focus

1. JSX를 포함한 루트 state 연산이 중립 state로 반환되거나 no-op 참조가 달라지는 경우 — Task 1·2·3의 bridge/runtime 및 양쪽 타입 fixture가 담당한다.
2. 같은 data의 옵션 변경이 로컬 편집을 되돌리거나 props 동기화에서 data callback을 새로 발생시키는 경우 — Task 4의 reconciliation 및 두 통지 경로 테스트가 담당한다.
3. 정렬·필터·그룹·숨김 컬럼 뒤 편집/선택이 원본 index와 표시 index를 혼동하는 경우 — Task 5·8의 projection/clipboard/keyboard 통합 테스트가 담당한다.
4. abort·revision 변경·unmount 뒤 응답이나 재시도가 이전 요청을 되살리는 경우 — Task 6의 reducer·실행기·React lifecycle 테스트가 담당한다.
5. 숫자/문자열 ID 또는 높이 무효화 변경이 측정값·앵커·자원 해제를 손상시키는 경우 — Task 9의 typed-slot, observer cleanup, focused/full performance 검증이 담당한다.

## 기준선과 실행 규칙

- 계획 조사 기준: `b3ac5c7`, 작업 트리 clean. 단계 2 Task 0~4 완료 후 시작한다.
- 이전 실행 기록: `verify` GREEN, 실제 tarball 소비자는 types/source RED, runtime/runtimeGraph GREEN, unresolved 없음. 이 문서 작성 중 제품 테스트를 재실행한 결과가 아니다.
- 기존 공개 inventory는 root 233 / Core 130 / clipboard 16 / selection 14다. Core 이동표는 retain-core 75 / split-contract 25 / react-only 30이다. **역사적 baseline을 덮어쓰지 않고** Task 3에서 목표 inventory를 이동표로 산출한다.
- 아래 새 내부 함수명은 구현할 계약이다. 기존 공개 함수는 이동표의 이름·제네릭·인수 개수·기본값을 유지하고 Core/React에 맞는 state 타입만 분리한다.
- 각 Task는 focused RED → 최소 구현 → focused GREEN → `npm run verify` 1회 순으로 진행한다. 기존 동작 characterization은 현재 구현에서 먼저 GREEN으로 고정하고, 새 경계/entry의 RED와 구분한다. import 누락만으로 기존 동작 결함이 재현됐다고 보고하지 않는다.
- 모든 소스 추가·이동은 같은 Task에서 `test/fixtures/core-boundary-map.json`의 소유권·경로를 갱신한다. 기존 `test/core-public-api.test.ts`는 모든 `src` 파일을 추적하므로 이를 느슨하게 만들지 않는다.
- 각 Task 종료 시 해당 파일만 로컬 원자적 커밋하고 실행일의 `reports/YYYY-MM-DD.md`에 명령·결과·잔여를 기록한다. 테스트 실패 시 제품/계약/환경을 분류하고 수정 없이 전체 게이트를 반복하지 않는다.
- 공개 타입/동작 문서가 영향을 받으면 해당 Task에서 최소 EN/KO 설명·예제를 맞춘다. 전체 0.2.0 가이드·배포 소비자 인증은 상위 단계 5에 남긴다.

## 파일 소유권과 연결 계약

| 목적 | 생성/이전 위치 | 기존 연결점 |
| --- | --- | --- |
| 중립 컬럼·state·payload, 기본 연산 | `src/core/model.ts`, `src/core/state/table.ts`, `src/core/selection/state.ts`, `src/core/layout/columns.ts` | `src/model.ts`, `src/core.ts`, `src/table-state.ts`, column layout/pinning |
| 데이터 guard·parser·Fill·export | `src/core/editing/cells.ts`, `src/core/editing/clipboard.ts`, `src/core/editing/export.ts` | core/clipboard-text/row-value |
| React 컬럼/state bridge와 공개 호환 함수 | `src/react/model.ts`, `src/react/core-compat.ts`, `src/react/edit-policy.ts` | `src/react-types.ts`, `src/index.tsx`, `src/core.ts` |
| props 조정·변경 판정 | `src/core/state/reconcile.ts`, `src/core/state/changes.ts`, `src/react/state.ts` | index stateInput effect / commitState / notifyChanges |
| 모드별 projection·집계 | `src/core/rows/projection.ts`, `src/core/rows/grouping.ts`, `src/core/rows/summary.ts`, `src/react/rows.ts` | filtering/grouping/tree/summary/index |
| viewport 상태·정책·실행 | `src/core/viewport/data.ts`, `src/core/viewport/requests.ts`, `src/browser/viewport-requests.ts`, `src/react/viewport.ts` | viewport-data/viewport-requests/use-viewport/index |
| transfer와 입력 해석 | `src/core/transfer/policy.ts`, `src/browser/table-transfer.ts`, `src/react/table-transfer.ts`, `src/core/selection/navigation.ts`, `src/browser/pointer.ts` | table-transfer/tree-drag/cell-fill/selection/index |
| 수치 layout와 DOM I/O | `src/core/layout/virtual.ts`, `src/core/layout/viewport.ts`, `src/core/layout/row-height.ts`, `src/browser/measurements.ts`, `src/browser/scroll.ts`, `src/browser/clipboard.ts` | virtual-layout/viewport-layout/row-height/use-viewport/index |

기존 facade/내부 shim은 소비자가 남아 있을 때만 유지하고, 구현 중복 없이 재수출한다. 내부 파일 경로는 공개 package subpath로 추가하지 않는다.

### 중립 모델과 React bridge 결정

- Core 공개 `CominsTableColumn<TData, TValue = unknown>`은 id/field/label 및 기존 데이터 옵션을 갖되 `label: string`, 셀 데이터 정책만 가진다. group/header payload의 label도 문자열이다. theme/header renderer/components/props/style/tooltip은 Core 모델에 넣지 않는다.
- Core 셀 데이터 설정은 `disabled`, `copyable`, `pasteable`의 boolean 또는 데이터 payload callback, `parseClipboard`, `validateFill`이다. payload의 row, column definition/id/field/index, selection, value는 타입 매개변수를 보존한다. 기존 값 자체의 `unknown`은 유지하되 렌더러 대체용 `unknown` 필드를 추가하지 않는다.
- React 루트 타입은 기존 `react-types.ts` 계약을 유지한다. `projectReactState<TData>(state: ReactState<TData>): ReactStateBridge<TData>`와 `restoreReactState<TData>(bridge: ReactStateBridge<TData>, next: CoreState<TData>): ReactState<TData>`를 React 계층에 둔다. 여기서 ReactState/CoreState는 각 계층의 `CominsTableState` import alias다.
- `ReactStateBridge`는 `source`, `core` 및 원본/중립 runtime column·group의 대응 정보를 갖는다. rows/getRowId/selection/sort/layout의 공유 가능한 참조는 그대로 사용한다. Core 결과가 bridge.core와 같으면 **source 그 자체**를 반환한다. 변경된 slice만 복원하며 원본 JSX label, callback, theme을 보존한다.
- bridge의 Core label은 문자열 label이면 그대로, JSX이면 column/group ID를 사용한다. React 렌더링·header 결과·callback에는 반드시 원본 label을 복원한다. JSX에 `String()`을 적용하거나 React label을 Core에 불투명 데이터로 보관하지 않는다.
- 대응 정보는 원본/투영 객체의 위치·identity를 보존한다. ID Map으로 현재 허용되는 중복 컬럼을 임의 병합하지 않는다. 렌더 경로는 입력 참조에 따른 React memo를 이용하고, 공개 standalone 함수는 호출 범위 bridge를 사용한다. rows 전체 복사나 새 전역 캐시는 도입하지 않는다.
- Core 연산에 필요한 guard/parser는 React wrapper가 원본 payload로 변환하여 주입한다. 함수가 React에 정의되어도 Core가 그 함수의 실행 환경을 import하지 않게 한다. 형식화된 값의 CSV/JSON 변환은 기존 순수 export 계약을 그대로 쓰며 React formatter는 어댑터에서 해석한다.
- 이 bridge는 양쪽 public state를 강제 상속시키는 방법을 피한다. 기존 state.columns의 기본 TValue=unknown과 독립 `CominsTableColumn<Row, number>`의 variance를 캐스트로 우회하지 않는다.

### Task 1: 중립 모델·기본 state 연산과 React bridge — 완료

**Files:** 위 model/state/table/selection/state/layout/columns와 react/model/core-compat 생성. `src/core.ts`, `src/model.ts`, `src/react-types.ts`, `src/filtering.ts`, `src/selection-data.ts`의 데이터 참조를 분리. 테스트 `test/core-model.test.ts`, `test/react-core-bridge.test.ts`, `test/typecheck/core-neutral-model.ts`, 기존 `test/typecheck/core-react-compatibility.tsx`.

**Interfaces:** 중립 create/rows CRUD/sort/selection/column layout·header/virtual rows 함수는 현재 `src/core.ts`의 해당 공개 signature를 CoreState로 옮긴다. React bridge는 위 두 함수와 `{source, core, ...대응 정보}`를 제공한다. 공개 facade는 아직 기존 계약을 유지한다.

- [x] **Step 1: 계약 테스트 작성.** 중립 column에 JSX/DOM props를 넣는 음성 타입 assertion, label 문자열 및 Row/Value 양성 검증을 추가한다. bridge roundtrip은 `restore(project(state), bridge.core) === state`, rows/selection 동일 참조, JSX label/theme 복원을 검증한다. CRUD/정렬/선택/컬럼 숨김·순서·핀 및 header/group 결과는 기존 함수와 같은 입력으로 비교한다.
- [x] **Step 2: RED 확인.** `npm run test:run -- test/core-model.test.ts test/react-core-bridge.test.ts`와 `npm run lint`. 새 중립 계약/bridge 부재의 실패를 기록하고 기존 React fixture는 통과해야 한다.
- [x] **Step 3: 최소 구현.** 모델 및 기본 연산을 옮긴다. 기존 알고리즘을 중복 보관하지 않고 React 호환 함수가 bridge를 통해 같은 계산을 호출하도록 바꾼다. 필요한 데이터 helper만 내부 모델을 참조하게 하며 Core가 facade나 react-types를 역참조하지 않게 한다.
- [x] **Step 4: GREEN 확인.** 위 focused tests, `test/basic-core.test.ts test/selection-core.test.ts test/table-calculations.test.ts`, lint 및 verify. 양쪽 선언의 데이터 callback 추론과 root 반환 state를 확인한다. UI가 사용하는 호환 함수가 바뀌므로 `npm run test:e2e -- test/playwright/specs/ref-api.spec.ts test/playwright/specs/header-basic.spec.ts --workers=1`도 실행한다. virtual rows 경로의 bridge 비용은 focused virtualization perf 후 full perf 1회로 확인한다.
- [x] **Step 5: 기록·커밋.** `refactor: introduce neutral table models and React state bridge`. 공개 `/core` 전체 독립성은 아직 미완료로 기록한다.

Task 1 실행 보강: 내부 `src/core/state/access.ts`에 데이터 접근 helper를 공유했다. hot-path 값/선택 조회는 최소 구조 입력으로 호출하고 전체 상태 변경에만 bridge를 사용한다. 중립 cell 정책 타입은 정의했으나 React guard/parser 투영은 Task 2에 남겨 두었다. 세 선택 함수는 기존의 좁은 반환 타입 추론까지 보존한다. `src/model.ts`·`src/react-types.ts`의 기존 계약은 수정할 필요가 없어 유지했다.

### Task 2: 편집·clipboard·export 정책 분리 — 완료

**Files:** 위 core/editing 3개와 react/edit-policy 생성. `src/core.ts`, `src/react/core-compat.ts`, `src/clipboard.ts`, `src/clipboard-text.ts`, `src/row-value.ts` 연결. 테스트 `test/core-edit-policy.test.ts`, 기존 clipboard/edit/export tests 및 React bridge tests.

**Interfaces:** Core `isCominsCellDisabled`, copy/paste row/cell/range, `pasteCominsText`, `fillCominsCellRange`는 기존 인수/default rowIds와 반환 규칙을 유지한다. `createReactEditPolicy<TData>(state: ReactState<TData>, column: ReactRuntimeColumn<TData>): CoreCellDataConfig<TData>`는 기존 props/guard/parser를 원본 React payload로 호출하는 투영 정책을 제공한다. `CoreCellDataConfig`는 Task 1 model의 데이터 셀 설정을 가리키는 내부 alias다.

- [x] **Step 1: 계약 테스트 작성.** B5의 `[7,1,2]` Fill 중 두 번째 대상 검증 예외에서 원본 배열·값 유지, parser throw 원자성, 보호 셀의 행렬 위치 유지, 기존 no-op identity를 고정한다. props 함수/guard에 전달되는 원본 column·JSX label·row dataIndex·selectedRowCount를 검증한다. raw clipboard와 formatted export를 혼동하지 않는다.
- [x] **Step 2: RED 확인.** `npm run test:run -- test/core-edit-policy.test.ts test/react-core-bridge.test.ts`; 기존 구현 characterization GREEN과 새 중립 편집 entry RED를 별도로 기록한다.
- [x] **Step 3: 최소 구현.** 데이터 편집 함수와 export serializer를 Core로 이전한다. React format/class/style/theme 함수는 React 호환 모듈에 남긴다. guard 호출 순서·원래 row 기준 payload·100000 cells 한도·throw 전에 부분 결과를 내보내지 않는 동작을 유지한다.
- [x] **Step 4: GREEN 확인.** focused tests에 `test/clipboard-edit-core.test.ts test/clipboard-edit-table.test.tsx test/clipboard-core.test.ts test/export-core.test.ts`를 추가하고 verify. `npm run test:e2e -- test/playwright/specs/clipboard-edit.spec.ts test/playwright/specs/export-helper.spec.ts --workers=1` 실행.
- [x] **Step 5: 기록·커밋.** `refactor: separate core editing policies from React cell props`.

Task 2 실행 보강: 원본 React props의 1회 해석과 동일 payload guard 호출을 호출 범위 WeakMap으로 보존했다. 렌더용 disabled/format/style/theme는 React 호환 계층에 유지하고 Core disabled는 중립 정책을 사용한다. 이미 중립인 clipboard-text와 React 계약 재수출인 clipboard facade는 그대로 두고, row-value setter를 공유했다. 기존 임시 React withRows/getCellRangeBounds wrapper는 소비자 이전 후 제거했다. 실제 소스 ES2022-only 편집 타입 검사와 전이 source graph, verify(507 tests), 편집/export E2E(5), focused virtualization perf(9), full perf(38)가 통과했다. 실행 기록은 `reports/2026-10-01.md`에 있다. 공개 `/core` 중립 전환과 실제 tarball 소비자 검증은 Task 3에 남는다.

### Task 3: 공개 Core/React facade 원자적 전환 및 제품 게이트 연결 — 구현·제품 검증 완료

**Files:** `src/core.ts`, `src/index.tsx`, `src/react/core-compat.ts`, `src/clipboard.ts`, `src/selection.ts`, `test/core-public-api.test.ts`, `test/core-isolation.test.ts`, `test/fixtures/core-public-consumer/consumer.ts`, `scripts/verify-core-package.mjs`, `test/core-package-gate.node.mjs`, `package.json`, `test/typecheck/docs/core-state.ts`, `docs/user/03-core-state.md`, `docs/ko/03-core-state.md`, `CHANGELOG.md`.

**Interfaces:** `/core` 목표 심볼 = 역사적 Core baseline에서 `react-only` 30개만 제외한 100개. root/clipboard/selection inventory는 기존 이름을 유지한다. 루트는 state를 받거나 반환하는 함수 및 split-contract 타입을 **React 호환 export로 명시**하고 동일 이름을 중립 star export로 덮지 않는다. `/clipboard`·`/selection`도 기존 React state 입출력·guard 타입을 호환 함수로 보존한다. 중립 state 소비자는 `/core`의 대응 함수를 사용하며 이 두 서브패스까지 React 독립성을 새로 약속하지 않는다. `verify:core-package = node scripts/verify-core-package.mjs`는 최신 build 이후 임시 tarball을 pack하고 기존 checker를 source-root와 함께 실행한다.

- [x] **Step 1: RED 계약 추가.** 기존 baseline은 보존하고 목표 집합 산출/누락/추가 대조군을 검사한다. Core consumer에 문자열 label·데이터 guard·state 편집을 추가하고 root fixture에는 state 변경 후 JSX/theme/renderer 복원을 검증한다. `/clipboard`·`/selection` 함수에도 root state를 전달하고 반환 state의 JSX/theme을 확인하는 타입·runtime 검증을 추가한다. package gate에는 checker exit 1/2 전파와 pack 실패·cleanup 테스트를 추가한다.
- [x] **Step 2: RED 실행.** `npm run test:run -- test/core-public-api.test.ts test/core-isolation.test.ts`; 현재 build/pack의 `test:core-consumer`가 기존 제품 경계 이유로 exit 1인지 확인한다. 미해석 graph 또는 준비 오류를 RED 달성으로 인정하지 않는다.
- [x] **Step 3: facade 전환.** Core는 Task 1·2 중립 구현만 재수출하고 root의 React API를 명시적으로 보존한다. 내부 React 소비자는 필요한 호환 import로 바꾼다. 공개 가이드/타입 예제에 중립 Core와 React root의 import·label·셀 정책 차이를 EN/KO로 최소 반영하고 CHANGELOG의 미배포 항목에 기록한다. blanket snapshot 재생성이나 테스트 skip은 금지한다.
- [x] **Step 4: GREEN 및 필수 게이트.** build → 임시 pack → `npm run test:core-consumer -- <tarball> --source-root <repo>`가 네 영역 모두 PASS/exit 0, unresolved=[]인지 확인한다. gate runner는 설치/네트워크 조회 없이 로컬 artifact를 사용하고 자신이 만든 임시 경로만 finally 정리한다. `verify`의 build 뒤 `verify:core-package`, 기존 checker 명령에 새 gate Node tests를 연결하고 `npm run verify`와 `npm run test:run -- test/user-docs.test.ts`를 실행한다. shared root import가 바뀌므로 `npm run test:e2e -- --workers=1` 실행.
- [x] **Step 5: 기록·커밋.** `refactor: switch public core to framework-neutral contracts`. tarball SHA-256·명령·root/Core 타입 결과를 기록한다. B1~B9 내부 분리 및 상위 단계 5·6 완료로 확대 해석하지 않는다.

Task 3 실행 보강: 역사적 Core 130개 baseline은 보존하고 목표 100개를 이동표에서 산출했다. root 233 / clipboard 16 / selection 14 계약은 유지한다. 실제 tarball Core 네 영역과 React 19.2.7 root/subpath 타입·runtime, verify(510 tests 및 checker 33), 일반 E2E(231)가 통과했다. docs manifest는 현재 Core 목록에서 승인된 react-only 30개만 제거했고, 검사기의 가상 패키지 fixture도 확장된 소비 계약에 맞췄다. 보안 스캔 종료 복구 후 공식 결과의 과거 deferred 항목 잔존을 확인했으므로 coverage partial을 잔여로 기록했다. Task 4 시작 시 이 기록을 보안 완료로 확대 해석하지 않는다.

### Task 4: 상태 조정과 변경 내역 계산 — B1/B2

**Files:** core/state/reconcile, core/state/changes, react/state 생성. `src/index.tsx`, `src/table-state.ts` 연결. `test/core-state-reconciliation.test.ts`, `test/core-state-changes.test.ts`, `test/table-interaction.test.tsx`.

**Interfaces:** `reconcileCoreState<TData>({current, nextInput, columnOrderHistory, dataChanged, getRowIdChanged, viewportIndices?}): {state: CoreState<TData>, columnOrderHistory: string[], invalidatedDetailRowIds: CominsRowId[]}`. nextInput은 CoreStateInput의 columnGroups/columns/rows/getRowId/pagination/showHeader다. 두 Changed 값은 boolean이며 React가 원래 외부 입력 ref로 비교한다. 입력이 모두 같으면 기존 effect의 early return을 유지한다. `getCoreStateChanges<TData>(current, next, {columnLayoutChanged?}): {data:boolean, selection:boolean, columnLayout:boolean, sort:boolean, sortModel:boolean}`. React는 Task 1 bridge를 통해 호출한다.

- [x] **Step 1: 계약 테스트 작성.** B1 label만 변경하면 편집 score=9와 rows 참조 유지, 새 data면 authoritative 적용. 컬럼 순서 이력/선택 보존·삭제, getRowId 변경 시 detail 무효화 ID를 고정한다. B2 복합 변경은 data→selection→columnLayout→sort→sortModel 각각 1회, 동일 state/layout false는 0회다.
- [x] **Step 2: RED 실행.** `npm run test:run -- test/core-state-reconciliation.test.ts test/core-state-changes.test.ts test/table-interaction.test.tsx`. **props effect는 사용자 조작 commit과 달리** data/layout을 통지하지 않고 viewport selection 및 바뀐 sort/sortModel만 통지하는 대조군을 추가한다.
- [x] **Step 3: 최소 구현.** 기존 table-state helper를 재사용한다. data 참조 변경 판정은 투영 columns의 새 참조와 혼동하지 않는다. Core는 변경 내역/무효화 ID만 반환하고 React가 state/ref/cache 적용과 callback을 수행한다. 두 통지 경로를 하나로 합치지 않는다.
- [x] **Step 4: GREEN 확인.** 위 tests와 verify, `npm run test:e2e -- test/playwright/specs/ref-api.spec.ts test/playwright/specs/crud-playground.spec.ts --workers=1`.
- [x] **Step 5: 기록·커밋.** `refactor: move table reconciliation and change detection into core`.

Task 4 실행 보강: 변경 감지는 rows/selection/sort/sortModel 최소 snapshot을 받아 전체 React 투영 없이 참조 계약을 보존한다. 상태 조정은 bridge와 신규 React 정의 복원을 사용한다. 기존 viewport selection 순수 helper만 Core로 이동하고 request/lifecycle은 Task 6에 남겼다. 12개 신규 계약 RED → focused 155개 GREEN, 확장 focused 173개, verify 524개 및 checker 33개, focused E2E 3개와 일반 E2E 231개가 통과했다. 세부 판단·미실행 perf·기존 보안 coverage partial은 작업 보고서에 기록했다.

### Task 5: 모드별 행 projection과 집계 — B3/B4

**Files:** core/rows/projection/grouping/summary, react/rows 생성. `src/filtering.ts`, `src/grouping.ts`, `src/tree.ts`, `src/summary.ts`, `src/index.tsx` 연결. `test/core-row-projection.test.ts`, `test/core-render-contract.test.ts` 및 기존 grouping/summary/tree/filtering tests.

**Interfaces:** `projectCoreRows<TData,TGroup>(input: CoreProjectionInput<TData,TGroup>): CoreProjection<TData>`. 입력은 `mode: flat | grouped | tree | viewport` 판별 union이며 기존 허용 옵션만 갖는다. 출력은 data/group/placeholder 판별 entries, `visibleRowIds`, 원본 dataIndex를 포함하고 viewport data에는 별도 absoluteIndex를 둔다. group에는 rowId를 날조하지 않는다. `getBuiltinSummaryValue(kind, values): number | null`; 사용자 aggregate/format의 ReactNode 반환은 React summary wrapper가 처리한다.

- [x] **Step 1: 계약 테스트 작성.** B3 groups=[B,A], filter score>=2, B 접힘, 오름차순의 표시 행=[a2,a9], 원본 배열 불변을 고정한다. flat pagination/virtual 분기, tree sibling sort/expanded 경로, sparse viewport 절대 좌표·빈 슬롯, 필터 후 요약 대상과 custom aggregate JSX를 추가한다.
- [x] **Step 2: RED 실행.** `npm run test:run -- test/core-row-projection.test.ts test/core-render-contract.test.ts test/grouping.test.ts test/summary-core.test.ts test/tree-core.test.ts test/filtering.test.ts`. 기존 모드 거부/비활성 조건의 characterization은 GREEN으로 확보한다.
- [x] **Step 3: 최소 구현.** 기존 filter/sort/group/tree 알고리즘과 메모 경계를 재사용한다. Flat/Filtered/Grouped/Tree/Viewport 각각의 지원 조합을 조사 문서 그대로 유지한다. 중립 group model에서 JSX label을 제거하고 React가 groupId/원본 group으로 렌더링한다. built-in 집계와 renderer 호출을 분리하며 새로운 public aggregate API는 만들지 않는다.
- [x] **Step 4: GREEN 확인.** focused tests와 verify. `npm run test:e2e -- test/playwright/specs/column-filtering.spec.ts test/playwright/specs/row-grouping.spec.ts test/playwright/specs/tree-grid.spec.ts test/playwright/specs/summary-row.spec.ts --workers=1`. projection이 virtual slots 경로를 바꾸므로 `npm run test:perf -- test/playwright/specs/virtualization.spec.ts --workers=1`을 먼저 실행하고 `npm run test:perf -- --workers=1`을 1회 실행한다.
- [x] **Step 5: 기록·커밋.** `refactor: extract mode-specific row projection and aggregation`.

Task 5 실행 보강: 준비된 필터/정렬/그룹 인덱스를 받는 projection과 별도 페이지/Viewport window helper로 기존 memo 경계를 유지했다. React 그룹 label은 groupId로 복원하며 Core 그룹 모델에는 label을 두지 않는다. 필터도 중립 모듈로 이전하고 원래 React payload/receiver는 wrapper가 보존한다. verify(531 tests 및 checker 33), focused E2E(6), 일반 E2E(231), focused virtualization(9) 및 전체 perf(38)가 통과했다. Tree/Viewport 좌표 판단과 실제 tarball hash는 작업 보고서에 기록했다.

### Task 6: viewport descriptor·요청 정책·실행 생명주기 — B6

**Files:** core/viewport/data/requests, browser/viewport-requests, react/viewport 생성. `src/viewport-data.ts`, `src/viewport-requests.ts`, `src/use-viewport.ts`, `src/index.tsx` 연결. `test/core-request-policy.test.ts`, `test/browser-viewport-requests.test.ts`, 기존 viewport-data/viewport-table tests.

**Interfaces:** `CoreViewportRequest = {startIndex,endIndex,revision,requestId,retainRange}`는 signal을 갖지 않는다. `planViewportRequests({data, range, active, retryStarts, maxConcurrent}): {startRanges: CominsViewportRange[], cancelRequestIds: string[], releaseRequestIds: string[], consumedRetryStarts: number[]}`; active는 descriptor와 done boolean의 readonly 목록이다. `createViewportRequestExecutor({onRequest, onSettled}): {start(descriptor): void, cancel(requestId): void, release(requestId): void, dispose(): void}`는 Browser 내부에서 AbortController/Promise를 소유한다. `onRequest`에는 descriptor + signal의 기존 루트 실행 요청을 전달하고 `onSettled`에는 requestId만 전달한다. 응답 data는 기존 애플리케이션 callback/reducer 흐름으로 들어온다.

Browser의 실행 요청 타입은 `CoreViewportRequest & {signal: AbortSignal}`로 정의하고 루트 타입이 이를 재수출한다. 소비자 훅의 별도 실행 경계 `runViewportRequest<TData>({request, getRows, dispatch}): Promise<void>`도 같은 Browser 파일에 둔다. getRows는 현재 동기 배열/Promise 계약, dispatch는 request/cancel/success/error 데이터 event를 받는다. 이 helper는 abort listener 등록·finally 해제를 소유하고 React hook의 dispatch closure가 mounted/initial snapshot 유효성을 검사한다. Table의 스케줄링 executor와 소비자 getRows 실행을 합쳐 이중 요청하지 않는다.

- [x] **Step 1: 계약 테스트 작성.** B6 refresh→local patch id=999→옛 응답에서 최신 값과 pending 정리, revision 불일치/중복 ID/불완전·sparse 응답, cache retain을 고정한다. 시작 전에 aborted면 request no-op, pending 이후 aborted response면 cancel과 같은 정리, 기본 동시 실행 2·retry·범위 이탈·unmount cleanup을 각각 검증한다.
- [x] **Step 2: RED 실행.** `npm run test:run -- test/core-request-policy.test.ts test/browser-viewport-requests.test.ts test/viewport-data.test.ts test/viewport-table.test.tsx`. ES2022/types=[]의 내부 Core 타입 검사에도 viewport entry를 포함하여 AbortSignal 유입 RED를 확인한다.
- [x] **Step 3: 최소 구현.** Core reducer는 signal 없이 기존 event/data 계약을 처리한다. 기존 루트 `CominsViewportRequest`와 reducer wrapper는 signal을 유지하며 request/response 양쪽 aborted 분기를 기존 순서대로 변환한다. Promise reject가 새 공용 오류 callback을 만들지 않게 한다. executor는 취소 후 settled 통지를 억제하고 dispose를 멱등으로 구현한다. React는 ref/effect 및 제어 snapshot 갱신을 담당하고 소비자 훅의 abort listener도 Browser helper로 위임한다. lazy/infinite 요청은 viewport 정책에 합치거나 동작을 바꾸지 않는다.
- [x] **Step 4: GREEN 확인.** 위 tests와 verify. `npm run test:e2e -- test/playwright/specs/viewport-datasource.spec.ts --workers=1`; focused `npm run test:perf -- test/playwright/specs/viewport-physical-scrollbar.spec.ts --workers=1` 후 full perf 1회. 요청 계획이 cache/scroll 자원 사용을 바꾸는 회귀를 확인한다.
- [x] **Step 5: 기록·커밋.** `refactor: split viewport request policy and browser execution`.

Task 6 실행 보강: 완료된 요청의 abort 없는 참조 해제를 보존하도록 planner의 releaseRequestIds 및 executor.release를 추가했다. 행 데이터를 받지 않는 executor의 불필요한 generic은 생략했다. Core는 signal 없는 reducer/정책을 소유하고 Browser는 controller/Promise/listener를, React는 controlled snapshot/ref/effect를 소유한다. focused 31 tests, verify(547 tests 및 checker 33), Viewport E2E(5), 일반 E2E(231), focused physical scrollbar(1), 전체 perf(38)가 통과했다. B6 characterization과 ES2022 격리 컴파일을 실행 증거로 연결했다.

### Task 7: transfer 계산과 DOM 등록 분리 — B7

**Files:** core/transfer/policy, browser/table-transfer, react/table-transfer 생성. `src/table-transfer.ts`, `src/index.tsx` 연결. `test/core-transfer-policy.test.ts`, `test/browser-transfer-registration.test.ts`, 기존 `test/table-transfer.test.ts`, `test/typecheck/table-transfer-api.tsx`.

**Interfaces:** `transferCominsRowBetweenTables<TData,TGroup=never>(input: CominsRowBetweenTablesInput<TData,TGroup>): CominsTableTransferResult<TData,TGroup> | null`과 `transferCominsGroupBetweenTables<TData,TGroup>(input: CominsGroupBetweenTablesInput<TData,TGroup>): CominsTableTransferResult<TData,TGroup> | null`을 그대로 이전한다. Browser 등록은 기존 coordinator 인스턴스/scope/tableId/instanceId 키와 DOM snapshot을 보존하며 register의 반환 해제 함수를 멱등으로 만든다. React rejectionFeedback renderer는 Core/Browser 타입에 포함하지 않는다. 공개 coordinator brand·루트 함수는 facade에서 유지한다.

- [x] **Step 1: 계약 테스트 작성.** B7 source g=[a,b], target h=[b], b reject면 전체 null/양쪽 rows/groups 불변. overwrite·숫자/문자열 ID, 두 coordinator 격리, 같은 scope/tableId 중복 거부, 해제 뒤 재등록 및 stale snapshot을 검증한다.
- [x] **Step 2: RED 실행.** `npm run test:run -- test/core-transfer-policy.test.ts test/browser-transfer-registration.test.ts test/table-transfer.test.ts` 및 lint.
- [x] **Step 3: 최소 구현.** 충돌·이동 계산만 Core로 옮기고 DOM 조회·등록은 Browser, callback/tooltip은 React에 남긴다. 새 전역 coordinator나 공개 transfer mode는 만들지 않는다.
- [x] **Step 4: GREEN 확인.** 위 tests와 verify, `npm run test:e2e -- test/playwright/specs/cross-table-drag.spec.ts test/playwright/specs/row-drag-examples.spec.ts --workers=1`.
- [x] **Step 5: 기록·커밋.** `refactor: separate transfer policy from browser registration`.

Task 7 실행 보강: 기존 branded coordinator와 callback options는 React에 두고 coordinator별 typed Browser registry를 생성했다. Browser는 identity/DOM 필드만 해석하며 rejectionFeedback renderer 타입을 정의하지 않는다. DOM hit/snapshot 검증과 React 등록 effect를 실제 경로로 연결했다. 기존 cleanup이 반복 호출에서 새 registration을 삭제하는 결함은 선행 RED 후 멱등 가드로 수정하고 CHANGELOG에 기록했다. 계산 본문은 기준과 동일하며 focused 23 tests, verify(556 tests 및 checker 33), focused E2E(28), 일반 E2E(231)가 통과했다. 스크롤·가상화·메모리 카운터는 변경하지 않아 full perf는 이번에 재실행하지 않았다.

### Task 8: 선택·키보드·드래그 목적지 계산 — B8

**Files:** core/selection/navigation, browser/pointer 생성. `src/selection.ts`, `src/selection-data.ts`, `src/column-pointer.ts`, `src/drag-autoscroll.ts`, `src/tree-drag.tsx`, `src/cell-fill.tsx`, `src/index.tsx` 연결. `test/core-navigation.test.ts`, 기존 selection/clipboard/tree drag tests.

**Interfaces:** `resolveCoreFillTarget({source, address, rowIds, columnIds}): CominsCellRange | null`은 source range와 현재 pointer의 cell address로 기존 Fill 확장 범위를 계산한다. 두 축 거리 동률은 현재처럼 세로 우선, 원본 범위 안이면 null, 100000 cells 초과면 null이다. tree drag 목적지·autoscroll 함수는 기존 수치 입력/결과를 유지한다. React가 이벤트 우선권을 확인한 뒤 의도로 변환하고 Browser가 pointer capture/focus/scroll을 적용한다. 일반 cell Arrow/Home/End 이동은 현재 구현에 없으므로 새로 추가하지 않는다.

- [ ] **Step 1: 계약 테스트 작성.** 정렬·필터 뒤 표시 rowIds와 숨김 제외 columnIds로 선택/Fill/copy 대상이 기존 계약과 일치하는지 검증한다. 기존 clipboard 옵션에 따른 rowIds 분기는 통합하지 않는다. 범위 경계·빈 표·숫자/문자열 ID, nested input 및 사용자 preventDefault에서 내장 동작 미실행, drag cancel/unmount에서 capture·frame 해제를 고정한다.
- [ ] **Step 2: RED 실행.** `npm run test:run -- test/core-navigation.test.ts test/selection-core.test.ts test/tree-row-drag-core.test.ts test/table-interaction.test.tsx`.
- [ ] **Step 3: 최소 구현.** React SyntheticEvent와 DOM target 확인을 Core에 넘기지 않는다. 이미 순수한 column-pointer/drag-autoscroll 수치 계산은 재사용하고 이벤트 시스템을 새로 만들지 않는다. Task 5의 표시 순서와 원본 순서를 명시적으로 전달하고 기존 기능/옵션별 선택을 보존한다. 분기 간 동작 차이를 발견하면 리팩터링에서 임의 수정하지 않는다.
- [ ] **Step 4: GREEN 확인.** focused tests와 verify. shared interaction 변경이므로 `npm run test:e2e -- --workers=1`. scroll 실행 경로가 바뀌면 focused virtualization perf 후 full perf 1회도 실행한다.
- [ ] **Step 5: 기록·커밋.** `refactor: separate navigation intent from pointer execution`.

### Task 9: layout 무효화와 Browser 측정·I/O 경계 — B4/B9

**Files:** core/layout/virtual/viewport/row-height와 browser/measurements/scroll/clipboard 생성. `src/virtual-layout.ts`, `src/viewport-layout.ts`, `src/row-height.ts`, `src/row-detail.tsx`, `src/use-viewport.ts`, `src/index.tsx` 연결. `test/core-layout-invalidation.test.ts`, `test/browser-measurements.test.ts`, 기존 virtual-layout/table-calculations tests.

**Interfaces:** 기존 height index·slot·anchor 수치 함수 signature를 유지한다. `createMeasurementObserver({onMeasure}): {observe(element): void, unobserve(element): void, dispose(): void}`는 실제 DOM 측정 수명만 담당하며 onMeasure로 `{element,height}`를 반환한다. React가 element→row/slot 대응을 관리하고 Core에 row/layoutKey/contentRevision/height를 전달한다. Browser scroll/clipboard 함수는 기존 동기·Promise 반환과 fallback을 유지한다.

- [ ] **Step 1: 계약 테스트 작성.** B9 `data:number:1`/`data:string:1` 측정 분리, row/layoutKey/contentRevision 각각 변경 시 무효화, 동일 입력 캐시 재사용, 제거된 anchor fallback, sparse index clone/retain/한도/물리 높이 상한을 고정한다. 관측 마지막 요소 제거 및 반복 mount/unmount에서 observer/frame/listener 회수를 검증한다.
- [ ] **Step 2: RED 실행.** `npm run test:run -- test/core-layout-invalidation.test.ts test/browser-measurements.test.ts test/virtual-layout.test.ts test/table-calculations.test.ts`. 기존 수치 결과와 신규 경계 실패를 분리한다.
- [ ] **Step 3: 최소 구현.** DOM geometry·ResizeObserver·focus/scroll·clipboard I/O를 Browser로 옮긴다. React effect/ref는 그대로 생명주기를 연결한다. Core는 실제 숫자/식별자만 받고 높이 index 갱신·clone 계약을 유지한다. clipboard fallback/권한 오류 동작을 새 기능으로 확장하지 않는다.
- [ ] **Step 4: GREEN 확인.** focused tests와 verify. `npm run test:e2e -- test/playwright/specs/row-expand.spec.ts test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/physical-scrollbar.spec.ts --workers=1`. 먼저 `npm run test:perf -- test/playwright/specs/virtualization.spec.ts test/playwright/specs/viewport-physical-scrollbar.spec.ts --workers=1`, 이후 `npm run test:perf -- --workers=1` 1회 실행한다. 성능 기준·memory counter를 통과 목적으로 완화하지 않는다.
- [ ] **Step 5: 기록·커밋.** `refactor: isolate layout models and browser measurement lifecycle`.

### Task 10: 전체 내부 경계 검증과 단계 5 인계

**Files:** `test/core-isolation.test.ts`, `test/core-public-api.test.ts`, `scripts/check-core-boundary.mjs`, `test/core-boundary-checker.node.mjs`, `test/fixtures/core-boundary-map.json`, `docs/superpowers/specs/2026-09-29-core-public-api-migration.md`, 이 계획, 실행 리포트. 검사 확장에 필요한 `test/fixtures/core-internal-consumer/consumer.ts` 생성.

**Interfaces:** 기존 `inspectCoreGraph({root, entries, mode})`와 checker exit 0/1/2 계약을 유지한다. `/core` 외에 `src/core/` 전체 .ts 파일의 source/type closure를 검사한다. Browser는 DOM을 허용하지만 react/react-dom/JSX import 및 src/react 역참조를 금지한다. Node/React 타입이 없는 ES2022 compile 대상은 Core만이다.

- [ ] **Step 1: 누락 대조군 작성.** 공개 facade에서 도달하지 않는 내부 viewport 파일에 React type/AbortSignal이 들어간 fixture, Browser→React 역참조 fixture, 미해석 import fixture가 반드시 실패하게 한다. Core의 DOM 오염은 전역 이름 문자열 검색만으로 판정하지 않고 실제 ES2022 compiler closure로 검증한다.
- [ ] **Step 2: RED 실행.** `npm run test:core-boundary-checker`와 `npm run test:run -- test/core-isolation.test.ts test/core-public-api.test.ts`. Core 전체 검사 없이 공개 entry만 검사하는 구현이 내부 오염 대조군을 놓치는 것을 확인한다.
- [ ] **Step 3: 검사 보강·증거 연결.** source/type 검사의 roots를 내부 Core까지 확장하고 Browser 의존 방향 검증을 추가한다. B1~B9 characterization 상태는 실제 테스트와 실행 증거가 있는 것만 완료로 바꾼다. 새 public export는 추가하지 않고 불필요해진 migration shim은 소비자가 없는 것만 제거한다.
- [ ] **Step 4: 최종 GREEN 확인.** `npm run verify`로 실제 최신 tarball과 전체 내부 경계를 검증하고 `npm run test:e2e -- --workers=1`, `npm run test:perf -- --workers=1`을 실행한다. 실패·미실행 항목이 있으면 단계 3·4 완료로 표시하지 않는다. `git diff --check`와 로컬 branch/worktree 상태도 기록한다.
- [ ] **Step 5: 인계·커밋.** `test: enforce core and adapter boundaries across internal modules`. 단계 5에는 EN/KO 전체 migration 문서, root React tarball consumer 및 모든 subpath artifact 검증을 남긴다. 단계 6의 릴리스 준비 `verify:full`과 원격·배포 승인 경계도 별도로 남긴다.

## 실행 순서·완료 판정

Task 1 → 2 → 3(공개 Core 독립성) → 4 → 5 → 6 → 7 → 8 → 9 → 10(내부 분리까지 검증) 순으로 진행한다. Tasks 4~9는 각각 Core 계산과 해당 React/Browser 연결을 같은 작업 안에서 마쳐, 사용되지 않는 복제 구현을 장기간 남기지 않는다.

- 단계 3 완료: 중립 state/model/편집/projection/viewport/transfer/layout를 React 없이 검사할 수 있고 B1~B9 Core 소유 연산이 실제 어댑터에서 사용된다.
- 단계 4 완료: 기존 root 타입/행동 및 callback 순서를 유지하고 Browser 자원이 cleanup되며 Core/Browser의 React 역참조가 없다.
- 단계 5·6 미완료: 이 계획 통과만으로 사용자 문서 전체, React 배포 소비자, 최종 릴리스 준비 또는 배포 완료를 주장하지 않는다.
- Task 1~7를 완료했으며 다음 실행 범위는 **Task 8**다. 기존 브랜치·순차 실행 방법은 유지한다. 상위 설계 변경 없이 해결할 수 없는 호환성 충돌이 입증되면 그 지점에서 대안·영향을 보고하고 범위 확장 전에 결정받는다.

## 자체 검토

- B1/B2→Task 4, B3→5, B4→1/3/5/9, B5→2, B6→6, B7→7, B8→8, B9→9로 소유권과 검증을 연결했다.
- 공개 Core GREEN 전환(Task 3)과 내부 Core 전체 GREEN(Task 10)을 분리했다. 외부 public inventory의 과거 증거를 목표 집합으로 덮어쓰지 않는다.
- root state와 Core state 사이의 구조적 호환을 가정하지 않고 bridge identity·metadata·callback payload 복원을 명시했다. props 조정 통지와 사용자 조작 통지를 구분했다.
- 현재 지원하지 않는 일반 cell Arrow/Home/End 이동은 제외했고, B8은 기존 Fill/선택·clipboard·tree drag 계산 이전으로 한정했다. clipboard 옵션별 좌표 분기를 새 규칙으로 통합하지 않는다.
- Review Focus 5개에 소유 테스트가 있으며 기능별 focused 검증과 전체 게이트를 구분했다. 문서 작성 자체에는 구현 검증 결과를 붙이지 않는다.
- Vue·새 패키지·새 브랜치·SSR·신규 모드 지원·release 작업은 추가하지 않았다. 구현 checklist는 Task 1~7를 완료했다. 공개 Core 독립성 검증과 별도로 Task 8~10 내부 분리 및 최종 검증은 남아 있다.
