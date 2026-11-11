# 0.2.4 Memory Resolution Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve memory failures in plain/100000-row virtual scroll, pending-request unmount and column groups, then verify a new PR above #98.
**Architecture:** Preserve numeric/lifetime separation and change only evidence-backed ownership or unnecessary rendering. First candidate skips scroll-only React commits in nonvirtual mode while preserving native DOM effects and virtual transitions.
**Tech Stack:** React 18/19, TypeScript, Vite, Vitest, Playwright/Chrome CDP.
**Spec:** User active Goal (4 scenarios, strict 2%, warm10, independent3x300, new PR; no release authority).

## Global Constraints
- Preserve #97/#98, Main/Vue3, existing local material and historical FAIL/raw evidence.
- No numeric exceptions, reset baseline, extra warmup, counter subtraction or product V8 flags.
- No speculative SDK cleanup. Runtime optimization is permitted with behavioral regressions and counterfactual validation.
- Original workspace stays unchanged. New PR base is codex-024-playground-memory while #98 remains open.

## Review Focus
- Nonvirtual scroll must preserve loading overlay location and lazy/infinite requests.
- False-to-true virtualization must start at actual viewport scrollTop.
- Virtual row windows and 100000-row performance must remain correct.
- Layout cancellation, horizontal synchronization and teardown must remain intact.
- Scoped lifetime release must not be promoted to overall numeric PASS.

## Decisions
Choose scroll-only React commit elimination first: source shows nonvirtual rows do not consume scrollTop but still rerender. Parent column memoization does not address this internal update. Runtime flag changes are forbidden. Astra/high configured global_architect reviewed the source boundary; backend telemetry unavailable.

### Task 1: Preserve baseline and existing RowExpand fix
- [x] Freeze refs/PRs and raw audit hash in frozen-start.json.
- [x] Create managed worktree and codex-024-memory-resolution branch.
- [x] Copy only tested RowExpand patch; regression 4 PASS in worktree.

### Task 2: Nonvirtual scroll rendering candidate
Files: src/index.tsx; test/nonvirtual-scroll-render-cost.test.tsx.
- [x] RED: nonvirtual native scroll must not rerun unchanged cell renderers.
- [x] Preserve virtual scroll window, loading overlay after scrolling, false-to-true virtualization position.
- [x] Skip only unneeded scroll-driven state commits; loading overlay uses current DOM position; synchronize on virtualization enable.
- [x] Run focused regressions and behavioral checks before browsers.
- [x] One bounded hypothesis, 2 browser arms (baseline/candidate), default Chrome, original plain workload/warm10/300/checkpoints. No heaps/cohorts/Profiler.
- [x] Record adopt/reject; do not infer other targets resolved from plain.

### Task 3: Remaining target causes and fixes
- [ ] Reuse unchanged evidence; choose distinguishing hypothesis for virtual, pending and group.
- [ ] Each investigation round <=30 minutes prep-through-record, <=2 new experiments; invalid retries included.
- [x] Actual Astra/high for hard boundaries and independent lifetime/fix review.
- [x] Each confirmed fix has meaningful pre-fix failure and post-fix pass.

### Task 4: Acceptance and PR
- [ ] Focused tests; each target numeric independent3x300 and scoped L1/L2.
- [ ] Required verify/E2E and one final full test:perf after last meaningful change.
- [ ] Report unrelated FAIL separately; all target FAILs prevent goal completion.
- [x] Scoped commits, dedicated branch push, new PR/base dependency and attach artifact (#100 above #98).
- [ ] Verify actual head CI and independent review; no merge/version/tag/publish/deploy.

## 2026-11-09 추가 진행 상태 (Round15–19)

- collection-ref와 tooltip-key 비용 후보는 각각 원래300회 비교에서 수치개선을 입증하지 못하여 보존 후 원복했다. 검증된 RowExpand/비가상 수정 커밋만 유지한다.
- 동일문서 snapshot의 Code/native ID 모순으로 R17 cross-time 귀속을 차단했다. 고정V8 소스감사에서 trusted-space 전체 move 누락가설은 기각했으며 실제원인은 runtime trace 부재로 미확정이다.
- 26개 snapshot의 개별전체스키마 재검색과12개 실제render소스 보완으로 제한된모델부재 증거를 강화했다(Astra/high 설정 리뷰ACCEPT). 필수수치FAIL은 해제하지 않았다.
- 다음은 기존matching-source 독립endpoint의 나머지 객체·메타데이터 분포와 현재strong경로를 분리하는 분석이다. 같은기각후보 재실행과 새로운제품수정은 원인증거 없이 수행하지 않는다.
- 전체목표ACTIVE. 대상4개 수치/결함·최종전체게이트·새PR head CI/리뷰가 완료되기 전 목표완료·출시를 선언하지 않는다.

## Round20–21 진행 상태

- 현재화면의React스택메타와Code메타를단일snapshot분포로분리했다. 전체JSHeap/누수량으로합산하지않는다.
- 정적API문서텍스트의Reactelement생성을줄인최소Playground변경을구현했다. final은322,796B감소했지만peak30,064B증가·수치3.204%FAIL이므로중간최적화이며사전조건전체합격이아니다.
-19집중단위/14영향E2E/전체verify1118단위PASS, Astra코드리뷰·같은diff의CodexSecurity보고finding0. SDK/React내부/runtime플래그변경없음.
- 공통free문서변경으로이전비가상3×300PASS를현재입력의PASS로승계하지않는다. 최종4대상검증·전체perf·새PR/실제headCI가남아있다.

## 2026-11-11 R29–R33: priority and confirmed SDK fixes

Column groups were investigated first, followed by Unmount. R29 confirmed the active group-resize layout/passive gap (late callback1 and retired models2/Fiber1 ->0); R31/R32 confirmed and fixed pending Viewport settlement retaining an empty retired Fiber (1->0), preserving real Suspense resume and StrictMode; R33 confirmed and fixed queued virtual-scroll RAF after actual SPA removal retaining a 100000-row SDK model/input/Fiber (1/1/1->0/0/0). Raw rows remain app-owned. Each fix has RED/GREEN and separate calibrated actual-SPA retention evidence, with actual Astra/high independent scoped review.

R30 inspected 67 served SDK modules,130 observed bindings,473 regular export cells and157 property-bearing functions; no increasing inspected JS payload was found. Accessor/external-context/prototype boundaries remain explicit. This does not establish whole SDK lifetime or total numeric cause.

Latest whole numeric run before Viewport/RAF fixes: full-perf-current-02,83PASS/26FAIL,allheap; DOM/listener budget violations0;633frozen inputs unchanged and matched d7670e3. Current final-source verify124files/1144tests PASS and focused performance8PASS. A final whole performance run and the newest PR-head CI remain required. All original FAILs remain, and no target/goal/release completion is authorized by scoped fixes. R27 administrative recording overrun is preserved.
