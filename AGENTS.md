<!-- comins-reference:managed-start contract=v1.12 -->
# Comins Module AGENTS.md

## Common Policy

- Before changing this repository, read the canonical
  [Comins Contract v1.12](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
  or, for explicitly approved local-only adoption, its matching version in the
  verified Governance checkout, once per run. For inspection-only work, load it only when a Contract stage
  is relevant. Stop if it is unavailable or its heading does not match this
  block's version. Governance is the only common-policy owner.
- Report an approved local-only revision as unpublished.
- Load the Contract's license, sensitive-data, or release policy only when its
  corresponding stage is triggered.
- Keep module API, implementation, performance, browser, and checker commands
  in `Module Guidance`; the module owns their CI implementation.
- For task models, read `.codex/agent-roles.md` only when needed.
<!-- comins-reference:managed-end -->

## Module Guidance

- This repository owns the Comins Table React library, Playground, public docs, tests, and releases; KMSF references under `reports/` are historical only.
- Preserve the application-owned `data`/callback flow, documented types, exports (`comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`), and documented React SSR HTML/hydration boundary as public API.
- Keep implementation in `src/`, Playground in `example/`, English docs in `docs/user/`, matching Korean docs in `docs/ko/` for public behavior changes, tests in `test/`, and reports in `reports/YYYY-MM-DD.md`.
- Keep all third-party benchmark research, artifacts, and license notes under the ignored `.local/benchmarks/` tree. Public documentation may describe Comins behavior but must not contain named competitor comparisons; never bypass hygiene or add allowlist exceptions for local-only material.
- Run `npm run setup:hooks` once per clone and `npm run verify` for library, type, or build changes.
- For public documentation changes, run `npm run test:run -- test/user-docs.test.ts`. For Playground or UI changes, run the affected Playwright spec, and use `npm run test:e2e -- --workers=1` when shared interaction or routing can change.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first and run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change. Treat a local `listen EPERM` bind failure as an execution-environment failure unless evidence shows otherwise.
- For releases, follow Governance, `SECURITY.md`, and `.github/workflows/publish.yml`; do not claim closure when consumer and publish artifacts differ.

### 메모리 검증 및 완료 기준

- 0.2.4의 수치 합격 기준은 Chrome DevTools에 대응하는 JS Heap, DOM Nodes, 이벤트 리스너 각각의 동일 상태 GC 후 고정 기준값 대비 증가율 **2% 이하**다. 증가율은 `(측정값 - 기준값) / 기준값 * 100`으로 계산하며 반올림하지 않는다. 기준값 0인 항목은 측정값도 0이어야 한다. 하나라도 초과하면 FAIL이다.
- 각 중간 체크포인트를 최초 동일 상태 기준값과 비교한다. 중간 FAIL은 종료 값 복구로 지우지 않는다. 직전 체크포인트 대비 변화는 추세 진단이며 별도의 증가량 0 판정 기준으로 사용하지 않는다. 냉간과 워밍업 후 측정을 분리하고, 고정 워밍업·비교 기준을 실행 전에 명시한다. 실패를 없애기 위해 기준값을 재설정하거나 워밍업을 늘리지 않는다.
- 필수 시나리오는 비가상 반복 스크롤, 100,000행 가상 테이블의 같은·새로운·재방문 구간 스크롤, 테이블 페이지와 테이블 없는 실제 SPA 페이지 사이의 반복 이동이다. 다른 테이블 페이지 복귀, 전체 reload, 검증용 root 교체로 실제 페이지 이동을 대체하지 않는다. table-free 상태에서 테이블 root·행 DOM은 0이어야 한다.
- 시나리오마다 새 브라우저 프로세스·프로필로 독립 3회, 회당 최소 300회 실행한다. 0/10/50/100/200/300회 및 최종 Unmount 안정화 시점의 증거를 남긴다. 동일 위치·행 구간·viewport·선택 상태로 복귀하여 비교하고 mounted/free 기준을 분리한다. 독립 실행 하나라도 실패하면 전체 PASS가 아니다.
- 대상 패키지·소스·번들·브라우저 버전, 데이터 규모, 워밍업 횟수, GC·안정화·측정 절차를 실행 전에 고정한다. 필수 세 지표의 누락·조건 불일치·실행 환경 실패는 미검증 또는 미실행으로 보고하며 수치 PASS로 처리하지 않는다.
- 수치 합격과 제품 보유 결함 귀속을 분리한다. 2% 이내라도 종료된 테이블 객체·DOM·리스너가 반복 보유되는 강한 경로가 입증되면 결함이다. 2% 초과라도 제품 귀속이 확인되지 않으면 수치 FAIL·원인 미확정이다. 수치 PASS를 전체 무누수로 표현하지 않는다.
- 주 카운터 실행과 heap snapshot·allocation 진단은 분리한다. Native·RSS·문서·detached DOM·observer·timer·제품 객체는 보조 진단이며 필수 세 지표의 수치 합격을 대체하거나 자동 차단하지 않는다. RSS는 JS/native를 포함하므로 native 전용량으로 해석하거나 JS 힙과 합산하지 않는다. 보조 진단 누락은 별도 미검증으로 기록한다.
- 증가가 확인되면 동작 → 증가 객체 → Retainers/GC root → 소스 또는 런타임 소유 경로를 추적한다. 대조군 증가분 차감이나 평균으로 FAIL을 지우지 않는다. V8 템플릿을 실제 행 데이터로 오인하지 않으며 JIT·캐시·계측 도구의 영향과 제품 결함을 구분한다.
- 과거 0 증가 기준 또는 다른 허용률로 기록된 FAIL은 역사적 증거로 보존하며 새 기준으로 소급하여 PASS로 바꾸지 않는다. 전후 값·증감·중간 체크포인트·원시 증거·조건·미검증 항목을 남긴다. 테스트 계약 변경 시 focused 성능 spec을 먼저 실행하고 마지막 의미 있는 변경 후 `npm run test:perf -- --workers=1`을 한 번 실행한다.

### 메모리 검증 실행 분류 (0.2.4)

- [메모리 실행·coverage 계약](docs/maintenance/memory-validation-contract.md)을 따른다. 제품 수명(L1), 활성 기능(L2), 전체 화면 수치(L3)를 각각 보고한다.
- `test:memory:lifetime`, `test:memory:integration`, `test:memory:counter`, `test:memory:legacy`, `test:memory:instrumentation`은 집중 실행용이다. 기존 최종 `npm run test:perf -- --workers=1`과 모든 @perf 선택은 유지하며 선택 실행으로 대체하지 않는다.
- `memory-verdict.ts`의 사전 승인 manifest에는 필수 ID뿐 아니라 대상·층·단계·기대값을 고정한다. 결과 누락·부적합·미해결 결함을 차단하고 과거 FAIL은 증거 유효성과 독립 보존한다. 테스트 실행 PASS는 전체 제품 무누수 또는 출시 PASS가 아니다.
- 기본 reporter의 `memory-layers.json`은 실행 요약이다. 승인된 전체 coverage/evidence가 없는 요약은 NOT_ASSESSED/BLOCKED로 기록한다. 기존 수치 2%, warmup10, 독립3×300과 과거 FAIL·출시 보류·Goal 완료 조건은 변경하지 않는다.
