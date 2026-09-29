# Core Public Boundary Phase Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 현재 브랜치에서 순차 실행하며, 별도 브랜치나 worktree를 생성하지 않는다.

**Goal:** 0.2.0 Core 분리에 앞서 내부 기능 경계를 조사하고, 공개 심볼의 이동 계약, React/DOM 없는 Core 검사, 기존 React 호환성 기준을 고정한다.

**Architecture:** 기존 공개 API는 이 단계에서 유지한다. 현재 export 목록을 기준선으로 저장하고, 로컬 tarball을 격리된 소비자에 풀어 런타임과 선언 파일을 별도로 검사한다. 미해결 Core 경계는 명시적인 독립 검사에서 실패로 보고하며, 상태·컬럼 모델 및 React 어댑터의 실제 전환은 설계 단계 3·4에서 수행한다.

**Tech Stack:** 기존 TypeScript 7, `typescript/unstable/sync`, Node.js ESM, Vitest, Vite. 의존성 추가 없음.

**Spec:** [Core 플랫폼 경계 설계](../specs/2026-09-29-core-platform-boundary-design.md)

**Boundary evidence:** [선행 경계 조사](../specs/2026-09-29-core-boundary-research.md). Task 0~4 완료. 계약·진단 단계의 완료이며 실제 Core 분리 구현은 상위 단계 3·4에 남아 있다. 검증은 `reports/2026-09-29.md`에 기록한다.

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
- 기능 소유권은 Core / Browser / React로 구분하고 React → Browser/Core, Browser → Core 의존만 허용한다. 공개 facade와 패키지 구조는 유지한다.
- 기존 모드 조합·callback 순서·ID/좌표 의미·변경 원자성을 보존한다. 새 store, Vue scaffold, SSR 지원, 기능 조합 확대는 포함하지 않는다.

## Review Focus

1. 개발 저장소의 React 타입이 소비자 검사에 유입되어 거짓 성공하는 경우 — Task 2에서 격리와 `skipLibCheck: false`를 검사한다.
2. `core.d.ts`의 간접 재수출에만 React가 남는 경우 — Task 2에서 간접 의존 fixture가 반드시 실패하는지 검사한다.
3. export 이름은 같지만 React renderer의 제네릭과 반환 타입이 손상되는 경우 — Task 3의 루트 타입 fixture로 검증한다.
4. 빌드된 Core의 공유 chunk 또는 지연 import가 React를 불러오는 경우 — Task 2에서 source/runtime graph와 실제 Node import를 각각 검사한다.
5. `/core` 심볼 이동 중 루트·clipboard·selection 공개 API가 누락되는 경우 — Task 1·3에서 진입점별 전체 목록과 이동 목적지를 검사한다.

## 확인된 기준선과 계획 범위

초기 API 조사 기준 커밋: `6ffacb1`. 경계 보강 기준 커밋: `930b64b` (이 사이 제품 코드 변경 없음). 작업 트리는 경계 조사 시작 시 clean이었다.

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
| `index.tsx`의 state effect/notifyChanges/projection | 공개 Core 밖에 공통 규칙이 남아 있음 | B1~B3 내부 계약과 현재 모드 조합을 별도 추적 |
| `viewport-data.ts`의 `AbortSignal` | React와 무관한 환경 타입도 Core 타입 closure에 유입 | Core descriptor/실행 요청 분리, 루트 signal 계약 보존 |
| `table-transfer.ts` | HTMLElement 등록과 데이터 이동이 혼재 | 데이터 충돌 처리 / DOM 등록 / feedback renderer 분리 |

위 항목은 소스 및 export 수집 결과다. Task 2의 실제 tarball 검사에서 타입·source graph는 React/DOM 결합으로 실패했고 Node 런타임·runtime graph는 통과했다. unresolved는 없으며, 상세 진단은 실행 리포트에 기록했다.

이 계획은 상위 설계의 **단계 2만 실행 가능한 작업으로 상세화**한다. 단계 3~6의 상태 모델 이전, React 동작 변경, 공개 문서 전환, 전체 릴리스 검증은 아래 인계 조건으로 연결한다.

