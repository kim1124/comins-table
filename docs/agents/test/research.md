# @kmsf/data-table Test Research

## Reviewed Facts

- 이 파일은 `test` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-06-04 기준으로 KMSF repo root `AGENTS.md`를 공통 실행 계약으로 삼고, root `GUIDE.md`를 MD 작성 및 하네스 엔지니어링 참고 문서로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`test`는 Vitest, Playwright browser checks, report routing을 담당한다.

## Stable Rules

- behavior를 추가하기 전에 focused test를 먼저 만든다.
- rendered table interaction은 browser-capable test로 검증한다.
- package baseline은 `npm --workspace=@kmsf/data-table run verify`로 확인한다.
- test 하네스는 `charts` package 검증 체계를 상속하지 않는다. `@kmsf/data-table` 자체 Vitest, browser check, package verify 기준으로 유지한다.
- required focused test, package verify, browser-required verification은 completion gate다.
- failing required tests를 남긴 상태에서는 작업을 완료로 보고하지 않는다.
- test를 통과시키기 위한 assertion 약화, 테스트 삭제, jsdom-only 대체는 금지한다.
- playground browser verification은 aside menu, 20/80 layout, selected content rendering, destroy/recreate, browser diagnostics empty를 포함해야 한다.
- 메뉴 이동 시 이전 content는 hidden 상태로 남아 있으면 실패로 본다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
