import { BasicCrudFeature } from "./BasicCrudFeature";
import { BasicFeature } from "./BasicFeature";
import { BodyFeature } from "./BodyFeature";
import { CellFeature } from "./CellFeature";
import { ComponentFeature } from "./ComponentFeature";
import { ContextMenuFeature } from "./ContextMenuFeature";
import { HeaderFeature } from "./HeaderFeature";
import { RowFeature } from "./RowFeature";
import { SizeFeature } from "./SizeFeature";
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
    description: "선택된 Row를 기준으로 추가, 수정, 삭제, 조회, 페이징을 확인하는 예제 페이지입니다.",
    id: "basic-crud",
    label: "CRUD 동작",
    options: [
      { description: "Row 추가, 수정, 삭제를 수행할 원본 배열", example: "useState(createExampleRows(100))", name: "data" },
      { description: "선택 상태 변경 callback", example: "onChangeSelection={syncSelection}", name: "onChangeSelection" },
      { description: "클릭한 Row를 수정 대상으로 지정", example: "onClickRow={({ row }) => ...}", name: "onClickRow" },
      { description: "현재 페이지와 페이지 크기", example: "{ pageIndex, pageSize: 30 }", name: "pagination" },
    ],
    summary: "선택 행 기준의 추가, 수정, 삭제, 초기화, 조회, 페이징 예제입니다.",
  },
  {
    Component: SizeFeature,
    description: "테이블이 부모 크기와 브라우저 리사이즈에 반응하는 방식을 확인하는 예제 페이지입니다.",
    id: "size",
    label: "테이블 사이즈",
    options: [
      { description: "높이를 수동으로 지정한 컨테이너", example: "height: 320px", name: "manual height" },
      { description: "상위 요소 크기를 따라가는 테이블", example: "height: 100%", name: "parent size" },
      { description: "브라우저 높이에 반응하는 컨테이너", example: "height: clamp(..., 42vh, ...)", name: "responsive height" },
    ],
    summary: "수동 높이, 상위 컨테이너 크기, 브라우저 리사이즈 반응 예제입니다.",
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
    summary: "헤더 표시/숨김, 정렬, 컬럼 위치와 너비 저장 예제입니다.",
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
      { description: "Cell 컨텍스트 메뉴 callback 활성화 여부", example: "cellContextEnabled", name: "cell context control" },
    ],
    summary: "행 또는 셀을 우클릭해 단일 행 선택과 callback 기반 컨텍스트 메뉴 데이터를 확인하는 예제입니다.",
  },
];

export function findFeature(id: FeatureId) {
  return featureRegistry.find((feature) => feature.id === id) ?? featureRegistry[0]!;
}
