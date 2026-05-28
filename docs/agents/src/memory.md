# @kmsf/data-table Source Memory

## History

- 2026-05-03: `charts`의 agent map, `docs/agents`, path-local `AGENTS.md`, report gate 방식을 이 도메인에 맞춰 정리했다.
- 2026-05-28: AG Grid와 MUI X Data Grid 공식 기능을 기준으로 `@kmsf/data-table`의 Phase 1 MVP, Phase 2 operational table, Phase 3 enterprise backlog 설계 초안을 작성했다.

## Context Compaction Checkpoint

- 다음 에이전트는 패키지 root `AGENTS.md`를 먼저 읽고, 이 도메인의 `research.md`와 `plan.md`를 확인한 뒤 작업한다.
- instruction-only 변경은 TDD 예외지만, 구조 검증과 리포트 기록은 유지한다.
- data-table 기능 구현으로 들어가기 전에는 `docs/agents/src/2026-05-28-data-table-feature-design-draft.md`를 검토하고 Phase 1 범위를 별도 implementation plan으로 확정한다.
