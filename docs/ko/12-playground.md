# Playground

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/12-playground.md) · [Playground 열기](http://127.0.0.1:4002/docs/getting-started)

Playground는 `comins-table` 기능을 문서와 예제로 함께 확인하는 Vite 기반 문서 shell이다.
상단 package navigation, 왼쪽 기능별 메뉴, 오른쪽 article content로 구성하며 React Router route 이동을 사용한다.

`comins-table`은 독립 저장소로 관리한다. 라이브러리, Playground, 문서, 테스트, 릴리스 작업은 모두 이 저장소 루트에서 진행하며 `npm --workspace` 접두사를 사용하지 않는다.

```bash
npm run dev
```

기본 실행 URL은 `http://127.0.0.1:4002`다.
`/`는 `/docs/getting-started`로 이동한다.

## 언어 전환

Playground의 기본 locale은 한국어(`"ko"`)이며 영어(`"en"`)를 함께 지원한다. 검색 input 바로 왼쪽의 `한 / EN` segmented toggle로 언어를 전환한다. Sidebar의 그룹명과 route 이름은 두 locale에서 모두 영어로 유지한다. Article 문구, 검색 metadata, code sample title, feature metadata, control, Alert, loading 및 empty 안내는 locale에 따라 전환되며 URL path와 현재 feature mount는 바뀌지 않는다.

선택한 locale은 `localStorage`의 `comins-table-playground-locale` key에 저장되며 reload와 동일 origin의 route 이동 후 복원된다. 저장값이 없거나 접근할 수 없거나 유효하지 않으면 `"ko"`를 사용한다. 현재 locale은 `<html lang>`에도 동기화한다.

Route에는 locale prefix를 추가하지 않는다. API 및 prop 이름, code sample source, JSON key, `data-testid`, fixture identifier는 두 언어에서 동일하게 유지한다.

## Route 구성

- `/docs/getting-started`: 설치, CSS import, 첫 번째 DataTable 예제
- `/examples/basic`: legacy URL 호환용 redirect. 실제 화면은 `/docs/getting-started`로 이동한다.
- `/examples/crud`: 30 Row를 기준으로 행 추가, 선택 행 수정, 선택 행 삭제, 초기화. Owner 전용 필터와 별도 pagination control은 제공하지 않는다.
- `/examples/size`: `300px` 기본 높이와 상위 컨테이너 `500px`를 따르는 테이블 높이 예제. 기존 브라우저 `100%` 예제 카드는 제거되었다.
- `/examples/theme`: CSS custom properties, theme class, rowHeight 동기화 계약
- `/examples/loading`: Infinite Scroll과 같은 원격 API를 사용한 0 Row 초기 skeleton, 30개 매핑 Row 재조회 overlay, 실제 빈 응답과 ready 상태
- `/examples/header`: 1Depth Header 이동, resize, 컬럼 설정 저장/불러오기, Header 표시 토글, Header 컬럼별 Checkbox Select Box 숨김/표시, Multi-column Sort. 컬럼 설정 저장/불러오기는 컬럼 표시 상태도 함께 저장한다. 다중 정렬 예제는 일반 클릭 또는 `Enter`/`Space`의 단일 정렬과 `Shift` 조작의 조건 추가를 구분하고 현재 `CominsSortModel`을 함께 출력한다.
- `/examples/column-groups`: 2Depth Header 이동, resize, child Column MultiSelect와 parent Group 토글을 조합한 숨김/표시. `/examples/header-groups`는 legacy URL 호환용 redirect로 유지한다.
- `/examples/column-pinning`: 좌우 Column 및 Header Group 고정, 중앙 가로 스크롤, responsive demotion과 Summary 정렬
- `/examples/body`: legacy URL 호환용 redirect. 실제 화면은 `/performance/virtualization`으로 이동한다.
- `/examples/cell`: `cell.format`, `cell.props`, `cell.renderer`, cell event Alert, clipboard guard
- `/examples/selection-clipboard`
- `/examples/fill-handle`: `rowSelectionOnClick={false}`로 Row·Cell·Range 독립 선택, 선택 조회 API, 명시적인 Cell/Row 복사와 `onChangeSelection` 표시. `clipboard`로 OS 복사를 활성화하며 Ctrl/Cmd+V는 Column guard를 적용한 내부 버퍼를 사용한다.
- `/examples/component`: Header와 Cell에 적용되는 built-in component와 custom renderer. Component 예제는 렌더링 결과 중심으로 표시한다.
- `/examples/row`: drag handle reorder, `rowProps.draggable`, row disabled, row custom formatting, row event Alert, row keyboard copy/paste
- `/examples/row-expand`: semantic Detail Row, controlled expanded ID, fixed/auto height, 480px Table frame 안의 960px tall Detail scroll
- `/examples/row-grouping`: application-owned Group CRUD, Group/Row Drag, custom Group content/style, Group별 정렬과 가상화
- `/examples/cross-table-drag`: shared Coordinator를 통한 Row 및 전체 Group bundle 이동, duplicate ID 거부/덮어쓰기
- `/examples/column-filtering`: controlled Header Filter, Group과 Summary 연동, text/number/date/boolean operator
- `/examples/summary-row`: 기본 집계, visible-column `colSpan`, 집계 결과 `format`, Row/Cell class 및 style
- `/examples/tree-grid`: 30개 기본 node, 배열 기반 ref expand/fold, `defaultExpandAll`, Component/Renderer Cell, 10000개 node virtualization. 기본/Style/Component/Renderer 예제는 처음부터 펼쳐지고 ref 제어 예제만 접힌 상태로 시작한다.
- `/examples/context-menu`: callback 기반 row/cell context menu, 선택된 Row 우클릭 시 selection 유지, 선택 0/1/N action matrix, payload preview
- `/examples/export`: `exportCominsRowsToCsv`, `exportCominsRowsToJson` helper 출력 예제
- `/api/props`: 현재 구현된 props, events, ref/core 항목
- `/api/ref`: 현재 구현된 ref method와 core helper 경계
- `/performance/infinite-scroll`: 소비자가 rows와 요청 lifecycle을 소유하고 `onLoadMore`, `hasMoreRows`, `loadingMore`를 연결하는 Controlled Infinite Scroll 예제
- `/performance/lazy-load`: 1,000개 예제 데이터를 100개씩 불러오는 append-mode 비동기 로딩, 취소, 재조회, 마지막 데이터 상태
- `/performance/virtualization`: 10만 Row 기본 로드, virtualized large-row 사용 기준과 검증 주의사항
- `/performance/auto-row-height`: 일반 Row의 자동·숫자 높이, 동적 Renderer 변경과 가변 높이 가상화
- `/performance/viewport-datasource`: 알려진 전체 건수의 구간 조회, 캐시·취소·재시도·절대 인덱스, 자동 높이 결합

왼쪽 메뉴는 구현된 기능만 노출한다.
`/examples/basic`, `/examples/body`는 기존 링크 호환을 위해 route만 유지하고 왼쪽 메뉴에는 노출하지 않는다.
검색은 현재 locale의 문서 metadata와 route path를 대상으로 한다. Version switcher, MDX pipeline, 미구현 roadmap 전용 페이지는 현재 playground 범위에 포함하지 않는다.

## 예제 데이터와 상태 정책

- 문자열은 왼쪽, 숫자는 오른쪽, 컴포넌트·Boolean·고정 형식 날짜는 가운데로 정렬합니다. 컴포넌트 문구는 행 데이터에 연결되어 드래그한 값의 이동을 확인할 수 있습니다.
- Column Filtering의 Empty는 빈 그룹 유지 동작을 보여주며 해당 예제에서는 Row Drag가 비활성화됩니다. Row 기본의 Data 2는 드래그만 금지하고, Row 잠금의 Data 4는 선택·드래그·이벤트·키보드 포커스를 제한합니다.
- Context 추가는 새 Row를 맨 위에 넣고 삭제는 선택된 모든 Row를 제거합니다. 조회·수정은 메뉴 이벤트와 payload를 확인합니다.
- Paste & Fill의 두 값 TSV 원본은 세 번째 컬럼을 유지합니다. 끝의 탭은 명시적인 빈 다음 Cell이므로 해당 값을 지웁니다. 원본에 없는 컬럼까지 비우지는 않습니다.
- Basic, CRUD, Header, Header Group, Cell, Components, Row, Context Menu, Selection/Clipboard, Export, Ref API의 일반 예제는 deterministic 30 Row를 사용한다.
- Multi-column Sort 6 Row와 pagination, lazy load, infinite scroll, Row Expand, Tree의 목적별 fixture는 각 기능 계약에 맞는 크기를 유지한다.
- Loading은 Infinite Scroll과 같은 원격 사용자 API를 매핑한다. Initial은 0 Row skeleton, ready/refetch는 30개 매핑 Row, refetch는 기존 Row 위 overlay, Empty는 범위를 벗어난 실제 빈 응답을 사용한다.
- Header Group parent를 끄더라도 child MultiSelect 선택은 유지되며 parent를 다시 켜면 선택된 child가 복원된다.
- 960px tall Row Detail은 480px Table frame 안에서 semantic Detail Row로 유지된다. Table body가 scroll을 소유하므로 Detail 다음 owner Row까지 접근할 수 있다.
- CRUD의 Column 이름과 수정 가능한 데이터 키는 `column1`–`column6`이다. 별도의 내부 `id`로 Row 식별자를 유지하며 6개 필드를 모두 수정할 수 있다. 다른 데이터 Column도 field 이름을 표시한다.
- Lazy Load는 1,000개 Row를 100개씩 250ms 지연·취소와 함께 시뮬레이션하며, 원격 API를 쓰는 Loading/Infinite Scroll 예제와 구분한다.
- Header Group의 형제 Column은 같은 너비로 시작한다. Grouped Pinning은 이동을 허용하고 Row Grouping 자체 control에서 이동 제한을 확인한다.
- Summary 예제는 결과 Column 직전까지 label을 병합하며 pin 경계를 유지한다.
- Tree 이동 예제는 부모 변경과 자동 높이를 활성화한 상태로 시작한다. 라이브러리 기본값은 opt-in을 유지한다.

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

## 0.1.11 옵션 조작

Boolean 예제 옵션은 토글 버튼을 사용합니다. 강조색은 활성, 테두리 상태는 비활성을 뜻하며 클릭·Enter·Space로 전환합니다. Row 선택, Checkbox 컴포넌트 예제, MultiSelect 항목은 선택용 체크박스를 유지합니다.

Auto row height 예제는 긴 콘텐츠·좁은 너비·Row Detail 토글과 첫 번째 Row Renderer 내부의 콘텐츠 펼침 토글을 제공합니다. Tree 이동 예제는 부모 변경과 자동 높이가 활성 상태로 시작합니다. Viewport는 자동 높이·느린 응답·오류 응답 토글을 제공합니다. 검색 결과 변경은 데이터셋을 초기화하며, 오류 응답을 끈 다음 Retry로 실패 구간을 다시 조회할 수 있습니다.
