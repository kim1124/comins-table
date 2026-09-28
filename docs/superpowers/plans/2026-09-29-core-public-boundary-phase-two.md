# Core Public Boundary Phase Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 현재 브랜치에서 순차 실행하며, 별도 브랜치나 worktree를 생성하지 않는다.

**Goal:** 0.2.0의 공개 Core 분리에 앞서 모든 공개 심볼의 이동 계약, React 없는 패키지 소비자 검사, 회귀 방지 기준을 고정한다.

**Architecture:** 기존 공개 API는 이 단계에서 유지한다. 현재 export 목록을 기준선으로 저장하고, 로컬 tarball을 격리된 소비자에 풀어 런타임과 선언 파일을 별도로 검사한다. 미해결 Core 경계는 명시적인 독립 검사에서 실패로 보고하며, 상태·컬럼 모델 및 React 어댑터의 실제 전환은 설계 단계 3·4에서 수행한다.

**Tech Stack:** 기존 TypeScript 7, `typescript/unstable/sync`, Node.js ESM, Vitest, Vite. 의존성 추가 없음.

**Spec:** [Core 플랫폼 경계 설계](../specs/2026-09-29-core-platform-boundary-design.md)

## Global Constraints

- `codex-0.2.0-core-separation`을 유일한 0.2.0 통합 브랜치로 사용한다.
- 0.2.0은 Core 분리와 React 어댑터 리팩터링에 집중한다.
- Vue 3 지원은 0.2.0 이후 별도 버전으로 진행한다.
- 0.2.0에서는 단일 npm 패키지를 유지하고, 별도 Core 패키지는 후속 설계로 미룬다.
- `/core`는 코드·런타임·타입 수준에서 React와 독립적이어야 한다.
- 애플리케이션이 소유하는 `data`와 callback 흐름, client-only 경계는 유지한다.
- 기존 공개 진입점 `comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`를 유지한다.
- 현재 패키지 버전 `0.1.11`과 dependency/peerDependency/lockfile은 이 단계에서 변경하지 않는다.
- 2단계 완료는 경계 계약과 진단 수단의 완료이며, Core 독립성 또는 0.2.0 릴리스 완료를 의미하지 않는다.

## Review Focus

1. 개발 저장소의 React 타입이 소비자 검사에 유입되어 거짓 성공하는 경우 — Task 2에서 격리와 `skipLibCheck: false`를 검사한다.
2. `core.d.ts`의 간접 재수출에만 React가 남는 경우 — Task 2에서 간접 의존 fixture가 반드시 실패하는지 검사한다.
3. export 이름은 같지만 React renderer의 제네릭과 반환 타입이 손상되는 경우 — Task 3의 루트 타입 fixture로 검증한다.
4. 빌드된 Core의 공유 chunk가 React를 불러오는 경우 — Task 2에서 실제 Node import와 간접 chunk fixture를 검증한다.
5. `/core` 심볼 이동 중 루트·clipboard·selection 공개 API가 누락되는 경우 — Task 1·3에서 진입점별 전체 목록과 이동 목적지를 검사한다.

## 확인된 기준선과 계획 범위

조사 기준 커밋: `6ffacb1`. 작업 트리는 계획 작성 시작 시 clean이었다.

