# @kmsf/data-table Test Memory

## History

- 2026-06-04: 이전 package 기준 하네스 표현을 폐기하고, KMSF repo root `AGENTS.md`/`GUIDE.md` 기준으로 test 도메인 문서를 정렬했다.
- 2026-06-04: test 하네스에 required tests completion gate, assertion weakening 금지, browser-required verification 기준을 추가했다.
- 2026-06-04: playground browser gate에 feature aside 20%, example content 80%, selected-feature keyed destroy/recreate 검증을 추가했다.
- 2026-06-04: 기본 기능 구현 중 `test/basic-core.test.ts`는 core store와 virtualization을 검증하고, `test/table-interaction.test.tsx`는 jsdom에서 row/cell Ctrl+C/V keyboard copy-paste를 검증한다.
- 2026-06-04: `test/playwright/specs/basic-playground.spec.ts`는 20/80 playground layout, selected-feature remount, browser diagnostics, Row/Cell Ctrl+C/V를 실제 browser에서 검증한다.
- 2026-06-04: 사용자 답변 기준으로 next basic test pass 후보를 정리했다. 우선 후보는 selection/clipboard, context callback, shadcn context menu example, header/row interaction, 100k/1M virtualization, lifecycle leak smoke다.
- 2026-06-04: MS가 BT-01부터 BT-12까지 모두 적용을 승인했다. `KmsfDataTable` component name을 유지하고, 1,000,000 rows는 별도 `test:perf`로 분리한다.
- 2026-06-04: BT-01부터 BT-12까지 TDD로 구현했다. Core selection/clipboard, React selection/context interaction, playground shadcn context menu example, header/row e2e, 100,000 rows verify gate, 1,000,000 rows `test:perf` gate가 통과했다.

## Context Compaction Checkpoint

- 다음 에이전트는 패키지 root `AGENTS.md`를 먼저 읽고, 이 도메인의 `research.md`와 `plan.md`를 확인한 뒤 작업한다.
- instruction-only 변경은 TDD 예외지만, 구조 검증과 리포트 기록은 유지한다.
- `@kmsf/data-table` test 하네스는 `charts`와 별개다. 검증 기준은 package-local `test/AGENTS.md`와 root `AGENTS.md`의 package verification routing을 따른다.
- 구현 전 `docs/agents/test/2026-06-04-basic-feature-test-scope-review.md`의 "Approved Implementation Set"과 "Resolved Decisions Before Writing Tests"를 확인한다.
- 후속으로 external store adapter, range selection, fill handle, multi-cell clipboard를 별도 plan으로 분리한다.
