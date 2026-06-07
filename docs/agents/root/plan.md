# @kmsf/data-table Root Plan

## Active Plan

- 2026-06-04: 이전 package 참조 표현을 제거하고 KMSF repo root `AGENTS.md`/`GUIDE.md` 하네스 기준으로 정렬한다.
- 이번 단계는 instruction-only 변경이며 production code 변경은 포함하지 않는다.
- 2026-06-04: 설계 초안을 기준으로 TDD 필수, 실패 테스트 완료 금지, 금지 목록, browser verification gate를 하네스에 명시한다.

## Planning Rules

- 구현 전 Superpowers brainstorming으로 범위와 성공 기준을 확인한다.
- behavior, bugfix, refactor에는 Superpowers TDD를 적용한다.
- 잘못된 RED, 예상과 다른 실패, 검증 blocker는 코딩 전에 사용자에게 보고한다.
- 계획이 500줄 이상이면 `plans/00_<name>.md`처럼 분할한다.

## Verification Notes

- 문서만 변경하는 작업은 TDD 예외다.
- 코드나 설정이 바뀌면 패키지별 `AGENTS.md`의 verification command를 따른다.
- 하네스 문서 변경은 root `AGENTS.md` 상속 문구, package-local 예외, package-local report 위치가 서로 일치하는지 확인한다.
- 하네스 보강 시 instruction contract test로 핵심 gate 문구를 고정한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
