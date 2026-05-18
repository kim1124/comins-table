# @kmsf/data-table Source Research

## Reviewed Facts

- 이 파일은 `src` 도메인의 사용자 검토 완료 사실만 기록한다.
- 2026-05-03 기준으로 `charts` 하네스 모델을 패키지별 지침 구조의 기준으로 삼는다.
- 중요 내용은 실현 및 구현 가능성이 98% 이상인 경우에만 남긴다.

## Scope

`src`는 public data-table exports와 future component implementation을 담당한다.

## Stable Rules

- public export는 `src/index.ts`에서 관리한다.
- table behavior는 React generic environment에서 동작해야 한다.
- large row rendering과 accessibility를 future baseline으로 고려한다.