| 확인 대상 | 현재 상태 | 계획에 반영할 의미 |
| --- | --- | --- |
| TypeScript checker로 수집한 공개 심볼 | 루트 233, Core 130, clipboard 16, selection 14 | 이름 목록을 비교하며 개수만으로 호환성을 판정하지 않는다. 값과 타입을 합친 개수다. |
| `src/core.ts:76` 및 `:120` | `react-types.ts`를 import/re-export | 내부 모델 테스트 통과만으로 공개 Core 독립성을 판단할 수 없다. |
| `src/react-types.ts` | 컬럼·state·theme·payload가 React 타입을 참조 | 파일 전체를 단순 이동하지 않고 데이터 계약과 렌더링 계약을 분류한다. |
| `formatCominsCellValue`, `getCominsCellStyle` | ReactNode/CSSProperties가 추론 반환 타입으로 전파 | 명시적 type export 외에 값의 선언 파일도 검사한다. |
| `src/index.tsx:142` | `export * from "./core"` | Core에서 타입을 제거할 때 루트의 호환 재수출을 함께 확보해야 한다. |
| `test/core-isolation.test.ts` | 내부 height/tree/viewport 모델의 source 격리 검사 | 기존 테스트를 유지하고 공개 패키지 검사를 별도로 추가한다. |
| `scripts/consumer-smoke.mjs` | React 18을 설치한 소비자에서 런타임 import | React 소비자 검증을 유지하며 Core 전용 오프라인 검사를 추가한다. |
| `tsconfig.json` | `skipLibCheck: true` | 새 소비자 검사에서 이를 상속하지 않는다. |

위 항목은 소스 및 export 수집 결과다. 공개 Core의 격리 컴파일 실패와 런타임 성공 여부는 이번 계획 작성에서 실행하지 않았으며, Task 2에서 실제 결과를 기록한다. 런타임은 이미 통과할 수 있으므로 억지로 RED를 만들지 않는다.

이 계획은 상위 설계의 **단계 2만 실행 가능한 작업으로 상세화**한다. 단계 3~6의 상태 모델 이전, React 동작 변경, 공개 문서 전환, 전체 릴리스 검증은 아래 인계 조건으로 연결한다.

## 파일 책임

| 파일 | 작업 | 책임 |
| --- | --- | --- |
| `test/fixtures/core-public-api-baseline.json` | 생성 | 진입점별 현재 심볼 목록과 이동 분류 |
| `test/core-public-api.test.ts` | 생성 | 전체 export 및 이동 분류의 누락·중복 검사 |
| `scripts/check-core-boundary.mjs` | 생성 | 격리 소비자 구성, 타입/런타임 검사, CLI 결과 |
| `test/core-boundary-checker.node.mjs` | 생성 | 검사기 자체의 정상·오염 fixture 검증 |
| `test/fixtures/core-public-consumer/consumer.ts` | 생성 | 최종 Core 계약을 사용할 양성 타입 소비자 |
| `test/fixtures/core-public-consumer/smoke.mjs` | 생성 | 상태 생성·조회·정렬의 실제 패키지 import |
| `test/typecheck/core-react-compatibility.tsx` | 생성 | 기존 루트 React API의 타입 보존 |
| `docs/superpowers/specs/2026-09-29-core-public-api-migration.md` | 생성 | 전체 이동표, 경계 원칙, 다음 단계 인계 계약 |
| `package.json` | 수정 | 경계 검사기 테스트와 독립 소비자 검사 명령 |
| `reports/YYYY-MM-DD.md` | 실행일 문서 갱신 | 실제 GREEN/RED 증거와 후속 미해결 항목 |

`src/`, Vite 설정, 기존 사용자 문서와 feature manifest는 2단계에서 수정하지 않는다. 아직 제공하지 않는 0.2.0 API를 사용자 문서에 완료 상태로 소개하지 않는다.

### Task 1: 공개 API 기준선과 이동 분류 고정

**Files:** 생성 `test/fixtures/core-public-api-baseline.json`, `test/core-public-api.test.ts`, `docs/superpowers/specs/2026-09-29-core-public-api-migration.md`.

**Interfaces:** 기존 `loadDocumentationManifest(root)`와 `collectDocumentationContractEvidence(root, manifest)`를 `scripts/check-documentation-contract.mjs`에서 사용한다. 새 JSON은 `{ baselineCommit, entrypoints, coreDisposition }`이며, `entrypoints`는 각 specifier의 정렬된 `string[]`, `coreDisposition`은 모든 Core 심볼을 키로 갖는 `{ kind, target, reason }` 레코드다. `kind`는 `retain-core`, `split-contract`, `react-only` 중 하나다. `target`은 `comins-table/core` 또는 `comins-table`이다.

