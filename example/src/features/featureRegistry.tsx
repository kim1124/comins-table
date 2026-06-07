import { AdvancedFeature } from "./AdvancedFeature";
import { BasicCrudFeature } from "./BasicCrudFeature";
import { BasicFeature } from "./BasicFeature";
import { BodyFeature } from "./BodyFeature";
import { CellFeature } from "./CellFeature";
import { ContextMenuFeature } from "./ContextMenuFeature";
import { CoreFeature } from "./CoreFeature";
import { HeaderFeature } from "./HeaderFeature";
import { RowFeature } from "./RowFeature";
import type { FeatureDefinition, FeatureId } from "./types";

export const featureRegistry: FeatureDefinition[] = [
  {
    Component: BasicFeature,
    id: "basic",
    label: "기본",
    summary: "행, 컬럼, 밀도, 테마, 행 스타일을 포함한 기본 KmsfDataTable 예제입니다.",
  },
  {
    Component: BasicCrudFeature,
    id: "basic-crud",
    label: "기본 CRUD",
    summary: "선택 행 기준의 추가, 수정, 삭제, 초기화, 조회, 페이징 예제입니다.",
  },
  {
    Component: HeaderFeature,
    id: "header",
    label: "헤더",
    summary: "헤더 표시, 너비 조절, 1초 길게 누른 컬럼 이동, 정렬, 컬럼 레이아웃 저장 예제입니다.",
  },
  {
    Component: BodyFeature,
    id: "body",
    label: "본문",
    summary: "10만 행과 100만 행을 대상으로 한 버추얼 스크롤 예제입니다.",
  },
  {
    Component: CellFeature,
    id: "cell",
    label: "셀",
    summary: "셀 포맷, 커스텀 렌더링, 스타일, 컨텍스트 메뉴, 클립보드 제한 예제입니다.",
  },
  {
    Component: RowFeature,
    id: "row",
    label: "행",
    summary: "행 스타일, 클릭, 더블클릭, 드래그 이동, 행 클립보드 예제입니다.",
  },
  {
    Component: ContextMenuFeature,
    id: "context-menu",
    label: "컨텍스트 메뉴",
    summary: "행 또는 셀을 우클릭해 단일 행 선택과 callback 기반 컨텍스트 메뉴 데이터를 확인하는 예제입니다.",
  },
  {
    Component: CoreFeature,
    id: "core",
    label: "핵심 기능",
    summary: "프레임워크 독립 상태 헬퍼, 선택 상태, 레이아웃 직렬화 예제입니다.",
  },
  {
    Component: AdvancedFeature,
    id: "advanced",
    label: "고급 기능",
    summary: "현재 구현된 core와 후속 고급 grid 기능의 경계를 보여주는 예제입니다.",
  },
];

export function findFeature(id: FeatureId) {
  return featureRegistry.find((feature) => feature.id === id) ?? featureRegistry[0]!;
}
