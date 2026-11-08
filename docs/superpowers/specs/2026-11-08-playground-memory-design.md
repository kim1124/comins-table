# Playground 반복 생성 개선 및 배포 빌드 메모리 검증

사용자가 2026-11-08 권고안의 목표 반영·실행을 승인했다. 먼저 완료 기능 PR의 현재 head CI를 검증하고 후속 코드를 별도 브랜치에서 작업한다. 기존 앱 Goal 본문 수정 도구가 없으므로 실행 기준은 수정 목표 파일에 기록한다.

## 의도와 계약

현재28건은 전체 화면 JS Heap2% 기준 초과이며 기존 관측 조건의 추가 SDK 보유 결함으로 판정하지 않는다. 수정 대상은 Playground가 소유한 반복 생성·불필요한 렌더 후보와 검증 환경이다. React/V8 정상 메모리를 제거하거나 전체 SDK 무누수를 보장하는 작업이 아니다.

- SDK `src/`, SDK 공개 API·동작·의존성을 변경하지 않는다. 새 SDK 결함의 직접 근거가 생기면 별도로 분류한다.
- 기존 개발 모드 결과와 과거 FAIL을 보존하고, 배포 빌드 결과를 별도 추가한다. 기준변경/예외승인은 포함하지 않는다.
- 고정warmup10·3독립프로세스×300회·각3지표2%·모든중간FAIL·정식수치/보유진단분리를 유지한다.
- React private-field 조작, JIT flag, 워밍업 증가, 평균/대조군차감, 정상fixture삭제, 기준값 padding을 하지 않는다.

## 선택한 접근

1. API 문서의 순수 데이터 재사용: 현재 `getDataTableOptionGuide(locale)`가 매번90여 항목과그룹을 생성한다. 실제 같은언어 반복호출이 새객체를 만드는 것을 수정전 회귀로 확인한다. 지원언어en/ko의 사용한 결과만 늦게 생성하여 보관하며 최대2개로 제한한다. 데이터는 읽기전용으로 공유하고 DOM·React요소·props·콜백을 캐시하지 않는다. 필요없는 언어를 미리 생성해 baseline을 키우지 않는다. 파생 그룹/usage 필터도 같은언어에서 재사용하되 실제효과가 있는 범위만 적용한다.
2. Sidebar: locale/그룹이 동일한 상위 렌더 전파만 줄인다. React Router context에 의한 NavLink 활성상태 변화와 언어전환은 유지한다. CodeExample은 현재 하이라이트WeakMap이 있고 페이지간에는 실제 remount하므로, 추가 memo의 실제 이득 근거가 없으면 적용하지 않는다.
3. 검증환경: 기존 개발 모드를 기본값으로 그대로 유지하고, 실제 Playground를 build한 뒤 정적으로 제공하는 production 실행을 추가한다. 동일페이지·데이터·조작·계측과3×300 프로토콜을 재사용한다. 실제HTTP JS와 mode/runtime/build입력의 일치·차이를 브라우저밖에 기록하여 개발 번들을 production으로 잘못 표기하지 못하게 한다. production에서도2%초과가능성을 유지한다.

무조건memo·새로운 범용캐시·React개발진단제거는 검토에서 제외한다. 순수데이터재사용도 전체힙효과는 측정 전 미확정이다.

## 검증

- 문서값/markup/코드escaping·한영전환과data source공유의 mutation 방지, 같은언어의 재사용/다른언어분리를 확인한다.
- 실제 Sidebar 이동의 활성link/문서스크롤초기화/실제SPA수명/table-free root0을 보존한다.
- focused perf를 먼저 수행하고, 마지막 의미있는변경 후 전체E2E 및전체perf1회를 수행한다. source/config변경 없는 중복gate는 돌리지 않는다.
- production counter는 같은9시나리오×3독립실행을 포함한다. counter 실행에 snapshot/cohort/새 in-browser 자원이력을 추가하지 않는다.
- 전후 수치, 제품 수명, 전체화면 판정, 재사용증거 및미검증범위를 분리한다. 잔여FAIL이 있으면 실제수정가능성과출시 gate를 보고하고 임의 공개하지 않는다.
