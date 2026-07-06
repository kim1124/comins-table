# @kmsf/data-table

## 0.1.1

### Patch Changes

- 10만 행 virtual scroll에서 visible cell render hot path의 반복 row index lookup을 제거해 빠른 scrollbar drag 이후 wheel/trackpad follow-up scroll 지연을 줄였습니다.
- Header playground 예제의 table body viewport 높이 계약을 수정해 Header 관련 예제에서 내부 세로 스크롤이 정상 표시되도록 했습니다.
- Header 설정 저장/불러오기 예제에 컬럼 선택 SelectBox를 추가하고, column layout과 컬럼 숨김/표시 상태를 함께 저장/복원하도록 개선했습니다.
- package-local `CHANGELOG.md`를 npm package file 목록에 포함하고 Changesets 기반 version/changelog 관리 흐름을 추가했습니다.