## 파일 책임

| 파일 | 작업 | 책임 |
| --- | --- | --- |
| `docs/superpowers/specs/2026-09-29-core-boundary-research.md` | 작성 완료 | B1~B9 근거·책임·모드·좌표·구조·검증 연결 |
| `test/fixtures/core-boundary-map.json` | 생성 예정 | 공개 API와 별개인 내부 기능 소유권 및 이전 추적 |
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

### Task 0: 선행 기능 경계 조사 — 문서 반영 완료

**Files:** 경계 조사 문서, 상위 설계, 이 계획.

**Interfaces:** 후속 작업은 조사 문서의 안정된 기능 ID `B1`~`B9`를 사용한다. 조사 근거, 기존 계약, 목표 소유권, 구현 시 검증할 위치를 연결하며 새로운 공개 함수 signature는 단계 3·4에서 확정한다.

- [x] state reconciliation, callback 통지, projection, renderer/집계, 편집, 요청, transfer, 입력, 높이/캐시의 source와 기존 테스트 assertion 조사.
- [x] Flat/Filtered/Grouped/Tree/Viewport 지원 조합 및 row ID/원본/표시/절대/slot 좌표 계약 기록.
- [x] Core/Browser/React 내부 구조와 의존 방향, AbortSignal 호환 경계 기록.
- [x] 공개 API 외 내부 기능 inventory 및 source/runtime graph 검사를 Task 1~4에 반영.

조사에서 테스트를 실행한 것은 아니다. Task 0 체크는 문서 산출물 완료만 의미하며 제품 독립성은 Task 2 이후 증거로 판정한다.

### Task 1: 공개 API 기준선과 이동 분류 고정 — 완료

**Files:** 생성 `test/fixtures/core-public-api-baseline.json`, `test/fixtures/core-boundary-map.json`, `test/core-public-api.test.ts`, `docs/superpowers/specs/2026-09-29-core-public-api-migration.md`.

**Interfaces:** 기존 `loadDocumentationManifest(root)`와 `collectDocumentationContractEvidence(root, manifest)`를 `scripts/check-documentation-contract.mjs`에서 사용한다. 새 JSON은 `{ baselineCommit, entrypoints, coreDisposition }`이며, `entrypoints`는 각 specifier의 정렬된 `string[]`, `coreDisposition`은 모든 Core 심볼을 키로 갖는 `{ kind, target, reason }` 레코드다. `kind`는 `retain-core`, `split-contract`, `react-only` 중 하나다. `target`은 `comins-table/core` 또는 `comins-table`이다.

추가 `core-boundary-map.json`은 `{ baselineCommit, areas }`다. `areas`는 B1~B9를 key로, `{ sources: string[], targetLayers: ("core" | "browser" | "react")[], invariants: string[], existingTests: string[], plannedTests: string[], implementationStage: "3" | "4" | "3+4" }`를 값으로 갖는다. 현재 존재하는 경로와 후속 생성할 테스트를 분리한다. 공개 심볼 목록에 없는 기능도 이 목록에는 포함한다.

