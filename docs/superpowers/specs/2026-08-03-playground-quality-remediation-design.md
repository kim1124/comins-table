# Playground 품질 보정 설계

## 목적

사용자가 Playground에서 확인한 정렬, 선택, Header 이동, Loading/Empty,
Row Expand, Tree Grid, Context Menu, 예제 데이터, 영문/한글 혼용 문제를
정리한다. 공개 `CominsTable` API와 application-owned `data`/callback 계약은
유지하면서 실제 결함, 시각 피드백 부족, 예제 설명 부족을 분리해 보정한다.

## 범위 분리

작업은 두 개의 독립 실행 계획으로 나눈다.

1. **상호작용과 예제 품질:** Core 선택·Context Menu·Header drag 계약과
   CSS, Row Expand/Tree/Loading/CRUD/Context Menu 예제를 수정한다.
2. **Playground 다국어:** 첫 단계에서 화면 문구와 컨트롤 구성이 확정된 뒤
   Shell, 문서 메타, 검색, 모든 실행 예제를 `ko`/`en`으로 전환한다.

다국어를 나중에 수행하여 첫 단계에서 삭제·변경되는 버튼과 설명을 두 번
번역하지 않는다.

## 확정된 결정

### 아이콘과 의존성

- 외부 아이콘 패키지를 추가하지 않는다.
- 공통 SVG 아이콘 모듈도 이번 범위에서 만들지 않는다.
- 정렬 표시는 현재 `span` DOM을 유지하고 CSS filled triangle로 단순화한다.
- Tree/Row Detail/Pagination의 기존 text glyph는 크기와 정렬만 보정한다.
- `lucide-react` 금지와 package-artifact gate를 그대로 유지한다.

### 공개 API

- 공개 export path, props, types, `data`/callback ownership을 변경하지 않는다.
- Column 이동 유효성, selection, Context Menu 선택 정책은 기존 API 내부의
  상호작용 규칙으로 보정한다.
- `CominsTableRef.setSelectedRows([])` 등 기존 ref API만 예제에서 사용한다.

### 정렬과 선택

- 정렬은 Row ID 기반 selection을 유지한다.
- 정렬 후 선택 Row가 다른 위치로 이동해도 자동 스크롤하지 않는다.
- 신고된 선택 스타일 해제 현상은 실패하는 재현 테스트 없이 Core를
  변경하지 않는다.
- Cell Range는 Row selection을 제거하지 않는다. 선택된 Row의 Range Cell은
  Row selected 배경과 Cell range 경계를 동시에 인식할 수 있어야 한다.

### Header 이동

- mouse horizontal intent threshold `6px`와 touch long-press 계약을 유지한다.
- 이동 가능 Header는 hover에서 `grab`, 활성 이동 중 `grabbing`과 점선
  source placeholder를 표시한다.
- source placeholder는 현재 Header 배경보다 어두운 색으로 표시하고 원래
  너비를 유지한다.
- 유효한 drop target은 기존 accent marker를 사용한다.
- 다른 Header depth 또는 parent group 경계를 위반하는 target은 붉은색,
  `not-allowed`, 별도 invalid marker로 표시하며 commit하지 않는다.

### Row Expand

- Row Expand는 owner Row 다음의 semantic Detail Row로 유지한다.
- Popover로 교체하지 않는다. Popover는 anchor, focus, dismissal, viewport
  positioning 계약이 다른 별도 기능이다.
- 960px stress Detail은 유지하되 예제 Table을 `480px` frame 안에 배치하여
  Table body의 outer scroll로 Detail 이후 Row까지 연속 탐색할 수 있게 한다.

### Tree Grid

- expand/fold Core 동작은 유지한다.
- expander hit area는 `24px × 24px`, glyph는 `14px` 이상으로 확대한다.
- 기본·style·component·renderer 예제는 처음부터 펼친 상태로 통일한다.
- ref 제어 계약을 보여주는 `Expand / Fold` 예제만 초기 접힘을 유지한다.

### Context Menu

- 우클릭한 Row가 이미 선택 집합에 포함되면 현재 단일/다중 selection을
  유지한다.
- 우클릭한 Row가 선택되지 않았으면 해당 Row를 단독 선택한다.
- Cell 우클릭도 같은 Row selection 정책을 사용하면서 Cell focus를 갱신한다.
- 메뉴는 `조회`, `추가`, `수정`, `삭제` 네 항목으로 고정한다.
- 활성화 matrix는 다음과 같다.

| 선택 Row 수 | 조회 | 추가 | 수정 | 삭제 |
|---:|:---:|:---:|:---:|:---:|
| 0 | 활성 | 활성 | 비활성 | 비활성 |
| 1 | 활성 | 활성 | 활성 | 활성 |
| 2 이상 | 활성 | 활성 | 비활성 | 활성 |

- 메뉴 선택 시 실제 CRUD mutation 대신 기능 이름을 Playground Alert로
  출력한다.
- 선택 0개 상태는 `선택 해제`와 `메뉴 열기` 컨트롤로 재현 가능해야 한다.

### Playground 다국어

- locale은 `"ko" | "en"` 두 값만 지원한다.
- 기본 locale은 저장값이 없을 때 `ko`다.
- 검색 input 왼쪽에 `한 / EN` segmented toggle을 배치한다.
- locale은 `localStorage` key
  `comins-table-playground-locale`에 저장하고 `<html lang>`을 동기화한다.
- URL path는 locale과 무관하게 유지한다. locale prefix route를 만들지 않는다.
- Shell, Sidebar, 검색 인덱스, 문서 본문·요약, Feature title·description,
  버튼·상태·Alert·빈 상태 문구를 즉시 전환한다.
