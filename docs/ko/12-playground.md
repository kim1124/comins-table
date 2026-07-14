# Playground

Playground는 `comins-table` 기능을 문서와 예제로 함께 확인하는 Vite 기반 문서 shell이다.
상단 package navigation, 왼쪽 기능별 메뉴, 오른쪽 article content로 구성하며 React Router route 이동을 사용한다.

`comins-table`은 독립 저장소로 관리한다. 라이브러리, Playground, 문서, 테스트, 릴리스 작업은 모두 이 저장소 루트에서 진행하며 `npm --workspace` 접두사를 사용하지 않는다.

```bash
npm run dev
```

기본 실행 URL은 `http://127.0.0.1:4002`다.
`/`는 `/docs/getting-started`로 이동한다.

## Route 구성

- `/docs/getting-started`: 설치, CSS import, 첫 번째 DataTable 예제
- `/examples/basic`: legacy URL 호환용 redirect. 실제 화면은 `/docs/getting-started`로 이동한다.
- `/examples/crud`: 행 추가, 선택 행 수정, 선택 행 삭제, 필터링, table 우측 상단 pagination
- `/examples/size`: `300px` 기본 높이와 상위 컨테이너 `500px`를 따르는 테이블 높이 예제. 기존 브라우저 `100%` 예제 카드는 제거되었다.
- `/examples/theme`: CSS custom properties, theme class, rowHeight 동기화 계약
- `/examples/loading`: 초기 skeleton, 재조회 overlay, 빈 데이터 상태
- `/examples/header`: 1Depth Header 이동, resize, 컬럼 설정 저장/불러오기, Header 표시 토글, Header 컬럼별 Checkbox Select Box 숨김/표시. 컬럼 설정 저장/불러오기는 컬럼 표시 상태도 함께 저장한다.
- `/examples/column-groups`: 2Depth Header 이동, resize, 컬럼/그룹 숨김/표시. `/examples/header-groups`는 legacy URL 호환용 redirect로 유지한다.
- `/examples/body`: legacy URL 호환용 redirect. 실제 화면은 `/performance/virtualization`으로 이동한다.
- `/examples/cell`: `cell.format`, `cell.props`, `cell.renderer`, cell event Alert, clipboard guard
- `/examples/component`: Header와 Cell에 적용되는 built-in component와 custom renderer. Component 예제는 렌더링 결과 중심으로 표시한다.
- `/examples/row`: drag handle reorder, `rowProps.draggable`, row disabled, row custom formatting, row event Alert, row keyboard copy/paste
- `/examples/tree-grid`: 제어형 `{ item, expand, children }` data, hierarchy expand, 기존 `item` 컬럼 재사용, leaf-only Summary Row
- `/examples/context-menu`: callback 기반 row/cell context menu, 우클릭 단일 row selection, payload preview
- `/examples/export`: `exportCominsRowsToCsv`, `exportCominsRowsToJson` helper 출력 예제
- `/api/props`: 현재 구현된 props, events, ref/core 항목
- `/api/ref`: 현재 구현된 ref method와 core helper 경계
- `/performance/infinite-scroll`: 원격 API batch를 append하는 `lazyLoad`, `onLazyLoad` 기반 Infinite Scroll 예제
- `/performance/lazy-load`: append-mode `lazyLoad`, `onLazyLoad`, Loading / Empty / Infinite Scroll 연동 예제
- `/performance/virtualization`: 10만 Row 기본 로드, virtualized large-row 사용 기준과 검증 주의사항

왼쪽 메뉴는 구현된 기능만 노출한다.
`/examples/basic`, `/examples/body`는 기존 링크 호환을 위해 route만 유지하고 왼쪽 메뉴에는 노출하지 않는다.
검색, version switcher, MDX pipeline, 미구현 roadmap 전용 페이지는 현재 playground 범위에 포함하지 않는다.

## Page 계약

각 route page는 아래 정보를 같은 content 안에 배치한다.

- 기능 설명
- 적용 코드 예제
- 예제
- 구현된 API 또는 검증 기준

코드 예제는 `prism-react-renderer`로 표시한다.
예제는 기존 feature component를 재사용한다.
route 이동 시 이전 page와 예제 subtree는 unmount되어야 하며, 이 동작은 Playwright lifecycle 검증 대상이다.

## Layout 계약

전체 page scroll은 body가 아니라 content 영역이 소유한다.
테이블의 기본 높이 계약은 `300px`를 유지한다.
긴 feature page는 오른쪽 content 안에서 세로 스크롤된다.
오른쪽 docs panel과 기존 `기능 예제` / `옵션 가이드` tab split은 사용하지 않는다.

## Playground Verification And Harness

Playground는 기능 소개 화면이 아니라 검증 가능한 예제 환경이다.
기능별 route는 사용자가 조작해야 하는 control과 data table을 우선 배치한다.
긴 배열을 그대로 출력하는 debug 텍스트는 노출하지 않는다.
CRUD, Cell, Row처럼 이벤트 확인이 필요한 예제는 별도 JSON echo 영역 대신 inline Alert로 마지막 이벤트를 표시한다.

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