- [x] **Step 1: 기준선 검증 테스트 작성.** `preserves every public entrypoint`에서 package exports key가 정확히 `[".", "./clipboard", "./core", "./selection", "./styles.css"]`인지 검사한다. `matches all baseline symbols`에서 네 JS/타입 진입점의 정렬된 목록이 JSON과 일치하는지 검사한다. `classifies every core symbol exactly once`에서 `Object.keys(coreDisposition).sort()`가 Core 목록과 같은지, 빈 reason/알 수 없는 kind가 없는지 검사한다.
- [x] **Step 2: RED 확인.** `npm run test:run -- test/core-public-api.test.ts`를 실행한다. 새 기준선 파일 부재로 실패해야 하며, 기존 도구의 import 오류라면 테스트 준비 문제를 먼저 수정한다.
- [x] **Step 2a: 내부 경계 coverage 테스트.** `covers all nine boundary areas`는 B1~B9의 정확한 key 집합, 비어 있지 않은 계약/계층, sources/existingTests의 파일 존재를 검사한다. 합성 입력에서 B6을 제거하면 누락으로 실패해야 한다. 모든 `src` 구현 파일이 sources에 포함되거나 공개 facade로 명시되어야 하며, runtime graph 검사 대상과 미래 이전 대상은 혼동하지 않는다.
- [x] **Step 3: 기준선과 이동표 작성.** 조사 기준 커밋의 전체 이름 목록을 기존 checker로 수집한다. 모든 심볼을 아래 분류에 따라 한 번씩 배정하고, 문서에 `이전 import → 목표 import → 계약 변경 → 검증 위치`를 심볼별로 기록한다. Task 0 조사에서 B1~B9의 파일·계약·기존/추가 테스트를 `core-boundary-map.json`에 옮기고 전체 src 파일의 소유권을 연결한다. 공개 facade도 대응하는 영역의 sources에 포함한다. 테스트 실행 시 기준선을 자동 갱신하지 않는다.

