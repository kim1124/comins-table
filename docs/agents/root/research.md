# @kmsf/data-table Root Research

## Reviewed Facts

- 이 파일은 `root` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-06-04 기준으로 KMSF repo root `AGENTS.md`를 공통 실행 계약으로 삼고, root `GUIDE.md`를 MD 작성 및 하네스 엔지니어링 참고 문서로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

패키지 루트는 data table package contract, peer dependency, verification policy를 관리한다.

## Stable Rules

- React와 React DOM은 peer dependency로 유지한다.
- behavior 변경 전 focused test와 package verification impact를 먼저 계획한다.
- Next.js 전용 API를 runtime source에 넣지 않는다.
- 이 패키지는 `charts` 패키지의 하네스를 상속하지 않는다. KMSF root 하네스에 package-local 범위, 검증 명령, 보고 위치만 추가한다.
- 설계 초안 기반 table behavior 개발은 TDD를 필수 gate로 본다.
- required test 또는 package verification이 실패하면 작업 완료로 보고하지 않는다.
- 외부 grid/table wrapper, paid-tier lock-in, unverified rendered interaction work는 금지한다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
