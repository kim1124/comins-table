# @kmsf/data-table Example Plan

## Active Plan

- 2026-06-05: 사용자용 playground와 `docs/user` 문서 구현을 완료했다. 후속 변경은 `test/user-docs.test.ts`와 `test/playwright/specs/user-playground-docs.spec.ts`를 먼저 갱신한 뒤 TDD로 진행한다.
- 2026-06-05: 실제 구현 실행 순서는 `docs/agents/example/2026-06-05-user-playground-docs-implementation-execution-plan.md`를 따른다. 이 문서는 RED/GREEN 테스트, feature component 분리, 사용자 문서 작성, 최종 verify gate를 단계별로 정의한다.
- 2026-06-05: 사용자용 playground와 `docs/user` 문서 작성은 `docs/agents/example/2026-06-05-user-playground-docs-plan.md`를 따른다. 현재 구현된 core 기능을 모두 feature page와 user doc으로 매핑한다.
- 2026-06-04: 테스트 및 문서 playground는 charts-style developer playground를 참고하되 data-table 전용 20/80 layout과 feature-menu keyed remount contract를 따른다.
- 2026-06-04 계획 단계는 design-doc-only 변경이었고, 2026-06-05 구현 단계에서 README, `docs/user`, example feature components, user docs/playground tests를 추가했다.

## Planning Rules

- playground 구현 전 focused Playwright RED test로 layout, menu, destroy/recreate, diagnostics gate를 먼저 고정한다.
- parent shell은 selected feature id와 aside state만 소유한다.
- selected content 영역은 feature id로 keying하고, feature별 fixture, editor, timer, context menu state를 boundary 안에 둔다.
- 같은 feature 재선택은 no-op이다.
- 계획이 500줄 이상이면 `plans/00_example-plan.md`로 분할한다.

## Verification Notes

- browser-capable verification 없이 playground interaction을 완료하지 않는다.
- Playwright coverage는 `Basic -> Header -> Basic CRUD` 같은 교차 메뉴 이동을 포함한다.
- 이전 content, editor value, timer side effect, context menu, hidden table instance가 남으면 실패로 본다.
- package baseline은 `npm --workspace=@kmsf/data-table run verify`로 확인한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