| 대상 | 분류와 목표 계약 |
| --- | --- |
| `model.ts`의 row ID, selection, sort, layout, clipboard 데이터 및 순수 함수 | `retain-core`; 현재 이름과 데이터 의미 유지 |
| `CominsTableColumn`, `CominsTableColumnGroup`, runtime column, state/input, header cell | `split-contract`; `/core`는 데이터/배치 계약, 루트는 기존 React label·renderer 계약 유지 |
| `CominsCellFormatParams`, `CominsColumnValueResolver`, component payload, `CominsClipboardGuard` | `split-contract`; 순수 데이터 callback과 React 렌더링 payload를 분리하고 row/value 제네릭 유지 |
| `CominsTableTheme`, `CominsColumnProps`, `CominsTableCellConfig`, `CominsTableHeaderConfig`, component/menu/options/virtual-list 렌더링 타입 | `react-only`; 루트의 기존 이름 유지. copyable/pasteable/disabled/parseClipboard/validateFill의 순수 데이터 계약은 후속 Core 모델에서 별도 보존 |
| `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, `setCominsTableTheme` | `react-only`; 루트에서 현재 함수 계약 유지. Core 내부 상태·clipboard에서 호출하는 경로도 단계 3·4 이전 목록에 포함 |
| `isCominsCellDisabled`와 clipboard/fill 함수 | `split-contract`; 데이터 변경 허용 규칙은 Core에 유지하며 React props 해석은 어댑터에서 연결 |

`split-contract`는 타입명을 일괄 삭제하거나 `any`/`unknown`으로 치환한다는 뜻이 아니다. 단계 3에서 사용할 구체 모델 선언은 이 이동표와 기존 필드 사용처를 근거로 설계하며, 루트의 기존 이름과 `/core`의 데이터 이름이 충돌하면 루트의 명시적 export로 해결한다. 이름을 새로 추가할 경우 그 단계의 API inventory와 문서 계약을 함께 갱신한다.

- [x] **Step 4: GREEN 확인.** Step 2 명령과 `npm run check:docs`를 실행한다. 네 진입점의 모든 이름과 Core 130개 분류에 누락이 없어야 한다. `split-contract` 심볼의 구현이 완료됐다고 표시하지 않는다.
- [x] **Step 5: 원자적 로컬 커밋.** 이 작업의 네 파일과 계획 체크리스트·실행 리포트를 stage하고 `test: pin public core API migration inventory`로 커밋한다.

### Task 2: React 없는 공개 패키지 소비자 검사기 — 완료

**Files:** 생성 `scripts/check-core-boundary.mjs`, `test/core-boundary-checker.node.mjs`, `test/fixtures/core-public-consumer/consumer.ts`, `test/fixtures/core-public-consumer/smoke.mjs`.

**Interfaces:** 검사기는 `checkCoreBoundary({ packageRoot, compilerPath, fixtureRoot }): Promise<{ types: { ok: boolean, diagnostics: string }, runtime: { ok: boolean, diagnostics: string } }>`를 export한다. `packageRoot`는 압축이 해제된 패키지 디렉터리다. CLI는 `node scripts/check-core-boundary.mjs <tarball.tgz>`이며 모든 검사 성공은 exit 0, 실제 경계 위반은 exit 1, 파일/컴파일러/압축 도구 누락 같은 실행 준비 오류는 exit 2다. 함수 import만으로 CLI나 빌드를 실행하지 않는다.

같은 파일에서 `inspectCoreGraph({ root, entries, mode }): { ok: boolean, violations: string[], unresolved: string[] }`도 export한다. `mode`는 `source` 또는 `runtime`, entries는 root 상대 경로의 `string[]`다. source는 type/value import·re-export·literal dynamic import를 추적하고, runtime은 패키지 exports의 실제 Core JS target에서 공유 chunk·literal dynamic import를 추적한다. React/React DOM/JSX runtime 및 Core에서 Browser/React 내부 계층으로의 참조는 위반이다. source는 기존 TypeScript checker 경로 해석을 사용하고, runtime은 package exports/상대 파일을 기준으로 해석한다. 외부/계산된 경로를 증명할 수 없으면 unresolved로 기록하며 무시하지 않는다.

CLI는 tarball의 타입/실행 검사와 runtime graph를 항상 수행하고, `--source-root <repo>`가 주어지면 `src/core.ts`에서 source graph도 검사한다. graph 위반은 exit 1, unresolved는 exit 2이며, 요청한 검사 모두가 성공해야 exit 0이다. source 검사를 생략한 소비자 실행은 source PASS로 기록하지 않는다.

- [x] **Step 1: 검사기의 RED 테스트 작성.** Node test fixture로 `accepts an isolated pure package`, `rejects transitive React declarations`, `rejects a React import in a shared runtime chunk`, `reports missing artifact as setup error`, `cleans its own temporary directory`를 작성한다. 순수 fixture는 타입·런타임 모두 `ok: true`; `.d.ts → bridge.d.ts → react` fixture는 types false; `.js → chunk.js → react/jsx-runtime` fixture는 runtime false여야 한다. 오류를 빈 diagnostics 또는 성공으로 바꾸지 않는다.
- [x] **Step 2: RED 확인.** `node --test test/core-boundary-checker.node.mjs`를 실행해 새 검사기 부재로 실패하는지 확인한다.
- [x] **Step 2a: graph 검사 회귀 fixture.** `rejects React in an uncalled lazy chunk`, `rejects a Core to Browser type-only re-export`, `reports computed imports as unresolved`를 추가한다. 함수 호출 없이 Node import가 성공하는 지연 React fixture도 graph는 violations를 반환해야 한다. 정상 내부 순환 import는 visited set으로 종료하고 금지 의존이 없으면 통과해야 한다.
- [x] **Step 3: 격리 검사 구현.** `mkdtemp`로 생성한 OS 임시 디렉터리에 패키지를 복사하고 `node_modules/comins-table` 경로에서 실제 package exports를 해석한다. 소비자 디렉터리에서 `react`, `react-dom`, `@types/react`, `@types/react-dom`을 찾을 수 없음을 먼저 확인한다. repo를 symlink하지 않고 `NODE_PATH`를 제거한다. npm install을 실행하지 않는다. compiler는 repo의 절대 경로를 사용하지만 소비자 tsconfig를 별도로 만든다: `strict: true`, `noUncheckedIndexedAccess: true`, `skipLibCheck: false`, `types: []`, `lib: ["ES2022"]`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `noEmit: true`. DOM 없는 최종 Core 계약도 함께 검사한다. 테스트가 생성한 정확한 임시 경로만 finally에서 정리한다.
- [x] **Step 4: 양성 소비자 작성.** `consumer.ts`는 `comins-table/core`에서 `createCominsTableState`, `queryCominsRows`, `setCominsSortModel`, `CominsTableState`를 import한다. `Row = { id: string; score: number }`, 문자열 label 컬럼, ID callback으로 state를 만들고 조회 결과를 `Row[]`에 대입한다. renderer/JSX/DOM shim/React ambient module은 사용하지 않는다. `smoke.mjs`는 같은 패키지 경로를 실제 Node 프로세스에서 import하고 rows 두 건의 ID, `setCominsSortModel` 결과의 정렬 규칙, 입력 rows의 불변성을 assert한다.
- [x] **Step 4a: 환경 타입 및 호환 취소 조건.** 합성 순수 package의 선언에 `AbortSignal`만 추가한 fixture는 ES2022-only 타입 검사에서 실패해야 한다. 현재 Core에서 아직 노출하지 않는 Viewport 모듈의 독립성은 이 fixture 통과로 주장하지 않는다. 실제 request descriptor/cancel 변환은 단계 3·4에서 구현하고, 루트의 기존 signal 포함 요청과 취소 reducer 경로를 함께 테스트한다.
- [x] **Step 5: 검사기 GREEN 및 제품 RED 구분.** Node 검사기 테스트는 모두 통과해야 한다. 새 빌드로 `npm pack --json --pack-destination <이번 실행 임시 디렉터리>`를 수행하고 CLI에 해당 tarball 절대 경로를 전달한다. 타입 검사는 현재 React 선언 결합을 보고할 것으로 예상한다. 실제 진단 파일/심볼과 exit code를 기록하며, 런타임은 실측 결과 그대로 기록한다. 성공 또는 실패를 예상값에 맞추기 위해 assertion을 반전하지 않는다.

이 실행에는 `--source-root <현재 저장소 절대 경로>`도 전달하고 source graph/type/runtime graph/runtime 결과를 각각 기록한다. 기존 혼합 모듈의 React 결합을 임시 allowlist로 통과시키지 않는다.
- [x] **Step 6: 원자적 로컬 커밋.** 검사기와 fixture 네 파일을 `test: add isolated public core consumer diagnostics`로 커밋한다. 제품 경계 RED는 완료 보고에 별도 표시한다.

Task 2 보강: 실제 Node 조건부 export 해석 결과를 runtime graph 시작점으로 사용한다. 선언 파일의 triple-slash 지시자가 DOM lib를 추가할 수 있으므로 `tsc --listFiles`의 실제 closure도 검사한다. 명시적 `./core.types` 파일이 누락되면 setup exit 2로 판정한다. 현재 패키지의 단일 문자열 types export를 지원하며, 다른 types 조건 구조는 추측하지 않고 setup 오류로 중단한다. 검사기는 신뢰하는 로컬 패키지 전용 진단 도구이며 악성 코드 실행 sandbox가 아니다.

### Task 3: React 호환 타입 및 서브패스 보존 계약 — 완료

**Files:** 생성 `test/typecheck/core-react-compatibility.tsx`; 수정 `test/core-public-api.test.ts`; Task 1의 이동표에 검증 파일 연결.

**Interfaces:** 루트의 기존 `CominsTableColumn<TData, TValue>`, `CominsTableState<TData>`, `CominsCellComponentPayload<TData, TValue>`, `formatCominsCellValue`, `getCominsCellStyle`를 그대로 소비한다. `/clipboard`와 `/selection`은 Task 1의 진입점별 기준선으로 검사한다. 아직 패키지를 설치하지 않은 repo 타입 fixture에서는 기존 관례대로 `../../src/index`를 사용하며, 실제 배포 타입 검증은 단계 5에서 수행한다.

- [x] **Step 1: 현재 동작의 양성 타입 fixture 작성.** `CominsTableColumn<Row, number>`에 JSX label, number value를 읽는 formatter, header renderer, CSSProperties style callback을 지정한다. `formatCominsCellValue` 결과가 `React.ReactNode`, `getCominsCellStyle` 결과가 `React.CSSProperties | undefined`에 대입되는지 검사한다. renderer에 전달되는 row ID와 `value`가 올바른 제네릭 타입인지 명시적으로 대입해 확인한다.
- [x] **Step 2: 음성 타입 assertion 작성.** number value를 string에 대입하는 라인과 잘못된 Row 접근에 각각 `@ts-expect-error`를 붙인다. 타입이 `any`로 넓어지면 unused directive로 실패해야 한다. fixture 작성 시 일시적으로 directive를 제거해 실제 오류가 나는지 확인한 뒤 복원한다.
- [x] **Step 3: 이동 누락 검사 추가.** `keeps react-only core exports available at root`는 Task 1에서 `react-only`로 분류한 모든 심볼이 현재 루트 inventory에도 있는지 검사한다. 테스트 파일 내부의 `findMissingRootExports(coreDisposition, rootExports): string[]`가 누락 이름을 반환하도록 하고, `getCominsCellStyle`을 제거한 합성 루트 목록에서 결과가 `["getCominsCellStyle"]`인지 검사한다. 실제 목록에서는 `[]`여야 한다. `/clipboard`와 `/selection`의 심볼은 독립 배열로 비교하고 루트 목록과 합쳐 누락을 숨기지 않는다.
- [x] **Step 4: GREEN 확인.** `npm run lint`와 `npm run test:run -- test/core-public-api.test.ts test/core-isolation.test.ts test/documentation-contract.test.ts`를 실행한다. 기존 내부 모델 격리 테스트와 루트 React 계약이 함께 통과해야 한다.
- [x] **Step 4a: 동작 인계 fixture 사양 고정.** migration 문서와 boundary map에 다음 입력/기대 결과를 기록한다: 동일 data의 컬럼 옵션 변경은 편집 rows 유지(B1); 복합 변경 통지는 data→selection→layout→sort→sortModel 순서(B2); 필터+그룹은 그룹 순서 유지/그룹 내부 정렬/접힌 행 제외(B3); 숫자 1과 문자열 "1"의 slot 구분(B9); pending 응답보다 최신 로컬 편집 유지(B6); Fill 검증 예외와 그룹 이동 충돌은 부분 결과 미반영(B5/B7). 이는 단계 3·4의 characterization test 사양이며, 2단계에 존재하지 않는 테스트를 통과로 표시하지 않는다.
- [x] **Step 5: 원자적 로컬 커밋.** 이 작업의 fixture·테스트·이동표 변경을 `test: preserve React contracts during core migration`으로 커밋한다.

### Task 4: 명령 연결과 단계 3·4 인계 — 완료

**Files:** 수정 `package.json`, 실행일의 `reports/YYYY-MM-DD.md`, 이동표 문서.

**Interfaces:** `test:core-boundary-checker = node --test test/core-boundary-checker.node.mjs`; `test:core-consumer = node scripts/check-core-boundary.mjs`. 후자는 이미 빌드한 tarball 경로를 `npm run test:core-consumer -- <tarball.tgz>`로 받는다.

- [x] **Step 1: 명령 등록.** `verify`의 기존 검사 순서를 보존하고 `test:core-boundary-checker`를 추가한다. 아직 RED인 제품 검사 `test:core-consumer`는 독립 명령으로 등록한다. 기존 테스트를 skip/expected-failure 처리하지 않는다. 기본 verify가 통과해도 `/core`가 독립적이라고 보고하지 않는다.
- [x] **Step 2: 검증 실행.** `npm run verify`를 한 번 실행한다. 생성된 최신 dist를 임시 디렉터리에 pack하고 `test:core-consumer`를 실행한다. 일반 게이트와 제품 경계 검사 결과를 별도로 기록한다. 새 변경이 UI/scroll/virtualization 동작에 없으므로 이 단계의 E2E·성능 전체 실행은 필요하지 않다.
- [x] **Step 3: 인계 문서 작성.** 실제 React/DOM 의존 경로, 각 경로가 영향을 주는 public symbol, Task 1의 분류, 후속 소유 계층, 해당 실패를 GREEN으로 만들 검증을 연결한다. 예: `core → react-types → ReactNode`는 column/state 모델 분리와 루트 호환 export에서 해결한다. 소스에서 확인한 `core → react-types → filtering → core` 순환 타입 참조도 이전 대상에 포함하되, 실제 소비자 진단과 소스 분석 결과를 구분해 기록한다.
- [x] **Step 4: 완료 상태 검토.** 모든 현재 Core 심볼과 B1~B9 내부 영역에 이동 분류가 있고, checker의 정상/오염/지연 import/환경 타입 fixture가 통과하며, 실제 패키지 경계 실패 원인이 기록됐는지 확인한다. unresolved graph와 컴파일러 실행 오류, 누락 artifact는 제품 RED 증거로 인정하지 않는다. Task 3 React 타입 fixture와 기존 검사 통과를 확인한다. 실제 Core 독립성 완료와는 구분한다.
- [x] **Step 5: 로컬 커밋과 상태 확인.** 이 작업의 파일만 stage하고 `chore: wire core boundary validation commands`로 커밋한다. `git diff --check`, `git status --short --branch`로 남은 변경을 확인한다. 원격 작업은 포함하지 않는다.

## 후속 단계 연결과 최종 게이트

| 상위 설계 단계 | 이 계획이 제공하는 입력 | 후속 완료 조건 |
| --- | --- | --- |
| 3. Core 상태·모델 | 심볼별 이동표, B1~B9, 모드/좌표 계약, 소비자 fixture | column/state/projection/요청 descriptor와 데이터 callback 독립성, Core 전이 의존 검사 GREEN |
| 4. Browser·React 어댑터 | 루트 타입 fixture, renderer/style 이동, 취소·등록·통지 계약 | Browser 실행과 React lifecycle 분리, JSX·signal·callback 및 모드별 동작 보존 |
| 5. 공개 산출물·문서 | tarball 검사기, 진입점별 기준선 | 승인된 이동표에 맞춰 Core inventory만 전환하고 루트 API 유지, 영문·한글 마이그레이션과 양쪽 소비자 통과 |
| 6. 릴리스 준비 | 검증 명령과 기록 | 제품 경계 검사를 필수 게이트에 편입하고 최종 `verify:full` 및 React/Core 소비자 검증 통과 |

단계 3·4는 연결된 계약을 바꾸므로 상세 구현 계획을 함께 작성한다. 이 단계에서 JSX label을 단순 문자열로 바꾸거나 guard callback을 삭제하는 우회는 허용하지 않는다. 제품 격리 검사가 GREEN이 된 후에는 해당 검사 명령을 필수 검증 흐름에 연결해 다시 React 결합이 생기는 것을 차단한다.

후속 [Core 모델·어댑터 통합 구현 계획](2026-09-29-core-model-adapter-transition.md)의 Task 1을 완료했다. 기존 브랜치에서 중립 기본 연산과 React 호환 bridge를 연결했으며, 다음은 Task 2 편집 정책 분리다. 공개 `/core`의 중립 facade 전환은 아직 수행하지 않았다.

## 자체 검토 결과

- 승인된 선행 조사 Task 0, 기준선 Task 1, 격리 검사기 Task 2, React 호환 계약 Task 3, 명령 연결·최종 검토 Task 4를 완료했으며 단계 3~6의 인계 입력과 완료 조건을 연결했다.
- 기존 1단계의 내부 격리 검증과 이번 공개 패키지 검증을 구분했다.
- 타입과 런타임 실패를 구분하고, 기대하는 실패를 릴리스 통과로 오인하지 않도록 독립 명령과 exit code를 정의했다.
- 신규 제품 API나 Vue/패키지 토폴로지를 이 계획에서 임의 확정하지 않았다. 공개 타입 이동 정책은 승인된 설계에 따른다.
- 구현 방식은 인터페이스 의존도가 높은 네 작업을 현재 세션에서 순차 실행하는 방식을 권장한다. 추가 브랜치는 필요하지 않다.
