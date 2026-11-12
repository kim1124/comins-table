# 0.2.4 메모리 검증 실행과 판정

2026-11-07 사용자 승인 재설계안 적용. 이 문서는 모듈의 실행·보고 계약이며 기존 2% 기준, 과거 FAIL, 기존 목표의 완료 조건을 변경하지 않는다.

## 실제 Playground 개발·배포 빌드 분리

2026-11-08 승인된 후속 검증은 실제 Playground에 개발/배포 실행을 각각 적용한다. 기본값은 development다. `PLAYWRIGHT_PLAYGROUND_MODE=production npm run test:memory:counter -- --workers=1`은 같은 workload·warmup10·독립3×300·2% 기준을 배포 빌드에 별도로 적용한다. 개발 모드의 과거 FAIL을 배포 결과로 소급 해제하지 않는다. production counter 선택은 production의 모든 legacy/L1 검사나 전체 출시 gate의 대체가 아니다.

- 전용 `scripts/serve-memory-playground.mjs`가 두 모드를 제공한다. 배포 모드는 실제 build 후 HTML·JS·CSS·public 자산 전체 출력 inventory/digest를 입력·React 모듈 목록과 함께 고정하고, baseline 전부터 출력의 변경·추가·삭제를 차단한다. 실행 중 현재 출력과 동일한지도 다시 확인한다.
- 개발 모드 수치 실행은 전용 서버의 현재 입력·origin·살아 있는 PID 증거를 확인한다. 실제 HTTP inventory에 Vite 개발 진입점과 React optimized entry가 있어야 하며, 해당 HTTP 바이트를 같은 서버에서 재조회해 비교한다. raw optimized disk entry와 Vite가 변환한 HTTP 바이트를 같은 것으로 가정하지 않는다.
- 개발 서버 재사용은 기존과 같이 `PLAYWRIGHT_REUSE_EXISTING_SERVER=1`일 때만 허용한다. 수치 실행에서 재사용할 서버는 `node scripts/serve-memory-playground.mjs --mode development --port 4002`로 시작하고 소스가 고정되어 있어야 한다. 일반 E2E의 명시적 재사용 옵션은 유지한다. 배포 수치 실행은 기존 서버를 재사용하지 않는다.
- 실제 스크립트 URL·해시는 Node runner에서 기준 측정 전에 수집한다. 본 측정에서는 새 URL 유입을 검사하되 같은 URL의 재응답 바이트·상태 전부를 연속 입증하는 것은 아니다. 새 브라우저 객체 이력·WeakRef·snapshot을 정식 수치 실행에 추가하지 않는다.
- mode·입력·번들 증거 불일치는 실행 무효/미검증이다. 수치 FAIL과 분리하며 허위 PASS를 만들지 않는다.

## 독립된 세 층

| 층 | 목적 | 명령 | 판정 범위 |
|---|---|---|---|
| L1 제품 수명 | 최소 실제 production SPA와 SDK 없는 React 대조군, 별도 보유 진단 | `npm run test:memory:lifetime -- --workers=1` | 기존 표본·회귀 실행만. 전체 내부 객체/저장소 무누수를 뜻하지 않음 |
| L2 활성 기능 | 선택 6개 실제 pending/drag/Portal 등 정리 책임 | `npm run test:memory:integration -- --workers=1` | 실제 상호작용·화면 정리 회귀. 연결 DOM 0을 GC 수집으로 바꾸지 않음 |
| L3 전체 화면 | Playground의 세 지표 예산 | `npm run test:memory:counter -- --workers=1`, `npm run test:memory:legacy -- --workers=1` | JS Heap·DOM Nodes·리스너 각각 2% 이하. legacy도 필수 gate 유지 |
| 계측 | 카운터 분리와 계측 유효성 회귀 | `npm run test:memory:instrumentation -- --workers=1` | 테스트 도구 회귀이며 L1/L2/L3 합격을 대체하지 않음 |

**최종 전체 명령은 기존 `npm run test:perf -- --workers=1`이다.** @perf 테스트 107건을 보존했다. 분류가 없는 기존 perf도 전체에서 제외하지 않는다. 선택 명령 결과로 출시를 승인하지 않는다. `MEMORY_AUDIT_DIAGNOSTICS=1`은 별도 진단 실행이며 카운터 태그/수치 합격을 제공하지 않는다. 진단 실행을 기본 정식 명령에 혼합하지 않는다.

`memory-verdict.ts`는 사전에 고정된 필수 ID 목록과 별도 관측 결과를 집계한다. requiredNumeric/requiredCoverage를 성공한 결과에서 생성해서는 안 된다. 빈 목록, 중복, 필수 누락, 무효, 미실행, artifact 불일치, 미해결 확정 결함은 차단한다. 필수 대상의 미해결 생존은 소유자가 SDK/소비자/runtime/미확정인지와 별개로 차단하며 SDK 추측 수정을 허용하지 않는다.

