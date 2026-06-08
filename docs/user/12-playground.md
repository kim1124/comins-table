# Playground

Playground는 `@kmsf/charts` Vite playground와 유사한 shell을 사용한다. 상단 topbar와 tabs 아래에 왼쪽 collapsible feature Aside, 중앙 recreated Content, 오른쪽 docs panel을 배치한다.
사용자가 기능을 읽고 바로 조작할 수 있도록 핵심 설명과 적용 옵션은 중앙 Content 본문에 표시한다.

```bash
npm --workspace=@kmsf/data-table run dev
```

메뉴 구성:

- `기본`: `KmsfDataTable`, `data`, `onChangeData`, theme, rowProps
- `기본 CRUD`: 행 추가, 선택 행 수정, 선택 행 삭제, query, pagination
- `헤더`: show/hide, boundary resize, 1초 long-press reorder, keyboard sort, `aria-sort`, `getColumnLayout`, `setColumnLayout`, `onChangeColumnLayout`, `onChangeSort`
- `본문`: header/body table split, virtualized 100000 and 1000000 row smoke
- `셀`: `format`, `columns[].props`, `cellSelection` toggle, `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell`, clipboard guard
- `행`: drag handle reorder, row keyboard copy/paste, `onClickRow`, `onDoubleClickRow`, `onContextMenuRow`, `onKeyDownRow`
- `컨텍스트 메뉴`: callback 기반 row/cell context menu, 우클릭 단일 row selection, `{ row, columnId, value }` data preview
- `핵심 기능`: selection, range selection, fill helper, layout serialization
- `고급 기능`: deferred features only

메뉴가 바뀔 때마다 중앙 content는 key 기반으로 destroy/recreate한다. 이 동작은 예제 수가 늘어도 mount/unmount와 메모리 누수 검증을 가능하게 하기 위한 playground 계약이다.

## Playground Verification And Harness

Playground는 기능 소개 화면이 아니라 검증 가능한 예제 환경이다.
기존 메뉴 안에서 예제를 확장하고, 기능별로 적용한 옵션과 동작 결과를 한국어로 짧게 설명한다.
오른쪽 docs panel은 보조 링크와 요약 영역이며, 이번 playground의 주 설명 표면은 중앙 Content 본문이다.

각 기능 예제는 가능하면 아래 정보를 화면에 노출한다.

- 적용한 주요 props, ref method, event callback.
- 사용자가 조작했을 때 바뀌는 row, cell, column, layout 상태.
- 비활성화 옵션이나 guard 조건이 있을 때 차단된 동작.
- DOM/CSS/geometry 검증이 필요한 고위험 interaction의 현재 결과.
- 사용자가 입력하거나 토글하면 즉시 반영되는 live example.

현재 `본문` 예제는 100000/1000000 row virtualized smoke를 유지한다.
Lazy-load row model은 현재 core 기능이 아니며 후속 고급 기능으로 분리한다.

고위험 interaction은 plan과 report에 Requirement-to-test matrix를 남긴다.

| 항목 | 의미 |
| --- | --- |
| Requirement | 사용자가 기대하는 기능 동작 |
| Failure Mode | 과거에 깨졌거나 깨질 수 있는 방식 |
| Expected RED reason | production 수정 전 실패해야 하는 이유 |
| GREEN evidence | focused test가 통과한 증거 |
| Browser proof | DOM, CSS, geometry, event isolation 증거 |
| Residual Risk | 아직 남은 리스크 또는 후속 검증 |

스크린샷 artifact는 모든 변경에 필수는 아니다.
사용자가 직접 지적한 visual 문제, layout 겹침, 색상/선/위치 문제처럼 텍스트 assertion만으로 판단이 부족한 경우에 남긴다.
