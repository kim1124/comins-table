# @kmsf/data-table Agent Knowledge Map

이 디렉터리는 `@kmsf/data-table` 패키지의 에이전트 하네스 문서를 중앙 관리한다.

## Domain Map

- `root/`: package contract, peer dependencies, verification policy
- `src/`: public data table exports and future component rules
- `test/`: Vitest tests, future browser tests, report routing
- `example/`: future playground, docs examples, feature menu, browser verification

## File Roles

각 도메인은 아래 세 파일을 가진다.

- `research.md`: 사용자와 검토된, 구현 가능성이 98% 이상인 사실만 기록한다.
- `plan.md`: 현재 active plan index와 구현 전 검토 항목을 기록한다.
- `memory.md`: 결정 히스토리와 context compaction checkpoint를 기록한다.

## Operating Rules

- 런타임 지침은 실제 코드 경로의 `AGENTS.md`를 우선한다.
- 세부 배경과 긴 계획은 이 디렉터리 아래에 둔다.
- 계획이 500줄 이상이면 `plans/00_<name>.md` 형태로 분할한다.
- 검증 실패, 생략, sandbox 제한은 `packages/data-table/reports/YYYY-MM-DD.md`에 남긴다.
