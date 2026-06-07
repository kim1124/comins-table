# @kmsf/data-table Root Memory

## History

- 2026-06-04: 이전 package 기준 하네스 표현을 폐기하고, KMSF repo root `AGENTS.md`/`GUIDE.md` 기준으로 root 도메인 문서를 정렬했다.
- 2026-06-04: 설계 초안 기준으로 TDD 필수, failing required tests completion block, forbidden list, browser verification gate를 root 하네스에 추가했다.

## Context Compaction Checkpoint

- 다음 에이전트는 패키지 root `AGENTS.md`를 먼저 읽고, 이 도메인의 `research.md`와 `plan.md`를 확인한 뒤 작업한다.
- instruction-only 변경은 TDD 예외지만, 구조 검증과 리포트 기록은 유지한다.
- `@kmsf/data-table`은 `charts` 하네스의 하위 프로젝트가 아니다. 하네스 기준은 KMSF root이고, 이 도메인은 package-local 계약만 추가한다.
