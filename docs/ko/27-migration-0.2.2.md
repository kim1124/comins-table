# 0.2.2 렌더링 API 전환

[문서 홈](../README.md) · [한국어 가이드](README.md) · [English](../user/27-migration-0.2.2.md) · [Cell Playground](http://127.0.0.1:4002/examples/cell) · [변경 기록](../../CHANGELOG.md)

이 문서는 예정된 0.2.2 개발 변경을 설명합니다. 배포된 0.2.1은 아직 새 경로를 지원하지 않습니다. 요소와 컴포넌트 모두 UI 커스터마이징 진입점으로 `render`를 사용합니다. 이 설정은 어댑터에 속하며 `/core`는 프레임워크 중립 경계를 유지합니다.

| 기존 속성 | 표준 속성 |
| --- | --- |
| `column.cell.renderer` | `column.cell.render` |
| `column.header.renderer` | `column.header.render` |
| `renderRowDetail` | `rowDetail.render` |
| `rowGrouping.getGroupLabel` | `rowGrouping.label.render` |
| `rowGrouping.renderGroupContent` | `rowGrouping.content.render` |
| `treeSlots.leading/content/trailing` 콜백 | 각 슬롯의 `{ render }` 객체 |
| `tableTransfer.rejectionFeedback.renderTooltip` | `tableTransfer.rejectionFeedback.tooltip.render` |
| `loadingComponent` | `loadingContent.render: () => content` |
| `emptyComponent` | `emptyContent.render: () => content` |

기존 속성은 0.x에서 동작을 유지합니다. 제거 대상은 0.3.0이 아닌 1.0.0이며 제거 날짜는 정하지 않았습니다. 그룹 라벨 콜백이 그룹 자체를 받는 것을 포함해 기존 인자는 유지합니다. Tree 슬롯은 기존 함수와 표준 객체를 혼용할 수 있습니다.

새 콜백이 있으면 우선하며 없거나 undefined이면 기존 경로를 사용합니다. 새 콜백의 `undefined`는 기본 콘텐츠, `null`·`false`·빈 문자열은 빈 콘텐츠이며 `0`은 표시합니다. 새 콜백을 선택한 뒤에는 기존 콜백을 호출하지 않습니다. 오류는 기존 React 오류 경계로 전달합니다.

기존 반환 규칙은 유지합니다. 기존 셀/헤더 콜백의 undefined는 빈 콘텐츠이며 그룹 라벨·이동 거부 안내는 nullish 기본값을 사용합니다. 전환 시 기본값은 undefined, 숨김은 null로 표현하십시오.

`format`, `aggregate`, 정적 `label`, 내장 `components`, 클래스·스타일의 역할은 유지합니다. Summary의 `summary.columns[id].render`는 집계 → format 이후 실행하며 `value`와 `formattedValue`를 받습니다. 외부 td/tr/th, Tree 들여쓰기·펼침 버튼, 상세 행 높이, 로딩 스피너·이동 거부 처리 및 기존 Tree/Viewport 제한은 Table이 소유합니다.

## React 예제

<!-- comins-doc-example: compile=render-api -->
```tsx
import { CominsTable, type CominsTableColumn } from "comins-table";
type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 10 }];
const columns: CominsTableColumn<Row>[] = [{ field: "score", label: "Score",
  header: { render: ({ column }) => <strong>{column.label}</strong> },
  cell: { render: ({ value }) => <strong>{String(value)}</strong>,
    tooltip: { render: ({ row }) => <span>Score: <b>{row.data.score}</b></span> } },
}];
export function RenderingExample() {
  return <CominsTable columns={columns} data={rows} getRowId={row => row.id}
    expandedRowIds={["a"]} rowDetail={{ render: ({ row }) => <span>{row.data.score}</span> }}
    loadingContent={{ render: () => <span>Loading</span> }} emptyContent={{ render: () => <span>No rows</span> }}
    summary={{ columns: { score: { aggregate: "sum", format: ({ value }) => `Total ${value}`,
      render: ({ formattedValue }) => <strong>{formattedValue}</strong> } } }} />;
}
```

렌더 콜백은 일반 함수입니다. `<StatusBadge />`를 반환하여 React가 컴포넌트를 실행하도록 하며 컴포넌트 함수나 Hook을 콜백 안에서 직접 호출하지 않습니다. Hook은 반환하는 컴포넌트 내부에 둡니다. 다른 프레임워크 템플릿은 ReactNode를 강제하지 않고 어댑터 생명주기를 따릅니다. 해당 어댑터의 출시 완료 선언은 아닙니다.

## 커스텀 셀 툴팁

`cell.tooltip: string` 및 기존 콜백은 문자열 title 표시를 유지합니다. 기존 비문자열 반환은 계속 표시하지 않습니다. 배지·아이콘·컴포넌트를 표시하려면 `cell.tooltip: { render }`를 사용하십시오. 기존 콜백의 재해석이 아닌 기능 확장입니다.

hover·셀 포커스·Escape·툴팁 표면으로의 포인터 이동을 지원합니다. 스크롤·크기 변경·셀 제거/재사용·unmount 시 툴팁과 aria-describedby를 정리합니다. role=tooltip을 사용하며 정보 표시용입니다. 포커스가 필요한 버튼/폼은 별도 애플리케이션 팝오버로 구성하십시오. 네이티브 title과 커스텀 툴팁은 중복 표시하지 않습니다.

값 목록 필터의 예정된 `filter.trigger.render`, `filter.option.render`, `filter.panel.render`는 별도 필터 구현이 필요하며 이번 개발 변경에서 사용할 수 없습니다. Excel/CSV와 공식 Vue 지원도 별도 범위·완료 검증을 따릅니다.

## 신규 값 목록 필터

[값 목록 가이드](21-column-filtering.md): filter.mode:values, operator:in과 trigger/option/panel.render는 0.2.2 신규 기능이다. 기존 조건 필터와 속성을 유지한다.

## XLSX files

미발행 0.2.2 후보는 일반 행 타입을 유지하는 `comins-table/xlsx`를 추가합니다. 엔진은 기본 설치에 포함되고 기존 root/Core API는 독립성을 유지합니다. 수식 캐시·날짜·시트·한도·Worker 계약은 [파일 API](14-export.md#xlsx-022-candidate)를 참고하십시오.