- API 이름, 코드 샘플, JSON key, `data-testid`, route path는 번역하지 않는다.
- 번역 누락 시 다른 언어로 조용히 fallback하지 않고 개발·테스트에서
  누락을 검출한다.

## 항목별 처리

| 번호 | 설계 처리 |
|---:|---|
| 1 | CSS filled triangle로 정렬 표시 교체 |
| 2 | Header와 CRUD 정렬 후 Row ID·class·computed background 회귀 테스트 |
| 3 | CRUD Owner filter 상태·버튼·설명 제거 |
| 4 | 전체 Playground `ko`/`en` locale 전환 |
| 5 | Loading/Empty를 deterministic 30 Row fixture로 구성하고 상태 설명 보강 |
| 6 | Header hover/active 이동 affordance 강화 |
| 7 | child Column MultiSelect와 parent Group visibility Checkbox 조합 |
| 8 | valid/invalid Header drop 상태 분리 |
| 9 | 어두운 source placeholder와 dashed outline 강화 |
| 10 | Virtual List More의 exclusive Row selection 회귀 테스트 유지 |
| 11 | 일반 예제는 30 Row, 계약 목적의 최소 fixture는 유지 |
| 12 | Row selected와 Cell Range 시각 상태 합성 |
| 13 | 960px Detail 예제를 480px Table frame 안에서 scroll |
| 14 | extension runtime 오류는 제품 코드에서 억제하지 않음 |
| 15 | Tree expander 확대와 예제 초기 상태 통일 |
| 16 | 선택 개수 기반 Context Menu 네 항목과 Alert |

## 일반 예제 Row 수 정책

다음 예제는 기본 표시 Row를 30개로 맞춘다.

- Basic, CRUD, Header, Header Group, Cell, Components, Row, Context Menu
- Selection/Clipboard, Loading Ready/Refetch, Export, Ref API

다음 fixture는 계약을 명확히 보여주기 위해 작은 크기를 유지한다.

- Multi-column Sort의 중복 primary key 6 Row
- Row Expand fixed/auto의 집중 fixture
- Empty와 initial loading의 0 data
- Pagination, Lazy Load, Infinite Scroll의 batch/total 계약
- Tree Grid의 30 regular node와 10,000 virtual node

## 컴포넌트 경계

- `src/index.tsx`: Context Menu selection과 Header pointer/drop 상태를 소유한다.
- `src/core.ts`: 기존 `moveCominsColumn`, `moveCominsColumnGroup`, Row ID
  selection helper를 재사용한다. 새 공개 helper는 만들지 않는다.
- `styles.css`: 배포 Table의 sort, selected/range, Header drag, Tree expander
  기본 스타일을 소유한다.
- `example/src/styles.css`: Playground frame, control, documentation Shell의
  layout만 소유하고 Core state style을 복제하지 않는다.
- 각 `*Feature.tsx`: 예제 fixture와 application-owned state만 소유한다.
- locale provider는 `example/src/i18n/`에 두며 라이브러리 `src/`에는 locale
  코드를 넣지 않는다.

## 테스트 전략

### Core와 DOM

- Vitest에서 sort-stable Row selection, Cell range 합성 class, Context Menu
  selection preservation, invalid Column target no-op를 검증한다.
- 기존 pointer termination, 6px intent, touch long-press, Escape cleanup을
  그대로 통과시킨다.

### Browser

- sort triangle pseudo-element geometry와 asc/desc transform을 검증한다.
- Header source placeholder, valid marker, invalid marker, cursor를 검증한다.
- CRUD 정렬 전후 같은 Row ID의 selected style을 검증한다.
- Virtual List More가 exclusive selection을 수행하는지 검증한다.
- Row selected와 Cell range가 동시에 보이는지 computed style로 검증한다.
- Row Expand tall frame 내부 scroll로 후속 owner Row가 보이는지 검증한다.
- Tree 각 예제에서 expand 후 fold가 가능하고 hit area가 24px 이상인지
  검증한다.
- Context Menu의 0/1/N matrix, Alert, selection preservation을 검증한다.
- locale 전환 후 route를 유지하고 Sidebar·본문·검색·Alert가 같은 locale을
  사용하며 reload 후 locale이 유지되는지 검증한다.

### 전체 게이트

- 상호작용 계획 완료 후 `npm run verify`와 전체 ordinary E2E를 실행한다.
- 다국어 계획 완료 후 다시 `npm run verify`와 전체 ordinary E2E를 실행한다.
- virtualization Core 계산과 memory counter는 변경하지 않으므로 performance
  gate는 기본적으로 제외한다. Row Expand scroll 계산을 변경하게 되면 즉시
  `npm run test:perf -- --workers=1`을 추가한다.

## 비범위

- 외부 또는 내부 공통 아이콘 모듈 신설
- Popover 기반 Row Detail
- Row editing, Cell editing, Fill Handle
- Row Grouping, Column Pinning/Pivot 구현
- Firefox, WebKit, 실제 Safari 지원 선언
- 버전 변경, npm publish, tag, GitHub Release, push, PR, merge
- 브라우저 extension의 `runtime.lastError` 메시지 억제

## 잔여 리스크

- Context Menu 우클릭 selection 정책은 기존 “항상 단일 선택” 문서와 E2E를
  변경하므로 영문·한글 문서 및 테스트를 같은 commit에서 갱신해야 한다.
- Range/Row/placeholder 색상은 여섯 Theme에서 명도 대비가 달라질 수 있다.
- 다국어는 모든 feature 문자열을 건드리므로 첫 번째 계획 완료 후 별도
  commit series로 수행해야 회귀 원인을 분리할 수 있다.
- 현재 작업은 `codex/row-expand`의 Row Expand 구현을 전제로 한다. 원격
  통합 전에는 이 계획의 결과도 같은 로컬 경계에 머문다.