N/A는 실행 전에 근거를 남긴 승인 목록에서 필수 제외로 선언하고 관측 목록에 NOT_APPLICABLE로 기록한다. 실행 후 required 목록을 줄이거나 필수 결과 자체를 N/A로 바꿔 통과시키지 않는다. 일반 보조 RSS/native/observer 미수집은 기록만 하며 자동 필수로 승격하지 않는다.

과거 CONFIRMED_DEFECT는 현재 artifact의 수정 포함과 유효한 회귀 근거가 연결된 VERIFIED_FIXED만 해결로 취급한다. 표본 RELEASED_IN_SCOPE와 원시값 저장소 결함은 공존할 수 있다. 의도적으로 강하게 보유한 calibration-held 표본의 생존은 성공 조건이지만, 실제 retired 표본의 retained 기대값은 허용하지 않는다. 진단 전 강한 보유 검출→해제→별도 task/GC/안정화 교정은 여전히 필수다. 기존 테스트의 mounted 생존 확인만으로 이 교정을 모두 증명했다고 처리하지 않는다.

## Coverage 목록과 현재 증거 한계

`column-native-bookkeeping.spec.ts`는 development 실제 SPA의 헤더 등록 저장소를 검사하는 L2 보조 회귀다. 같은 App의 강한 보유/해제 교정 후 모듈만 초기화한 빈 소유자 상태, warmup10 후 해제 상태, 300회 후 해제 상태의 지정 WeakSet backing 크기를 비교한다. snapshot은 별도 브라우저 실행에서만 수집한다. 이 검사는 전역 2% 수치, 독립3회 검증, 모든 저장소나 DOM의 해제 판정을 대체하지 않는다. production 실행에는 지정 개발 소스 바인딩이 없으므로 이 진단의 실행 조건 오류로 보고하며 수치 PASS로 처리하지 않는다.

아래 표는 기존 승인 시나리오와 책임을 정리한 목록이다. 모든 항목에 새 진단/필수 반복 수를 부과하는 승인이 아니다. 실행 전에 대상·필수 여부·source·기대 수명·N/A 근거·관측 방법을 고정한다. 기존 증거가 없는 대상은 NOT_ASSESSED다. 특히 내부 원시값 캐시와 모든 timer/observer가 검사됐다고 확대하지 않는다.

| 시나리오 | 소유 대상·정리 책임 | 기존 직접 확인/증거 재사용 한계 |
|---|---|---|
| plain-scroll | SDK viewport/측정 refs·행 메타데이터의 수명/용량; 소비자 data | 기존 비가상 3×300 수치. 객체/저장소 전수 해제는 미검증 |
| virtual-scroll | SDK 가상 구간 측정·재방문 캐시; 소비자 100k data | 같은/새/재방문 3×300 수치. 소비자 정적 data는 퇴거 제품 표본이 아님 |
| route-unmount | SDK root/행/핸들·측정 자원; Router/React 소비자 수명 | 실제 table-free 3×300 수치. 독립 SPA releaseFocus 회귀는 특정 포커스 경로만 확인 |
| cross-table-drag-gesture-unmount | SDK drag 리스너·마커·전송 대상 refs; 소비자 transfer callback | held pointer 실제 SPA exit/물리 해제, flat/group 변형. 전역 리스너 root와 저장소 누적 전체는 미검증 |
| loading-pending-unmount | SDK lazy/viewport 요청 refs·중단 정책; 소비자 pending Promise와 callback | initial/refetch/lazy의 실제 pending·늦은 완료, 별도 ownership resolve/reject 회귀. 취소 불가능 소비자 Promise 자체 제거를 강제하지 않음 |
| portal-menu-tooltip-teardown-case8 | SDK Portal/tooltip anchor·document 리스너·callback refs | 실제 열린 UI 종료; visible-tooltip 표본 회귀. 모든 menu 경로/내부 원시 캐시는 미검증 |
| column-groups-open-ui-unmount | SDK 그룹 UI·메뉴 refs/리스너; 소비자 column config | 열린 UI SPA 종료 회귀. 모든 그룹 metadata/Portal 표본 해제는 미검증 |
| selection-clipboard-gesture-unmount | SDK selection drag·pending clipboard가 보유한 data/ref; 소비자 clipboard Promise | 실제 gesture·copy/paste, 별도 pending-copy ownership resolve/reject 회귀. 모든 clipboard 경로는 미검증 |
| column-filtering-open-ui-unmount-case2 | SDK filter popup/선택/포커스 refs·document 리스너; 소비자 filter state | 실제 열린 UI 종료와 focused-filter dismissal 표본 회귀. 전체 map/cache 수명은 미검증 |

기존 근거: `test/playwright/helpers/memory-unmount-workloads.ts`, `memory-loading-workload.ts`와 각 ownership/lifetime spec. 이 테스트의 통과만으로 위 미검증 항목을 VERIFIED로 승격하지 않는다. 소스/번들/런타임/조건이 같은 범위에서만 기존 증거를 재사용한다.

## 실행 결과 저장

