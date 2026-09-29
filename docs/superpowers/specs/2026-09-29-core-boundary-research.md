# 0.2.0 Core 경계 선행 조사

조사일: 2026-09-29. 기준 커밋: `930b64b`. 사용자가 승인한 경계 보강을 반영한 2단계 Task 0의 산출물이다. 소스와 기존 테스트의 assertion을 읽어 확인했으며, 이번 조사에서 제품 테스트나 소비자 빌드를 실행하지 않았다. 아래 목표 경계는 구현 완료를 의미하지 않는다.

## 1. 결론과 책임 경계

공개 `/core` 130개 심볼의 분류만으로 0.2.0 Core 분리를 완료할 수 없다. `index.tsx` 내부의 상태 조정과 표시 행 계산, 별도 모듈의 집계·요청·이동 정책도 조사·이전 대상으로 포함한다.

- Core: 데이터 계약, 상태 전이, 파생 행·레이아웃 계산, 요청 및 이동 정책. React와 DOM 실행 계층을 참조하지 않는다.
- Browser: DOM 측정, focus/scroll, clipboard I/O, timer/frame/observer, 요청 실행·취소와 등록 해제. React를 참조하지 않는다.
- React: JSX·컴포넌트·훅·React 이벤트, 렌더러 타입, Core 결과를 기존 callback에 연결하는 호환 계층.
- Application: 원본 데이터와 저장/API 접근 정책. Core가 네트워크나 애플리케이션 데이터 저장을 임의로 소유하지 않는다.

Core 계산이 모두 무상태 함수일 필요는 없다. 높이 인덱스 같은 기존 자료구조는 인스턴스 단위의 명시적인 갱신·복제·무효화 계약을 유지한다. 새 전역 store, 플러그인 엔진, 일괄 이벤트 버스는 추가하지 않는다.

## 2. 기능별 근거·목표·검증 연결

아래 source 위치는 기준 커밋의 탐색 지점이다. 후속 파일 이동 시 함수 이름과 테스트를 기준으로 추적한다.

| ID | 확인한 소스 및 현재 동작 | 목표 책임 | 보존할 검증 |
| --- | --- | --- | --- |
| B1 상태 조정 | `index.tsx:2072`의 effect: 새 data는 authoritative, 동일 data의 옵션 변경은 로컬 rows 유지. 컬럼 순서 이력과 선택을 조정 | 조정 계산은 Core; state/ref/effect 적용은 React | `test/table-interaction.test.tsx`, `test/table-calculations.test.ts`의 관련 assertion을 확인하고 옵션 변경/데이터 교체/선택 조정 회귀를 연결 |
| B2 변경 통지 | `index.tsx:2447`의 notifyChanges/commitState: data → selection → columnLayout → sort → sortModel 순서. 변경 감지는 참조·비교 함수·명시 플래그가 혼합 | Core가 다음 상태와 변경 내역을 계산하고 React가 기존 순서로 통지 | 기존 interaction 테스트에 복합 변경 통지 순서·동일 입력 무통지 assertion을 보강할 위치 지정. 새 callback API를 추가하지 않음 |
| B3 표시 행 | `index.tsx:2633`, `:2718`, `:2924`, `:3038`, `:3285`: 필터/집계/그룹/정렬/펼침/슬롯/가상 범위 계산 | Core의 모드별 projection. 기존 지원 조합과 페이지/가상화 분기를 보존 | `filtering.test.ts`, `grouping.test.ts`, `tree-core.test.ts`, `virtual-layout.test.ts`; 조합 결과는 단계 3에서 framework-free fixture 추가 |
| B4 데이터와 렌더링 | `react-types.ts`, `grouping.ts`, `summary.ts`의 label/format/style/aggregate 반환에 React 타입 | 값·집계·배치 계약은 Core, JSX label·formatter·CSS는 React | `summary-core.test.ts`, `grouping.test.ts`, `typecheck/component-renderer-api.tsx`; custom aggregate가 ReactNode를 반환하는 기존 루트 계약도 보존 |
| B5 편집/clipboard | `core.ts:678`, `:1912`, `:1932`, `:1958`: props에 guard 결합, 파싱/Fill 검증 완료 후 결과 반환 | guard·parse·validate·행 변경은 Core, props 해석과 오류 UI/clipboard I/O는 어댑터 | `clipboard-edit-core.test.ts`, `clipboard-edit-table.test.tsx`; 보호 셀 위치·예외 시 원자성·no-op 참조 보존 |
| B6 요청 | `viewport-data.ts`, `viewport-requests.ts`, `use-viewport.ts`, `index.tsx:2000`: revision/requestId/중복 억제/동시 수/재시도/취소 | reducer·필요 범위·요청 정책은 Core; signal·Promise·effect 연결은 실행/React 계층 | `viewport-data.test.ts`, `viewport-table.test.tsx`; 오래된 응답·불완전 응답·편집 덮어쓰기 방지·요청 해제 보존 |
| B7 테이블 이동 | `table-transfer.ts:172` DOM snapshot과 `:386`, `:532`의 순수 데이터 이동이 한 모듈에 공존 | 이동·충돌 규칙은 Core; DOM registration은 Browser; feedback renderer는 React | `table-transfer.test.ts`: coordinator 격리, 중복 table ID, 그룹 전체 이동의 원자성, 등록 해제 |
| B8 입력/선택 | `index.tsx:3665`, `:4415`, `:4494`, `tree-drag.tsx`, `cell-fill.tsx`에서 이벤트와 선택·이동 규칙 결합 | 주소/범위/목적지 계산은 Core; 이벤트·포인터 캡처·focus는 Browser/React | `selection-core.test.ts`, `tree-row-drag-core.test.ts`, `table-interaction.test.tsx`; 기존 preventDefault와 중첩 입력 우선권 보존 |
| B9 높이/캐시 | `row-height.ts:11`, `virtual-layout.ts`, `viewport-layout.ts`, `index.tsx:3035`, `:3183`: row 참조·layoutKey·contentRevision·Viewport 설정으로 무효화 | 숫자 기반 계산과 인덱스는 Core; 측정·font/width 이벤트는 Browser | `virtual-layout.test.ts`, `viewport-data.test.ts`: 숫자/문자 ID 구분, 앵커 fallback, sparse height·cache bound |

