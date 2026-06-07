# @kmsf/data-table Example Research

## Reviewed Facts

- 이 파일은 `example` 도메인의 사용자 검토 완료 사실만 기록한다.
- 테스트 및 문서 환경은 `@kmsf/charts`의 developer-facing playground 운영 방식을 참고한다.
- `@kmsf/data-table`은 `charts`와 별개 package이며, playground도 data-table feature contract를 검증하는 별도 환경이다.

## Scope

`example`은 future playground, documentation examples, feature menu, browser verification surface를 담당한다.

## Stable Rules

- 좌측 aside는 feature menu로 구성하고 기본 화면 폭의 20%를 사용한다.
- 우측 content는 data table example 출력 영역으로 구성하고 기본 화면 폭의 80%를 사용한다.
- 메뉴는 `Basic`, `Basic CRUD`, `Header`, `Body`, `Td / Cell`, `Tr / Row`, `Core Features`, `Advanced Features`를 시작점으로 둔다.
- 다른 메뉴로 이동하면 우측 content를 destroy하고 새 content를 recreate한다.
- 같은 메뉴를 다시 선택하는 것은 no-op으로 처리한다.
- inactive feature example을 hidden DOM으로 유지하지 않는다.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
