# Playground

Playground는 `@kmsf/charts` Vite playground와 유사한 shell을 사용한다. 상단 topbar와 tabs 아래에 왼쪽 collapsible feature Aside와 중앙 recreated Content를 배치한다.
사용자가 기능을 읽고 바로 조작할 수 있도록 핵심 설명과 적용 옵션은 중앙 Content 본문에 표시한다.

```bash
npm --workspace=@kmsf/data-table run dev
```

메뉴 구성:

- `기본`: `KmsfDataTable`, `data`, `onChangeData`, theme, rowProps
- `CRUD 동작`: 행 추가, 선택 행 수정, 선택 행 삭제, 필터 요약, table 우측 상단 pagination
- `테이블 사이즈`: 높이 수동 지정, 상위 컨테이너 크기 따라가기, 브라우저 리사이즈 반응
- `Header 예제`: show/hide, boundary resize, 1초 long-press reorder, keyboard sort, `aria-sort`, `getColumnLayout`, `setColumnLayout`, `onChangeColumnLayout`, `onChangeSort`
- `대용량 데이터 표시`: header/body table split, virtualized 100000 and 1000000 row smoke
- `Td Cell 예제`: `format`, `columns[].props`, `cellSelection` toggle, `onClickCell`, `onDoubleClickCell`, `onContextMenuCell`, `onKeyDownCell`, clipboard guard
- `Tr Row 예제`: drag handle reorder, `rowProps.draggable`, row disabled, row custom formatting, row keyboard copy/paste, `onClickRow`, `onDoubleClickRow`, `onContextMenuRow`, `onKeyDownRow`
- `Context Menu 예제`: callback 기반 row/cell context menu, 우클릭 단일 row selection, `{ row, columnId, value }` data preview

각 기능 Content 상단에는 기능 제목, 짧은 설명, `옵션 / 설명 / 예시` 표를 표시한다. 예제 내부에는 사용자가 조작해야 하는 control과 data table을 우선 배치하고, 긴 배열을 그대로 출력하는 debug 텍스트는 노출하지 않는다.
`CRUD 동작` 예제의 pagination은 data table 우측 상단 toolbar에 표시한다.
`옵션 가이드` 탭은 `data`, `columns`, event callback, ref method, core helper, 후속 기능 경계를 한 화면에 정리한다.
모든 일반 예제는 최소 100개 row data를 사용한다. 테이블은 예제 content 안에서 남은 영역을 채우도록 확장하고, row가 부족한 경우에도 빈 영역 border를 유지한다.

메뉴가 바뀔 때마다 중앙 content는 key 기반으로 destroy/recreate한다. 이 동작은 예제 수가 늘어도 mount/unmount와 메모리 누수 검증을 가능하게 하기 위한 playground 계약이다.

## Playground Verification And Harness

Playground는 기능 소개 화면이 아니라 검증 가능한 예제 환경이다.
기존 메뉴 안에서 예제를 확장하고, 기능별로 적용한 옵션과 동작 결과를 한국어로 짧게 설명한다.
오른쪽 docs panel은 사용하지 않는다. playground의 주 설명 표면은 중앙 Content 본문과 `옵션 가이드` 탭이다.

각 기능 예제는 가능하면 아래 정보를 화면에 노출한다.

- 적용한 주요 props, ref method, event callback.
- 사용자가 조작했을 때 바뀌는 row, cell, column, layout 상태.
- 비활성화 옵션이나 guard 조건이 있을 때 차단된 동작.
- DOM/CSS/geometry 검증이 필요한 고위험 interaction의 현재 결과.
- 사용자가 입력하거나 토글하면 즉시 반영되는 live example.

현재 `대용량 데이터 표시` 예제는 100000/1000000 row virtualized smoke를 유지한다.
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