이미 존재하는 테스트 파일이라는 사실은 이번 실행에서 통과했다는 뜻이 아니다. 통지 순서와 복합 projection의 전용 독립 테스트는 추가 대상이며, 현재 coverage를 완전하다고 판단하지 않는다.

## 3. 지원 모드와 좌표 계약

`src/index.tsx`의 props union과 runtime 분기를 함께 확인했다. 모듈을 공통화하면서 지원 조합을 확대하지 않는다.

| 모드 | 유지할 경계 |
| --- | --- |
| Flat | 정렬/페이지/가상화는 기존 분기를 유지. 가상화 시 비가상 페이지 slice를 무조건 중복 적용하지 않음 |
| Filtered Flat | 필터 후 정렬·집계·선택 조정. row drag, table transfer, lazy/infinite 조합은 현재 금지 계약 유지 |
| Grouped / Filtered Grouped | 그룹 순서 유지, 그룹 안에서 정렬, 펼쳐진 행 projection. pagination/lazy/infinite 제외; 필터 결합 시 row drag/transfer 제한 유지 |
| Tree | 트리 펼침·형제 정렬·트리 이동 사용. flat filter/group/pagination/lazy/infinite/table transfer/row detail과 합치지 않음 |
| Viewport | sparse block과 절대 행 위치 사용, virtualized 경로. pagination/lazy/infinite/summary/group/filter/transfer/detail 제외 |

기존 `CominsRowId = string | number`를 유지하고 `1`과 `"1"`을 일괄 문자열화하여 같은 ID로 취급하지 않는다. 중복 ID 정책은 기능별 기존 동작을 보존한다. 그룹은 첫 중복을 유지하는 테스트가 있고 transfer는 충돌 정책을 갖고 있으므로, 모든 모듈에 새 throw 정책을 일괄 적용하지 않는다.

좌표는 business row ID, 원본 배열 위치, 표시 순서, Viewport 절대 위치, data/group/detail/placeholder 슬롯을 구분한다. 내부 결과에 필요한 좌표를 명시적으로 보관하되, 공개 callback의 기존 `index`/`dataIndex` 의미를 임의 변경하지 않는다. 정렬·필터·숨김 컬럼 이후 clipboard/Fill과 선택은 동일한 표시 순서 입력을 사용해야 한다.

## 4. AbortSignal 및 실행 경계

현재 `CominsViewportRequest.signal: AbortSignal`은 `viewport-data.ts`에 선언되어 있고 reducer도 `signal.aborted`를 읽는다. 이는 React 결합은 아니지만, 계획의 `lib: ["ES2022"]`, `types: []` 소비자에서는 허용하지 않을 환경 타입이다. 현재 `/core`만 import하는 fixture가 이 모듈 전체를 검사한다고 간주하지 않는다.

단계 3·4의 목표 계약:

1. Core 요청 descriptor는 range, retainRange, revision, requestId 등 데이터만 보유한다.
2. 실행 계층에서 descriptor에 실제 AbortSignal을 연결한다. 기존 루트 요청 callback의 signal 지원은 유지한다.
3. 실행 계층은 이미 취소된 요청을 dispatch하지 않으며 cancel 이벤트를 Core에 전달한다. Core는 요청 상태/requestId/revision으로 뒤늦은 응답을 거부한다.
4. 외부 사용자가 현재 루트의 reducer와 signal 포함 요청을 직접 사용하는 경로는 호환 wrapper에서 기존 aborted 동작을 보존한다. reducer 함수 이름만 이동하고 취소 검사를 제거해서는 안 된다.
5. 요청 수 제한·중복 방지·재시도 판단은 Core 정책, AbortController 생성·Promise 실행·이벤트 해제는 실행 계층이다. 신규 네트워크 클라이언트를 추가하지 않는다.

