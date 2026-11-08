# Playground Memory Improvement Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Perform the authorized work inline; use one independent final review for new memory-verification changes.

**Goal:** 완료분 PR 검증을 선행하고, 실제 Playground 반복 생성 개선과 개발/배포 빌드별 엄격 메모리 검증으로0.2.4출시를 진전시킨다.

**Architecture:** SDK는고정하고 순수문서데이터수명·Sidebar상위렌더를 최소개선한다. 기존개발검증과동일프로토콜의배포검증을별도로기록한다.

**Tech Stack:** React, React Router, Vite, TypeScript, Vitest, Playwright/CDP.

**Spec:** `docs/superpowers/specs/2026-11-08-playground-memory-design.md`; 수정목표는 `2026-11-08-playground-memory-release-goal.md`.

## Global Constraints

SDK/공개API/의존성/Vue3보존. 기준2%·warmup10·독립3×300·중간FAIL유지. 회차당가설1개/30분/신규브라우저실험2회. 최종정식gate는조사실험과별도기록. 기존실패소급해제·기준padding·React/V8private조작금지. 일반배포승인과수치예외승인구분.

## Review Focus

locale별캐시의제한·mutation격리;NavLinkcontext전파;실제SPAUnmount보존;production/dev번들오표기차단;수치실행에진단계측혼입방지.

## Task 0: 완료분 PR

- [x] 완료분91파일선별·백업·freshverify(1073unit등)통과.
- [x] `aab7db8`커밋·PR#97생성·이세션에연결.
- [x] 정확한head aab7db8의원격CI9개모두SUCCESS,mergeStateCLEAN확인. 메모리28FAIL과구분.

## Task 1: 순수문서데이터 재사용

**Files:** `example/src/docs/dataTableOptionGuide.ts`, `example/src/docs/docsRoutes.tsx`, 신규관련`test/`.

- [x] 같은언어반복호출·한영분리·읽기전용공유의회귀를작성하고현재실패확인.
- [x] 지원언어2개이내순수데이터만lazy재사용. API문서파생group은재사용효과가확인된범위만정리.
- [x] 회귀와`test/user-docs.test.ts`·기존localization검증PASS확인.

## Task 2: Sidebar 불필요 렌더

**Files:** `example/src/components/docs/DocsSidebar.tsx`, 관련집중테스트.

- [x] 동일그룹/locale의상위렌더전파와실제NavLink변경경로확인.
- [x] 이득을입증한경우만memo적용. CodeExample추가memo는효과근거없으면미적용.
- [x] 활성link·언어·검색/이동·스크롤/수명회귀확인.

## Task 3: 실제 Playground 배포 검증

**Files:** `playwright.config.ts`, 필요시전용server/helper, `test/playwright/helpers/memory-runtime.ts`, `memory-sustained.ts`와관련테스트.

- [x] dev기본값보존·production실제build/정적서버·mode검증·번들증거계약회귀작성.
- [x] 동일workload/GC/viewport/counter를재사용하며mode/runtime/실제servedJS해시를정확히기록.
- [x] focusedperf를선행하고mode別수치결과를별도로보존.

## Task 4: 최종판정

- [x] 마지막의미있는변경후전체E2E·전체perf1회및production동일counter3×300을실행.
- [x] 새검증변경에실제Astra/high독립리뷰. 동일기존P0/P1증거중복리뷰는하지않음.
- [x] 전후효과·제품해제·전체수치·잔여FAIL·출시판정보고. 잔여gate의명시승인없이는publish하지않음.

## Ledger

- 2026-11-08: 사용자명시승인으로완료분커밋/PR검증선행. Goal본문수정API없음/UI접근차단을보고하고수정본문파일작성. 기존Goal을거짓완료로대체하지않음.
- Task0 PR#97 head aab7db8:Fastverification/security/CodeQL/README통과,ChromiumE2E관찰중. 후속제품코드아직변경없음.

- Task0 complete: PR#97 head aab7db8의9개CI전부SUCCESS. PR은OPEN유지,후속브랜치codex-024-playground-memory에서진행.

- Task1: 같은 언어 300회 호출·읽기 전용 공유·전체 번역 값·파생 view의 회귀를 RED→GREEN으로 확인했다.
- Task2: 동일 입력의 상위 갱신에서 hook 호출2→1 회귀를 RED→GREEN으로 확인했다. NavLink·locale context를 보존하고 집중 UI50건이 통과했다.
- 집중 dev route300: 최대4.544962% FAIL, production:8.387837% FAIL. DOM·리스너 안정, 과거 FAIL 유지. production 기록은 최종 출력 seal 전 실행이므로 최종 guard의 실행 증거로 사용하지 않는다.
- 실제 Astra/high 리뷰의 Important2건(dev 모드 오표기·production 출력 seal)을 한 번의 수정 패스로 RED→GREEN 처리했다. 기존 URL 재응답 바이트 전체의 연속 보장은 하지 않는 범위 한계를 명시했다. 기존 정규식 테스트 계약 FAIL1도 수정했다. 동일 증거 재리뷰 없이 최종 gate를 진행한다.

- 리뷰 수정 후 모드별 최종 집중 실행과 전체 gate 전에 코드를 고정한다. 앞선 production 출력/metadata는 별도 archive로 보존한다. dev 메모리 재사용은 살아 있는 동일입력의 전용 개발 서버만 허용하고, 일반 E2E 명시 재사용은 유지한다. 추가 Node HTTP 재조회는 baseline 전에만 수행한다.

- 최종 전체 E2E: 294 PASS. 최신 전체 verify: 117파일/1103단위 PASS, 보안21/라이선스27/Core43 및 빌드/패키지 통과.
- 개발 모드 전체 perf: 78 PASS/29 FAIL. 27개 counter와 legacy2개가 JS Heap 2%를 초과했다. 실행 오류0이며 과거79/28 결과는 별도 보존한다.
- 개발 전체 gate 후 production 출력 자산 `__proto__` 키 누락을 회귀로 확인해 출력 map 한 줄만 보강했다. 개발 실행 경로와 SDK/앱은 동일하고 186/187 입력이 동일한 재사용 경계를 기록했다. production 정식 검증은 이 보강 이후 새로 수행한다.
- collector 단독 가설 회차는 신규 브라우저2회에서 양쪽 모두 FAIL이었다. 공식 계측 계약을 변경하거나 수치 실패를 해제하지 않는다.
- 현재 production 정식 counter27개를 순차 진행 중이며, 최종 판정은 완료 후 기록한다. 전체 출시 목표는 미완료다.

- 최종 production27회: 27 FAIL/무효0, 모두JS Heap2%초과. 입력/브라우저/runtime/출력/실제JS동일,원시값재계산일치,최종table-free root/rows/activeMounts0. 출시목표미완료·예외미승인·publish미실행. 상세는 `reports/2026-11-08-playground-memory.md`.
