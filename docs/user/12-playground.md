# Playground

Playground는 `@kmsf/charts` Vite playground와 같은 docs shell을 사용한다. 상단 topbar와 tabs 아래에 왼쪽 collapsible feature Aside, 중앙 recreated Content, 오른쪽 docs panel을 배치한다.

```bash
npm --workspace=@kmsf/data-table run dev
```

메뉴 구성:

- `기본`: `KmsfDataTable`, `data`, `onChangeData`, theme, rowProps
- `기본 CRUD`: 행 추가, 선택 행 수정, 선택 행 삭제, query, pagination
- `헤더`: show/hide, boundary resize, 1초 long-press reorder, `getColumnLayout`, `setColumnLayout`, `onChangeColumnLayout`, `onChangeSort`
- `본문`: header/body table split, virtualized 100000 and 1000000 row smoke
- `셀`: `format`, `columns[].props`, `cellSelection={false}`, `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell`, clipboard guard
- `행`: drag reorder, row keyboard copy/paste, `onClickRow`, `onDoubleClickRow`, `onContextMenuRow`, `onKeyDownRow`
- `컨텍스트 메뉴`: callback 기반 row/cell context menu, 우클릭 단일 row selection, `{ row, columnId, value }` data preview
- `핵심 기능`: selection, range selection, fill helper, layout serialization
- `고급 기능`: deferred features only

메뉴가 바뀔 때마다 중앙 content는 key 기반으로 destroy/recreate한다. 이 동작은 예제 수가 늘어도 mount/unmount와 메모리 누수 검증을 가능하게 하기 위한 playground 계약이다.