- [ ] **Step 1: 기준선 검증 테스트 작성.** `preserves every public entrypoint`에서 package exports key가 정확히 `[".", "./clipboard", "./core", "./selection", "./styles.css"]`인지 검사한다. `matches all baseline symbols`에서 네 JS/타입 진입점의 정렬된 목록이 JSON과 일치하는지 검사한다. `classifies every core symbol exactly once`에서 `Object.keys(coreDisposition).sort()`가 Core 목록과 같은지, 빈 reason/알 수 없는 kind가 없는지 검사한다.
- [ ] **Step 2: RED 확인.** `npm run test:run -- test/core-public-api.test.ts`를 실행한다. 새 기준선 파일 부재로 실패해야 하며, 기존 도구의 import 오류라면 테스트 준비 문제를 먼저 수정한다.
- [ ] **Step 3: 기준선과 이동표 작성.** 조사 기준 커밋의 전체 이름 목록을 기존 checker로 수집한다. 모든 심볼을 아래 분류에 따라 한 번씩 배정하고, 문서에 `이전 import → 목표 import → 계약 변경 → 검증 위치`를 심볼별로 기록한다. 테스트 실행 시 기준선을 자동 갱신하지 않는다.

| 대상 | 분류와 목표 계약 |
| --- | --- |
| `model.ts`의 row ID, selection, sort, layout, clipboard 데이터 및 순수 함수 | `retain-core`; 현재 이름과 데이터 의미 유지 |
| `CominsTableColumn`, `CominsTableColumnGroup`, runtime column, state/input, header cell | `split-contract`; `/core`는 데이터/배치 계약, 루트는 기존 React label·renderer 계약 유지 |
| `CominsCellFormatParams`, `CominsColumnValueResolver`, component payload, `CominsClipboardGuard` | `split-contract`; 순수 데이터 callback과 React 렌더링 payload를 분리하고 row/value 제네릭 유지 |
| `CominsTableTheme`, `CominsColumnProps`, `CominsTableCellConfig`, `CominsTableHeaderConfig`, component/menu/options/virtual-list 렌더링 타입 | `react-only`; 루트의 기존 이름 유지. copyable/pasteable/disabled/parseClipboard/validateFill의 순수 데이터 계약은 후속 Core 모델에서 별도 보존 |
| `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, `setCominsTableTheme` | `react-only`; 루트에서 현재 함수 계약 유지. Core 내부 상태·clipboard에서 호출하는 경로도 단계 3·4 이전 목록에 포함 |
| `isCominsCellDisabled`와 clipboard/fill 함수 | `split-contract`; 데이터 변경 허용 규칙은 Core에 유지하며 React props 해석은 어댑터에서 연결 |

`split-contract`는 타입명을 일괄 삭제하거나 `any`/`unknown`으로 치환한다는 뜻이 아니다. 단계 3에서 사용할 구체 모델 선언은 이 이동표와 기존 필드 사용처를 근거로 설계하며, 루트의 기존 이름과 `/core`의 데이터 이름이 충돌하면 루트의 명시적 export로 해결한다. 이름을 새로 추가할 경우 그 단계의 API inventory와 문서 계약을 함께 갱신한다.

- [ ] **Step 4: GREEN 확인.** Step 2 명령과 `npm run check:docs`를 실행한다. 네 진입점의 모든 이름과 Core 130개 분류에 누락이 없어야 한다. `split-contract` 심볼의 구현이 완료됐다고 표시하지 않는다.
- [ ] **Step 5: 원자적 로컬 커밋.** 이 작업의 세 파일만 stage하고 `test: pin public core API migration inventory`로 커밋한다.

### Task 2: React 없는 공개 패키지 소비자 검사기

**Files:** 생성 `scripts/check-core-boundary.mjs`, `test/core-boundary-checker.node.mjs`, `test/fixtures/core-public-consumer/consumer.ts`, `test/fixtures/core-public-consumer/smoke.mjs`.

**Interfaces:** 검사기는 `checkCoreBoundary({ packageRoot, compilerPath, fixtureRoot }): Promise<{ types: { ok: boolean, diagnostics: string }, runtime: { ok: boolean, diagnostics: string } }>`를 export한다. `packageRoot`는 압축이 해제된 패키지 디렉터리다. CLI는 `node scripts/check-core-boundary.mjs <tarball.tgz>`이며 모든 검사 성공은 exit 0, 실제 경계 위반은 exit 1, 파일/컴파일러/압축 도구 누락 같은 실행 준비 오류는 exit 2다. 함수 import만으로 CLI나 빌드를 실행하지 않는다.

- [ ] **Step 1: 검사기의 RED 테스트 작성.** Node test fixture로 `accepts an isolated pure package`, `rejects transitive React declarations`, `rejects a React import in a shared runtime chunk`, `reports missing artifact as setup error`, `cleans its own temporary directory`를 작성한다. 순수 fixture는 타입·런타임 모두 `ok: true`; `.d.ts → bridge.d.ts → react` fixture는 types false; `.js → chunk.js → react/jsx-runtime` fixture는 runtime false여야 한다. 오류를 빈 diagnostics 또는 성공으로 바꾸지 않는다.
- [ ] **Step 2: RED 확인.** `node --test test/core-boundary-checker.node.mjs`를 실행해 새 검사기 부재로 실패하는지 확인한다.
- [ ] **Step 3: 격리 검사 구현.** `mkdtemp`로 생성한 OS 임시 디렉터리에 패키지를 복사하고 `node_modules/comins-table` 경로에서 실제 package exports를 해석한다. 소비자 디렉터리에서 `react`, `react-dom`, `@types/react`, `@types/react-dom`을 찾을 수 없음을 먼저 확인한다. repo를 symlink하지 않고 `NODE_PATH`를 제거한다. npm install을 실행하지 않는다. compiler는 repo의 절대 경로를 사용하지만 소비자 tsconfig를 별도로 만든다: `strict: true`, `noUncheckedIndexedAccess: true`, `skipLibCheck: false`, `types: []`, `lib: ["ES2022"]`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `noEmit: true`. DOM 없는 최종 Core 계약도 함께 검사한다. 테스트가 생성한 정확한 임시 경로만 finally에서 정리한다.
- [ ] **Step 4: 양성 소비자 작성.** `consumer.ts`는 `comins-table/core`에서 `createCominsTableState`, `queryCominsRows`, `setCominsSortModel`, `CominsTableState`를 import한다. `Row = { id: string; score: number }`, 문자열 label 컬럼, ID callback으로 state를 만들고 조회 결과를 `Row[]`에 대입한다. renderer/JSX/DOM shim/React ambient module은 사용하지 않는다. `smoke.mjs`는 같은 패키지 경로를 실제 Node 프로세스에서 import하고 rows 두 건의 ID, `setCominsSortModel` 결과의 정렬 규칙, 입력 rows의 불변성을 assert한다.
- [ ] **Step 5: 검사기 GREEN 및 제품 RED 구분.** Node 검사기 테스트는 모두 통과해야 한다. 새 빌드로 `npm pack --json --pack-destination <이번 실행 임시 디렉터리>`를 수행하고 CLI에 해당 tarball 절대 경로를 전달한다. 타입 검사는 현재 React 선언 결합을 보고할 것으로 예상한다. 실제 진단 파일/심볼과 exit code를 기록하며, 런타임은 실측 결과 그대로 기록한다. 성공 또는 실패를 예상값에 맞추기 위해 assertion을 반전하지 않는다.
- [ ] **Step 6: 원자적 로컬 커밋.** 검사기와 fixture 네 파일을 `test: add isolated public core consumer diagnostics`로 커밋한다. 제품 경계 RED는 완료 보고에 별도 표시한다.

### Task 3: React 호환 타입 및 서브패스 보존 계약

**Files:** 생성 `test/typecheck/core-react-compatibility.tsx`; 수정 `test/core-public-api.test.ts`; Task 1의 이동표에 검증 파일 연결.

**Interfaces:** 루트의 기존 `CominsTableColumn<TData, TValue>`, `CominsTableState<TData>`, `CominsCellComponentPayload<TData, TValue>`, `formatCominsCellValue`, `getCominsCellStyle`를 그대로 소비한다. `/clipboard`와 `/selection`은 Task 1의 진입점별 기준선으로 검사한다. 아직 패키지를 설치하지 않은 repo 타입 fixture에서는 기존 관례대로 `../../src/index`를 사용하며, 실제 배포 타입 검증은 단계 5에서 수행한다.

- [ ] **Step 1: 현재 동작의 양성 타입 fixture 작성.** `CominsTableColumn<Row, number>`에 JSX label, number value를 읽는 formatter, header renderer, CSSProperties style callback을 지정한다. `formatCominsCellValue` 결과가 `React.ReactNode`, `getCominsCellStyle` 결과가 `React.CSSProperties | undefined`에 대입되는지 검사한다. renderer에 전달되는 row ID와 `value`가 올바른 제네릭 타입인지 명시적으로 대입해 확인한다.
- [ ] **Step 2: 음성 타입 assertion 작성.** number value를 string에 대입하는 라인과 잘못된 Row 접근에 각각 `@ts-expect-error`를 붙인다. 타입이 `any`로 넓어지면 unused directive로 실패해야 한다. fixture 작성 시 일시적으로 directive를 제거해 실제 오류가 나는지 확인한 뒤 복원한다.
- [ ] **Step 3: 이동 누락 검사 추가.** `keeps react-only core exports available at root`는 Task 1에서 `react-only`로 분류한 모든 심볼이 현재 루트 inventory에도 있는지 검사한다. 테스트 파일 내부의 `findMissingRootExports(coreDisposition, rootExports): string[]`가 누락 이름을 반환하도록 하고, `getCominsCellStyle`을 제거한 합성 루트 목록에서 결과가 `["getCominsCellStyle"]`인지 검사한다. 실제 목록에서는 `[]`여야 한다. `/clipboard`와 `/selection`의 심볼은 독립 배열로 비교하고 루트 목록과 합쳐 누락을 숨기지 않는다.
- [ ] **Step 4: GREEN 확인.** `npm run lint`와 `npm run test:run -- test/core-public-api.test.ts test/core-isolation.test.ts test/documentation-contract.test.ts`를 실행한다. 기존 내부 모델 격리 테스트와 루트 React 계약이 함께 통과해야 한다.
- [ ] **Step 5: 원자적 로컬 커밋.** 이 작업의 fixture·테스트·이동표 변경을 `test: preserve React contracts during core migration`으로 커밋한다.

### Task 4: 명령 연결과 단계 3·4 인계

**Files:** 수정 `package.json`, 실행일의 `reports/YYYY-MM-DD.md`, 이동표 문서.

**Interfaces:** `test:core-boundary-checker = node --test test/core-boundary-checker.node.mjs`; `test:core-consumer = node scripts/check-core-boundary.mjs`. 후자는 이미 빌드한 tarball 경로를 `npm run test:core-consumer -- <tarball.tgz>`로 받는다.

- [ ] **Step 1: 명령 등록.** `verify`의 기존 검사 순서를 보존하고 `test:core-boundary-checker`를 추가한다. 아직 RED인 제품 검사 `test:core-consumer`는 독립 명령으로 등록한다. 기존 테스트를 skip/expected-failure 처리하지 않는다. 기본 verify가 통과해도 `/core`가 독립적이라고 보고하지 않는다.
- [ ] **Step 2: 검증 실행.** `npm run verify`를 한 번 실행한다. 생성된 최신 dist를 임시 디렉터리에 pack하고 `test:core-consumer`를 실행한다. 일반 게이트와 제품 경계 검사 결과를 별도로 기록한다. 새 변경이 UI/scroll/virtualization 동작에 없으므로 이 단계의 E2E·성능 전체 실행은 필요하지 않다.
- [ ] **Step 3: 인계 문서 작성.** 실제 React/DOM 의존 경로, 각 경로가 영향을 주는 public symbol, Task 1의 분류, 후속 소유 계층, 해당 실패를 GREEN으로 만들 검증을 연결한다. 예: `core → react-types → ReactNode`는 column/state 모델 분리와 루트 호환 export에서 해결한다. 소스에서 확인한 `core → react-types → filtering → core` 순환 타입 참조도 이전 대상에 포함하되, 실제 소비자 진단과 소스 분석 결과를 구분해 기록한다.
- [ ] **Step 4: 완료 상태 검토.** 모든 현재 Core 심볼에 이동 분류가 있고, checker의 정상/오염 fixture가 통과하며, 실제 패키지 경계 실패 원인이 기록됐는지 확인한다. 예상하지 못한 컴파일러 실행 오류나 누락 artifact는 제품 RED 증거로 인정하지 않는다. Task 3 React 타입 fixture와 기존 검사 통과를 확인한다.
- [ ] **Step 5: 로컬 커밋과 상태 확인.** 이 작업의 파일만 stage하고 `chore: wire core boundary validation commands`로 커밋한다. `git diff --check`, `git status --short --branch`로 남은 변경을 확인한다. 원격 작업은 포함하지 않는다.

## 후속 단계 연결과 최종 게이트

| 상위 설계 단계 | 이 계획이 제공하는 입력 | 후속 완료 조건 |
| --- | --- | --- |
| 3. Core 상태·모델 | 심볼별 이동표, 소비자 fixture, 실제 타입 진단 | 프레임워크 중립 column/state 및 데이터 callback 계약으로 소비자 타입 검사가 GREEN |
| 4. React 어댑터 | 루트 타입 fixture, renderer/style 함수 이동 목록 | JSX label·renderer·callback 타입과 UI 동작 보존, Core의 React 역참조 제거 |
| 5. 공개 산출물·문서 | tarball 검사기, 진입점별 기준선 | 승인된 이동표에 맞춰 Core inventory만 전환하고 루트 API 유지, 영문·한글 마이그레이션과 양쪽 소비자 통과 |
| 6. 릴리스 준비 | 검증 명령과 기록 | 제품 경계 검사를 필수 게이트에 편입하고 최종 `verify:full` 및 React/Core 소비자 검증 통과 |

단계 3·4는 연결된 계약을 바꾸므로 상세 구현 계획을 함께 작성한다. 이 단계에서 JSX label을 단순 문자열로 바꾸거나 guard callback을 삭제하는 우회는 허용하지 않는다. 제품 격리 검사가 GREEN이 된 후에는 해당 검사 명령을 필수 검증 흐름에 연결해 다시 React 결합이 생기는 것을 차단한다.

## 자체 검토 결과

- 설계의 단계 2 네 항목은 Task 1~4에 대응한다. 단계 3~6은 이번 구현 범위에서 제외하고 인계 입력과 완료 조건을 명시했다.
- 기존 1단계의 내부 격리 검증과 이번 공개 패키지 검증을 구분했다.
- 타입과 런타임 실패를 구분하고, 기대하는 실패를 릴리스 통과로 오인하지 않도록 독립 명령과 exit code를 정의했다.
- 신규 제품 API나 Vue/패키지 토폴로지를 이 계획에서 임의 확정하지 않았다. 공개 타입 이동 정책은 승인된 설계에 따른다.
- 구현 방식은 인터페이스 의존도가 높은 네 작업을 현재 세션에서 순차 실행하는 방식을 권장한다. 추가 브랜치는 필요하지 않다.
