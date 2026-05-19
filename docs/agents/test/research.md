# @kmsf/data-table Test Research

## Reviewed Facts

- 이 파일은 `test` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-05-03 기준으로 `charts` 하네스 모델을 패키지별 지침 구조의 기준으로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`test`는 Vitest, future browser checks, report routing을 담당한다.

## Stable Rules

- behavior를 추가하기 전에 focused test를 먼저 만든다.
- rendered table interaction은 browser-capable test로 검증한다.
- package baseline은 `npm --workspace=@kmsf/data-table run verify`로 확인한다.
