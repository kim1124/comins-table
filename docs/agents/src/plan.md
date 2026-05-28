# @kmsf/data-table Source Plan

## Active Plan

- 2026-05-03: `charts` 기준 하네스 구조를 이 도메인에 맞춰 적용한다.
- 이번 단계는 instruction-only 변경이며 production code 변경은 포함하지 않는다.
- 2026-05-28: AG Grid와 MUI X Data Grid 공식 기능을 분석해 `docs/agents/src/2026-05-28-data-table-feature-design-draft.md`에 설계 초안을 작성한다.
- 이번 단계는 design-doc-only 변경이며 production code 변경은 포함하지 않는다.
- 사용자 검토 후 Phase 1 범위만 별도 implementation plan으로 분리한다.

## Planning Rules

- 구현 전 Superpowers brainstorming으로 범위와 성공 기준을 확인한다.
- behavior, bugfix, refactor에는 Superpowers TDD를 적용한다.
- 잘못된 RED, 예상과 다른 실패, 검증 blocker는 코딩 전에 사용자에게 보고한다.
- 계획이 500줄 이상이면 `plans/00_<name>.md`처럼 분할한다.

## Verification Notes

- 문서만 변경하는 작업은 TDD 예외다.
- 코드나 설정이 바뀌면 패키지별 `AGENTS.md`의 verification command를 따른다.
- 이번 설계 초안 작업의 최소 gate는 문서 파일 존재, line count, source-domain 문서 업데이트, report 기록이다.
- runtime source가 바뀌지 않았더라도 package baseline 확인이 가능하면 `npm --workspace=@kmsf/data-table run verify`를 실행한다.
