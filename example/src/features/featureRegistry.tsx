import { BasicCrudFeature } from "./BasicCrudFeature";
import { BasicFeature } from "./BasicFeature";
import { BodyFeature } from "./BodyFeature";
import { CellFeature } from "./CellFeature";
import { ColumnGroupFeature } from "./ColumnGroupFeature";
import { ComponentFeature } from "./ComponentFeature";
import { ContextMenuFeature } from "./ContextMenuFeature";
import { ExportFeature } from "./ExportFeature";
import { HeaderFeature } from "./HeaderFeature";
import { InfiniteScrollFeature } from "./InfiniteScrollFeature";
import { LazyLoadFeature } from "./LazyLoadFeature";
import { LoadingStateFeature } from "./LoadingStateFeature";
import { PaginationFeature } from "./PaginationFeature";
import { RowFeature } from "./RowFeature";
import { SizeFeature } from "./SizeFeature";
import { ThemeFeature } from "./ThemeFeature";
import type { FeatureDefinition, FeatureId } from "./types";

export const featureRegistry: FeatureDefinition[] = [
  {
    Component: BasicFeature,
    description: "@kmsf/data-table 기본 예제 페이지입니다.",
    id: "basic",
    label: "기본",
    options: [
      { description: "데이터 테이블 컬럼 항목", example: "[{ label: '이름', field: 'name' }]", name: "columns" },
      { description: "데이터 테이블 Row 배열", example: "createExampleRows(100)", name: "data" },
      { description: "Row ID를 안정적으로 반환", example: "(row) => row.id", name: "getRowId" },
      { description: "외부 useState와 연결되는 데이터 변경 callback", example: "onChangeData={setRows}", name: "onChangeData" },
      { description: "테이블 밀도와 기본 스타일", example: "{ density: 'compact' }", name: "theme" },
    ],
    summary: "기본 data, columns, getRowId, theme 예제입니다.",
  },
  {
    Component: BasicCrudFeature,
    description: "선택된 Row를 기준으로 추가, 수정, 삭제, 조회를 확인하는 예제 페이지입니다.",
    id: "basic-crud",
    label: "CRUD 동작",
    options: [
      { description: "Row 추가, 수정, 삭제를 수행할 원본 배열", example: "useState(createExampleRows(100))", name: "data" },
      { description: "선택 상태 변경 callback", example: "onChangeSelection={syncSelection}", name: "onChangeSelection" },
      { description: "클릭한 Row를 수정 대상으로 지정", example: "onClickRow={({ row }) => ...}", name: "onClickRow" },
    ],
    summary: "선택 행 기준의 추가, 수정, 삭제, 초기화, 조회 예제입니다.",
  },
  {
    Component: SizeFeature,
    description: "테이블이 수동 높이와 부모 크기를 따르는 방식을 확인하는 예제 페이지입니다.",
    id: "size",
    label: "테이블 사이즈",
    options: [
      { description: "높이를 수동으로 지정한 컨테이너", example: "height: 320px", name: "manual height" },
      { description: "상위 요소 크기를 따라가는 테이블", example: "height: 100%", name: "parent size" },
    ],
    summary: "수동 높이와 상위 컨테이너 크기 예제입니다.",
  },
  {
    Component: ThemeFeature,
    description: "CSS 변수와 theme class로 테이블 스타일을 즉시 전환하는 예제 페이지입니다.",
    id: "theme",
    label: "Theme",
    options: [
      { description: "배포 CSS에 포함된 샘플 theme class", example: "kmsf-data-table-theme--skyblue", name: "theme.className" },
      { description: "CSS 변수 override", example: "{ '--kmsf-data-table-header-split-border': '#278aa7' }", name: "theme.style" },
      { description: "가상 스크롤 행 높이 계산 기준", example: "rowHeight={32}", name: "rowHeight" },
    ],
    summary: "Basic, Dark, Skyblue, Mint, Gray, Orange 샘플 테마와 rowHeight 계약 예제입니다.",
  },
  {
    Component: LoadingStateFeature,
    description: "초기 로딩, 재조회 로딩, 빈 데이터 상태에서 Header와 Body가 어떻게 표시되는지 확인하는 예제 페이지입니다.",
    id: "loading",
    label: "Loading / Empty State",
    options: [
      { description: "초기 로딩과 재조회 로딩을 구분하는 상태", example: "loading={isLoading}", name: "loading" },
      { description: "초기 로딩 skeleton row 개수", example: "skeletonRowCount={5}", name: "skeletonRowCount" },
      { description: "데이터가 없을 때 출력할 fallback", example: "emptyComponent={<Empty />}", name: "emptyComponent" },
      { description: "기존 Row 위에 표시할 overlay", example: "loadingComponent={<Spinner />}", name: "loadingComponent" },
    ],
    summary: "초기 skeleton, 재조회 overlay, empty state와 Header 유지 예제입니다.",
  },
  {
    Component: HeaderFeature,
    description: "Header 포맷, 정렬, 스타일, 클래스, 레이아웃 저장을 확인하는 예제 페이지입니다.",
    id: "header",
    label: "Header 예제",
    options: [
      { description: "Header label, sort, format 기준 컬럼 정의", example: "{ label, field, sort }", name: "columns" },
      { description: "Header 표시 여부", example: "showHeader={showHeader}", name: "showHeader" },
      { description: "컬럼 위치와 너비 저장", example: "getColumnLayout()", name: "getColumnLayout" },
      { description: "컬럼 위치와 너비 불러오기/초기화", example: "setColumnLayout(layout)", name: "setColumnLayout" },
      { description: "컬럼 resize/reorder 상태 변경 callback", example: "onChangeColumnLayout={setColumnLayout}", name: "onChangeColumnLayout" },
    ],
    summary: "Header 기본 기능, 숨김/표시, 컬럼 설정 저장 예제입니다.",
  },
  {
    Component: ColumnGroupFeature,
    description: "2Depth Header 그룹의 부모 이동, 부모 리사이즈, 자식 컬럼 표시/숨김을 확인하는 예제 페이지입니다.",
    id: "column-groups",
    label: "Header 그룹",
    options: [
      { description: "부모 Header와 자식 column id 연결", example: "columnGroups=[{ children: [...] }]", name: "columnGroups" },
      { description: "부모 Header 리사이즈 시 자식 너비 비율 유지", example: "resize group header", name: "group resize" },
      { description: "부모 Header 이동 시 자식 컬럼 묶음 이동", example: "drag group header", name: "group reorder" },
      { description: "자식 컬럼을 columns prop에서 제외", example: "columns.filter(...)", name: "child visibility" },
    ],
    summary: "2Depth Header 그룹, 부모 이동/리사이즈, 자식 컬럼 표시/숨김 예제입니다.",
  },
  {
    Component: PaginationFeature,
    description: "pagination prop으로 pageIndex와 pageSize를 제어하는 예제 페이지입니다.",
    id: "pagination",
    label: "Pagination",
    options: [
      { description: "현재 페이지 index와 page size", example: "{ pageIndex, pageSize }", name: "pagination" },
      { description: "외부 페이지 이동 버튼", example: "setPageIndex(next)", name: "pagination controls" },
      { description: "페이지 이동 중에도 안정적인 Row ID", example: "getRowId={(row) => row.id}", name: "getRowId" },
    ],
    summary: "일반 데이터셋에서 pageIndex, pageSize, 외부 페이지 버튼을 확인하는 예제입니다.",
  },
  {
    Component: BodyFeature,
    description: "대용량 데이터와 virtualized Body 렌더링을 확인하는 예제 페이지입니다.",
    id: "body",
    label: "대용량 데이터 표시",
    options: [
      { description: "가상 스크롤 활성화", example: "virtualized", name: "virtualized" },
      { description: "대용량 Row 배열", example: "createRows(100_000)", name: "data" },
      { description: "전체 Row를 대상으로 한 페이지 크기", example: "{ pageSize: rows.length }", name: "pagination" },
    ],
    summary: "10만 행을 대상으로 한 버추얼 스크롤 예제입니다.",
  },
  {
    Component: InfiniteScrollFeature,
    description: "스크롤 하단 근접 시 원격 API에서 offset/limit batch를 받아 Row를 추가하는 예제 페이지입니다.",
    id: "infinite-scroll",
    label: "Infinite Scroll",
    options: [
      { description: "append-mode Lazy Load 활성화", example: "lazyLoad", name: "lazyLoad" },
      { description: "원격 API batch 크기", example: "lazyLoadBatchSize={40}", name: "lazyLoadBatchSize" },
      { description: "하단에서 load trigger가 발생하는 거리", example: "lazyLoadThreshold={140}", name: "lazyLoadThreshold" },
      { description: "offset, limit, signal로 원격 API 호출", example: "onLazyLoad={fetchRows}", name: "onLazyLoad" },
    ],
    summary: "원격 API batch를 append하는 infinite scroll 예제입니다.",
  },
  {
    Component: LazyLoadFeature,
    description: "onLazyLoad로 원격 datasource에서 offset/limit 기반 Row를 가져오는 예제 페이지입니다.",
    id: "lazy-load",
    label: "Lazy Load",
    options: [
      { description: "append-mode Lazy Load 활성화", example: "lazyLoad", name: "lazyLoad" },
      { description: "한 번에 가져올 Row 수", example: "lazyLoadBatchSize={30}", name: "lazyLoadBatchSize" },
      { description: "하단에서 load trigger가 발생하는 거리", example: "lazyLoadThreshold={140}", name: "lazyLoadThreshold" },
      { description: "현재 지원하는 append mode", example: 'lazyLoadMode="append"', name: "lazyLoadMode" },
      { description: "offset, limit, signal을 받아 Row와 total을 반환", example: "onLazyLoad={fetchRows}", name: "onLazyLoad" },
    ],
    summary: "DummyJSON 형태의 원격 API와 연결하는 append-mode Lazy Load 예제입니다.",
  },
  {
    Component: CellFeature,
    description: "Td Cell 포맷, 이벤트, 스타일, renderer, Context Menu를 확인하는 예제 페이지입니다.",
    id: "cell",
    label: "Td Cell 예제",
    options: [
      { description: "Cell custom renderer", example: "cell.renderer={({ row, value }) => ...}", name: "cell.renderer" },
      { description: "Cell click payload 확인", example: "onClickCell={({ row, column }) => ...}", name: "onClickCell" },
      { description: "Cell context menu callback", example: "onContextMenuCell={...}", name: "onContextMenuCell" },
      { description: "컬럼 단위 className, style, copy/paste 옵션", example: "columns[].cell.props", name: "cell.props" },
    ],
    summary: "Cell 포맷, 스타일, 이벤트, 컨텍스트 메뉴 예제입니다.",
  },
  {
    Component: ComponentFeature,
    description: "기본 제공 컴포넌트 renderer와 built-in 컴포넌트를 Header와 Cell에서 확인하는 예제 페이지입니다.",
    id: "component",
    label: "컴포넌트 예제",
    options: [
      { description: "Header 내부 lightweight 컴포넌트 배열", example: "header.components=[{ type:'button' }]", name: "header.components" },
      { description: "Cell 내부 lightweight 컴포넌트 배열", example: "cell.components=[{ type:'checkbox' }]", name: "cell.components" },
      { description: "Header 전용 popover menu", example: "header.components=[{ type:'menu', items }]", name: "header menu" },
      { description: "Cell 내부 다중 item virtual list", example: "cell.components=[{ type:'virtual-list', items }]", name: "cell virtual-list" },
      { description: "사용자 정의 React renderer", example: "header.renderer / cell.renderer", name: "renderer" },
      { description: "Input은 Enter 또는 Blur에서 변경 값을 commit", example: "onValueChange -> setRows(next)", name: "input commit" },
      { description: "Virtual List preview, More 확장, Search 필터링", example: "{ limit: 5, more, searchable }", name: "virtual-list UX" },
    ],
    summary: "Button, Input, Checkbox, Radio, Select, Toggle, Progress, Header Menu, Cell Virtual List, custom renderer 예제입니다.",
  },
  {
    Component: RowFeature,
    description: "Tr Row 스타일, 이벤트, 드래그 이동, 비활성화, 커스터마이징을 확인하는 예제 페이지입니다.",
    id: "row",
    label: "Tr Row 예제",
    options: [
      { description: "Row click, double click, context menu callback", example: "onClickRow / onDoubleClickRow", name: "row events" },
      { description: "Row 스타일, 비활성화, 드래그 가능 여부", example: "rowProps={{ className, disabled, draggable }}", name: "rowProps" },
      { description: "외부에서 Row 위치 이동", example: "setMoveTargetRow(targetIdx, sourceIdx)", name: "setMoveTargetRow" },
    ],
    summary: "Row 스타일, drag, disabled, custom 예제입니다.",
  },
  {
    Component: ContextMenuFeature,
    description: "Row 또는 Cell 우클릭 시 selection과 callback payload를 확인하는 예제 페이지입니다.",
    id: "context-menu",
    label: "Context Menu 예제",
    options: [
      { description: "Row 우클릭 callback", example: "onContextMenuRow={...}", name: "onContextMenuRow" },
      { description: "Cell 우클릭 callback", example: "onContextMenuCell={...}", name: "onContextMenuCell" },
    ],
    summary: "행 또는 셀을 우클릭해 단일 행 선택과 callback 기반 컨텍스트 메뉴 데이터를 확인하는 예제입니다.",
  },
  {
    Component: ExportFeature,
    description: "현재 rows와 export column 정의를 CSV 또는 JSON 문자열로 변환하는 helper 예제 페이지입니다.",
    id: "export",
    label: "Export Helper",
    options: [
      { description: "CSV 문자열 생성", example: "exportKmsfRowsToCsv({ columns, rows })", name: "exportKmsfRowsToCsv" },
      { description: "JSON 문자열 생성", example: "exportKmsfRowsToJson({ columns, rows })", name: "exportKmsfRowsToJson" },
      { description: "출력 순서와 Header 이름 override", example: "{ columnOrder, headerOverrides }", name: "export options" },
    ],
    summary: "CSV/JSON export helper 출력 예제입니다.",
  },
];

export function findFeature(id: FeatureId) {
  return featureRegistry.find((feature) => feature.id === id) ?? featureRegistry[0]!;
}
