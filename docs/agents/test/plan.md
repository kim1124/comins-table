# @kmsf/data-table Test Plan

## Active Plan

- 2026-06-04: 이전 package 참조 표현을 제거하고 KMSF repo root `AGENTS.md`/`GUIDE.md` 하네스 기준으로 정렬한다.
- 이번 단계는 instruction-only 변경이며 production code 변경은 포함하지 않는다.
- 2026-06-04: 설계 초안 기반 completion gate와 금지 목록을 test 하네스에 명시하고 instruction contract test로 고정한다.
- 2026-06-04: playground browser gate에 20/80 layout, feature menu, selected-feature destroy/recreate 검증을 추가한다.
- 2026-06-04: 사용자 답변을 기준으로 기본 기능 테스트 적용 후보를 `docs/agents/test/2026-06-04-basic-feature-test-scope-review.md`에 정리한다. 구현 전 MS 승인으로 "이번 적용" 목록을 확정한다.
- 2026-06-04: MS가 BT-01부터 BT-12까지 모두 적용을 승인했다. Row paste insert-after id는 `sourceId-copy-<n>`, overwrite paste는 target row id 유지, clipboard 옵션은 `copyable`/`pasteable`, 1,000,000 rows는 별도 `test:perf`, public component는 `KmsfDataTable`로 진행한다.

## Planning Rules

- 구현 전 Superpowers brainstorming으로 범위와 성공 기준을 확인한다.
- behavior, bugfix, refactor에는 Superpowers TDD를 적용한다.
- 잘못된 RED, 예상과 다른 실패, 검증 blocker는 코딩 전에 사용자에게 보고한다.
- 계획이 500줄 이상이면 `plans/00_<name>.md`처럼 분할한다.

## Verification Notes

- 문서만 변경하는 작업은 TDD 예외다.
- 코드나 설정이 바뀌면 패키지별 `AGENTS.md`의 verification command를 따른다.
- test 하네스 문서 변경 시 data-table package verify command와 future browser gate가 `test/AGENTS.md`와 일치하는지 확인한다.
- required tests cannot be downgraded, skipped, or deleted to pass a change.
- future Playwright coverage는 menu switch 후 stale content, stale timer, stale editor state, stale context menu가 남지 않는지 검증해야 한다.
- 기본 기능 테스트 협의는 core CRUD/layout, selection, clipboard, context callback, shadcn context menu example, header/row interaction, 100k/1M virtualization을 포함한다.
- 다음 production 작업은 `docs/agents/test/2026-06-04-basic-feature-test-scope-review.md`의 Approved Implementation Set을 TDD로 구현한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