`CominsViewportRequest` 등 공개 이름의 세부 migration과 wrapper signature는 단계 3·4 계획의 산출물이다. 이번에는 위 책임과 호환성 요구를 확정하며, 제품 타입은 변경하지 않는다. DOM 없는 Core는 서버 렌더링 지원을 새로 약속하는 것이 아니다.

## 5. 내부 프로젝트 구조와 이동 원칙

```text
src/
  index.tsx, core.ts, clipboard.ts, selection.ts  # 기존 공개 facade 유지
  core/
    model/ state/ rows/ selection/ editing/
    layout/ viewport/ transfer/                  # 순수 계약·정책·계산
  browser/                                      # 실행·측정·DOM 등록과 해제
  react/                                        # JSX·훅·React 타입·호환 wrapper
```

허용 의존: React → Browser/Core, Browser → Core, Core → Core. 기능 공통화를 진행하는 커밋에서 해당 파일을 이동하며 빈 폴더를 미리 생성하거나 전체 파일을 일괄 이동하지 않는다. 별도 npm 패키지와 `/browser` 공개 export는 추가하지 않는다. Core 내부 모듈을 전부 `/core`에서 export하지 않는다.

현재 파일의 조사 누락을 방지하는 소유권 목록:

| 현재 파일 묶음 | 목표 소유권 |
| --- | --- |
| `model.ts`, `column-layout.ts`, `column-pinning.ts`, `table-state.ts`, `row-value.ts`, `clipboard-text.ts`, `column-pointer.ts`, `drag-autoscroll.ts` | Core. pointer/scroll라는 이름이 있어도 숫자 입력만 사용하는 계산은 Core |
| `tree.ts`, `row-height.ts`, `virtual-layout.ts`, `viewport-layout.ts` | Core 자료구조·계산; 내부 역참조와 선언 closure 검사 |
| `core.ts`, `filtering.ts`, `grouping.ts`, `summary.ts`, `selection-data.ts` | 데이터·규칙 부분은 Core, React payload/formatter 의존은 분리 |
| `viewport-data.ts`, `viewport-requests.ts`, `use-viewport.ts` | Core descriptor/reducer/정책 + 실행 계층 + React hook으로 분리 |
| `table-transfer.ts` | Core 이동/충돌 + Browser 등록 + React feedback으로 분리 |
| `index.tsx`, `tree-drag.tsx`, `cell-fill.tsx` | 내부 순수 규칙은 Core, DOM 실행은 Browser, React lifecycle/이벤트는 React |
| `react-types.ts`, `component-renderer.tsx`, `column-filter.tsx`, `row-detail.tsx`, `tooltip.tsx`, `table-icons.tsx` | React; 재사용할 DOM 실행만 Browser로 추출 |
| `clipboard.ts`, `selection.ts` | 공개 facade 유지; 구현 소유권과 import 경로만 단계적으로 갱신 |

## 6. 2단계 검사 보강과 인계 기준

- 공개 심볼 목록과 별도로 B1~B9 내부 기능 목록을 관리하고 각 항목에 source, 목표 계층, 유지 계약, 검증 파일, 이전 단계(3 또는 4)를 연결한다.
- 현재 혼합 모듈을 갑자기 순수 Core로 표시하지 않는다. 검사 대상은 현재 공개 `/core` closure와 1단계 독립 모듈, 추후 이전이 완료된 Core 모듈이다. 혼합 모듈의 위반은 이전 목록에 명시하며 allowlist로 성공 처리하지 않는다.
- source graph는 type/value import, re-export, literal dynamic import를 추적한다. 패키지 JS graph는 상대 공유 chunk와 literal dynamic import까지 추적한다. 실행하지 않은 지연 import로 React가 숨어 있어도 검출해야 한다.
- 미해석 dynamic import나 export target은 검증 불가로 보고한다. boundary violation과 도구/입력 오류를 구분하고 둘 다 성공으로 처리하지 않는다.
- 타입 검사는 실제 패키지 exports 기준 ES2022-only, skipLibCheck false로 수행한다. React가 있는 환경에서 DOM·signal을 사용하는 기존 루트 타입 fixture도 별도로 유지한다.
- B1/B2/B3의 framework-free characterization 테스트는 단계 3·4에서 구현한다. 2단계는 비교 기준과 입력/기대 결과를 고정하며 UI 구현을 변경하지 않는다.
- 높이·projection·상태 이전 시 기존 모드별 동작과 callback 순서를 먼저 재현하고 추출한다. 새 store, 새로운 기능 조합, ID 정책 변경, SSR 지원, Vue 및 신규 npm 패키지는 포함하지 않는다.

실측 런타임/격리 컴파일 결과, 정확한 신규 함수 signature와 성능 변화는 아직 확인되지 않았다. 각각 2단계 검사 구현, 단계 3·4 상세 구현 계획, 변경 후 focused/performance gate에서 확인한다.