- sustained `result.json`의 기존 numericStatus/growth/raw measurements를 보존하고 독립 `verdict`를 추가한다. 수치 실행은 L1/L2 NOT_ASSESSED, 진단 실행은 numeric NOT_RUN이다. 단일 프로필 verdict는 전체 독립 3회 gate가 아니다.
- 기본 Playwright reporter는 `reports/artifacts/memory-layers.json`에 층별 **실행 결과**를 저장한다. `MEMORY_LAYER_REPORT`로 경로를 지정한다. 첨부된 numeric FAIL은 보존한다. 전체 승인 inventory/교정/coverage를 입증하지 않은 실행 요약은 출시 BLOCKED, 수명 NOT_ASSESSED다. 수치 PASS 첨부가 있어도 선택 실행만으로 전체 numeric PASS를 만들지 않는다. legacy 원시 증거는 기존 파일로 확인한다.
- 테스트 제목 태그는 실행 분류다. 양성 대조·관측 성공과 제품 해제 성공을 같은 의미로 취급하지 않는다. L1 명령에는 기존 양성 대조 회귀도 포함된다.
- 새 판정기의 gate PASS를 실제 출시 근거로 사용하려면 승인된 **전체** numeric/coverage inventory, 각 실제 결과, 현재 artifact SHA, 정리 source와 회귀 근거를 제공해야 한다. 현재 누락 범위는 미검증으로 남아 있어 출시 승인이 불가능하다.

## 유지되는 조건

고정 warmup10, 독립3×300, 0/10/50/100/200/300 및 최종 Unmount 안정화, mounted/free 최초 동일 상태 기준, 중간 FAIL 보존, 반올림 없는 각각2%, 기준0이면 측정0을 유지한다. L1/L2는 기존 승인 횟수·표본만 유지하며 3×300으로 임의 확대하지 않는다.

카운터 실행에는 반복 WeakRef/cohort 이력·observer/timer wrapping·snapshot·allocation profiler를 추가하지 않는다. 원시 이력은 브라우저 밖에 저장한다. package/source/loaded bundle/runtime/browser/V8/flags/**build mode**/data/props/callback/경로/viewport/선택/GC·안정화를 고정한다. 최소 production SPA와 Vite 개발 Playground의 절대 수치를 합산하지 않는다. releaseFocus는 제거 전에 소비자가 호출하는 API이며 자동 Unmount 해제로 표현하지 않는다.

수치 FAIL을 rebaseline/워밍업 추가/평균/대조군 차감/jitless로 해제하지 않는다. 수정 착수는 종료 객체→불필요한 강한 root→제품 source→수정 전 실패 회귀 또는 불필요한 저장소 누적→정리 책임 source→회귀의 증거가 필요하다. 원인 조사30분·가설1개·새 실험2회(무효/재시도 포함)를 유지한다. 고정 회귀 실행을 새 원인 실험의 우회 명칭으로 사용하지 않는다. 실제 Astra/high는 새 변경/증거만 리뷰한다.

과거 79 PASS/28 FAIL과 원시 증거는 별도 epoch로 보존하며 새 실행은 새 디렉터리에 기록한다. 원래 Goal/Excel·SSR·WebGPU 후속 목표·Main/Vue 로컬 작업·릴리스 승인 경계를 변경하지 않는다.

## 반복 스크롤 전달 경계

- plain-scroll/virtual-scroll/route-unmount의 스크롤은 실행당 하나의 CDP helper가 최초 main frame/default context에서 수행한다. 고정 함수에 유한한 [0,1] fraction만 전달하며 DOM/remote handle을 저장하지 않는다. 실제 경로 이동은 기존 anchor/React Router를 유지한다.
- 호출자는 기존 mount/visible/settle 조건으로 일반 DOM viewport 준비를 확인한다. helper는 정확히 하나의 data-testid viewport, 양수 scroll range, 원래 scrollTop 대입·bubbling event·2 RAF·양수 이동 확인을 유지한다. Locator의 attached 대기나 shadow DOM 탐색을 제공하는 범용 helper가 아니다.
- context 소멸·교체·초기화 실패·CDP 예외는 실행 실패다. 새 context로 복구하지 않으며 마지막 scroll 이후에도 완료 직전 부작용 없는 verify로 무효화를 확인한다. helper는 자신의 listener만 제거하며 session detach는 실행 finally가 담당한다.
- 해당 세 시나리오는 cold-before-tooling 전에 Runtime context 추적을 설치하고 protocol에 기록한다. 이 cold 이름은 initializeMemoryInstrumentation 전 단계이며 diagnostic resource hooks(addInitScript)와 적용 시 scroll context는 이미 활성이다. 모든 도구 설치 이전이라는 뜻이 아니다. 기능 Unmount workload에는 사용하지 않는 scroll context를 설치하지 않는다.
- 원래 warmup10·fraction 순서·300회·checkpoint·GC·mounted/free·2% 기준과 과거 FAIL은 유지한다. 전달 경계가 달라졌으므로 과거 선택 실행의 PASS를 새 계약의 정식 독립3회 검증으로 대체하지 않는다.
