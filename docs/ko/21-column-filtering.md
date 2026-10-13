# Column Filtering

<!-- comins-restriction: filtering-no-remote-loading -->

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/21-column-filtering.md) · [Playground](http://127.0.0.1:4002/examples/column-filtering)

![Controlled Column Filtering에 따른 Group Row와 Summary 갱신](../assets/comins-table-column-filtering.gif)

Comins Table은 application-owned flat `data`를 대상으로 controlled client-side Column Filtering을 제공합니다. 각 Column은 `columns[].filter`로 값 kind를 정의하고 application은 전체 `columnFiltering.model`과 현재 열린 Header Filter popover를 모두 소유합니다.

Text, number, UTC date, boolean, Summary Row, 정렬과 Row Grouping 결합 예제는 [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering)에서 확인합니다.

## Controlled 모델

<!-- comins-doc-example: fragment -->
```tsx
type Row = {
  active: boolean;
  amount: number;
  id: string;
  joinedAt: string;
  name: string;
};

const [model, setModel] = useState<CominsColumnFilterModel>([]);
const [openColumnId, setOpenColumnId] = useState<string | null>(null);

const columns: Array<CominsTableColumn<Row>> = [
  { field: "name", filter: { kind: "text" }, label: "Name", sort: true },
  { field: "amount", filter: { kind: "number" }, label: "Amount", sort: true },
  { field: "joinedAt", filter: { kind: "date" }, label: "Joined", sort: true },
  { field: "active", filter: { kind: "boolean" }, label: "Enabled", sort: true },
];

<CominsTable
  columnFiltering={{
    model,
    onChangeModel: setModel,
    onChangeOpenColumnId: setOpenColumnId,
    openColumnId,
  }}
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
/>
```

`CominsColumnFilteringConfig`는 application state를 내부에 저장하지 않습니다. `onChangeModel`은 한 Column 조건을 편집하거나 지운 뒤의 전체 next 배열을 전달합니다. `onChangeOpenColumnId`는 next Column ID 또는 `null`을 전달하며 이를 `openColumnId`에 반영하면 한 번에 하나의 popover가 열립니다.

`onChangeOpenColumnId`를 생략하면 Header Filter 버튼이 disabled됩니다. 외부에서 popover를 열었지만 `onChangeModel`을 생략하면 editor는 read-only입니다. Filter 버튼과 popover는 click, keyboard, pointer, 정렬, resize와 Column Move event를 격리합니다. 외부 pointer 입력과 `Escape`는 controlled callback으로 닫고 `Escape`는 trigger로 focus를 복귀시킵니다.

## Column 설정 및 operator

`CominsColumnFilterConfig<TData, TValue>`는 `CominsColumnFilterKind`를 사용하고 각 rule은 `CominsColumnFilterOperator`를 사용합니다. 다음 값을 지원합니다.

| Kind | Operators |
| --- | --- |
| `text` | `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals`, `isEmpty`, `isNotEmpty` |
| `number` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `between`, `isEmpty`, `isNotEmpty` |
| `date` | `number`와 같은 비교, 범위 및 empty operator |
| `boolean` | `equals`, `notEquals`, `isEmpty`, `isNotEmpty` |

Text 비교는 기본적으로 대소문자를 구분하지 않습니다. 정확한 대소문자 비교가 필요하면 Column Filter 설정에 `caseSensitive: true`를 지정합니다. 공백은 text 값이며 `null`, `undefined`, `""`만 empty입니다.

Number 비교는 finite numeric Row 값과 model 값만 사용합니다. `between`은 뒤집힌 양 끝 값을 inclusive 범위로 정규화합니다. Numeric이 아닌 Row 값과 `NaN`은 number rule과 일치하지 않습니다.

Date Filter는 UTC calendar day를 사용합니다. Model 값은 정확한 `YYYY-MM-DD` 문자열을 사용하며 Row 값은 UTC day로 정규화 가능한 valid Date, timestamp 또는 date string일 수 있습니다. Invalid calendar date는 강제 변환하지 않고 무시합니다.

일반 nested `field` 값과 비교 값이 다르면 `filter.getValue`를 사용합니다.

<!-- comins-doc-example: fragment -->
```tsx
{
  field: "owner",
  label: "Owner",
  filter: {
    kind: "text",
    getValue: ({ row }) => row.owner?.displayName,
  },
}
```

## 정규화

`CominsColumnFilterRule`은 `columnId`, `operator`, optional `value`, optional `valueTo`를 포함합니다. 서로 다른 Column rule은 AND로 결합합니다. 한 Column에 valid rule이 중복되면 첫 valid rule을 사용합니다.

Unknown Column, `filter`가 없는 Column, kind와 호환되지 않는 operator, invalid value와 malformed untyped entry는 무시합니다. Valid rule이 없으면 모든 source Row가 표시됩니다. 원본 `data` 배열과 business Row identity는 변경하지 않습니다.

## Projection, 정렬 및 Summary

Client-side projection 순서는 다음과 같습니다.

1. Source Row index를 Filter합니다.
2. 설정된 경우 Row Group membership을 구성합니다.
3. 기존 Row 정렬 정책을 적용합니다.
4. Flat pagination 또는 virtualization을 적용합니다.
5. Leaf Row와 Detail 각각의 고정·자동 높이 정책에 따라 렌더링합니다.

Summary Row 집계는 flat pagination 전에 filtered leaf Row를 사용합니다. Header 정렬은 Filter model을 변경하거나 재배치하지 않습니다. Flat `pageIndex`가 Filter 결과 범위를 벗어나면 마지막 page로 clamp합니다.

Filter로 숨겨진 selected Row ID와 expanded Row Detail ID는 dormant 상태를 유지하고 Filter 변경 후 다시 나타날 수 있습니다. Hidden Cell 또는 range selection은 visible projection이 필요한 address이므로 clear합니다.

## Row Grouping 결합

`columnFiltering`은 controlled 단일 Depth `rowGrouping`과 결합할 수 있습니다. Filtering은 Group membership 입력만 변경합니다.

- Filter 결과 member가 0개인 Group을 포함해 모든 explicit Group을 유지합니다.
- Application-owned `groups` 배열이 Group 위치와 순서 source of truth로 유지됩니다.
- Group count와 built-in aggregate는 filtered member를 사용합니다.
- 기존 Header 정렬은 각 Group 내부에서 독립 실행되고 Group Row를 재배치하지 않습니다.
- Controlled Group expansion ID는 유지됩니다.
- Group Drag는 filtered Row projection이 아닌 explicit Group model만 변경하므로 유지할 수 있습니다.

## 경계

Column Filtering은 CSR flat-data 기능입니다. Tree Grid, Viewport Datasource, Infinite Scroll, Lazy Load, `loadingMore` 또는 Row Drag와 결합할 수 없습니다. Model이 비어 있어도 `columnFiltering` 설정이 존재하면 Row Drag를 비활성화합니다. 잠재적으로 일부만 보이는 projection에서 Row 이동 의미가 모호하기 때문입니다. Grouped Filtering은 Row Grouping의 pagination 금지 조건도 그대로 적용합니다.

Server-side filtering, custom Filter editor renderer, OR group, Column별 multi-rule 평가, locale-aware text collation, fuzzy search, relative date, Tree filtering과 remote datasource filtering은 이번 release 범위 밖입니다. 필요한 경우 application이 자체 정책으로 controlled `data`를 만든 뒤 Comins Table에 전달할 수 있습니다.

## 값 목록과 커스텀 UI — 0.2.2 도입

0.2.2 후보 버전은 `filter.mode: "values"`를 추가한다. 기본값은 기존 `"condition"`이며 kind는 text/number/boolean/UTC 날짜의 비교 타입으로 유지한다. 같은 열의 선택값은 OR, 다른 열은 AND다. 체크마다 전체 application-owned model을 onChangeModel로 제안한다. 로컬 상태를 즉시 갱신하고 원격 저장은 별도로 처리한다. 콜백이 없으면 선택·Clear는 readonly이며 검색은 가능하다.

<!-- comins-doc-example: fragment -->
```tsx
const model: CominsColumnFilterModel = [
  { columnId: "status", operator: "in", values: ["Ready", "Blocked"] },
];
const columns: CominsTableColumn<{ status: string }>[] = [{
  field: "status", label: "상태", filter: {
    kind: "text", mode: "values",
    option: { props: { className: "status-option" }, render: ({ option }) => <strong>{option.label}</strong> },
    panel: { render: p => <section>
      <input {...p.getSearchInputProps()} />
      <label><input {...p.getSelectAllProps()} />검색 결과 전체 선택</label>
      <ul>{p.visibleOptions.map(option => <li key={option.id} {...p.getOptionContainerProps(option)}>
        <input {...p.getOptionProps(option)} />{p.renderOption(option)}<small>{option.count}</small>
      </li>)}</ul>
      <button {...p.getClearProps()}>초기화</button><button {...p.getCloseProps()}>닫기</button>
    </section> },
  },
}];
```

규칙 없음은 이후 추가되는 값도 포함하는 제한 없음이다. `in.values: []`는 0행이며 활성 필터로 유지된다. 현재 모든 값을 개별 체크한 상태는 명시적 스냅샷이다. Clear 또는 검색어 없는 전체 선택만 규칙을 제거한다. 검색은 옵션 목록만 좁히고 테이블 행을 직접 필터하지 않는다. 검색 중 전체 선택·해제는 검색 결과에만 적용하고 나머지 선택을 유지한다. 닫기/Escape는 적용된 체크를 유지하며 재개방하면 검색어가 초기화된다.

옵션은 페이지·그룹·가상화 이전의 전달된 전체 leaf 행에서 수집한다. 건수는 자신의 조건을 제외하고 다른 열 조건을 적용한다. 0건 옵션도 표시·선택 가능하다. 데이터에서 사라진 선택은 present=false/count=0으로 유지하며, 데이터 갱신 자체는 model을 변경하지 않는다. 저장값 CominsColumnFilterValue는 JSON 스칼라이며 객체 필드는 getValue로 스칼라를 반환한다. 원본 null/undefined/빈 문자열은 null 옵션으로 통합하고 0/false/공백은 구별한다. number는 유한한 실제 숫자만, text는 기존 caseSensitive, date는 UTC 일자 비교를 사용한다. 무효 member가 하나라도 있으면 in 규칙 전체를 무효로 처리하지만 유효한 빈 배열은 보존한다. 열마다 첫 유효 규칙 하나를 적용한다.

filter.getOptionLabel(value)은 표시·검색·접근성 이름을 위한 순수 문자열을 반환한다. 검색은 대소문자 비구분 부분 일치이며 값의 식별·비교는 바꾸지 않는다. JSX에서 검색 문자열을 추출하지 않는다. CominsColumnFilterOption.id는 안정적인 불투명 key이며 배열 index/DOM ID가 아니다. selectionMode의 all/include로 제한 없음/명시적 선택을 구별한다. 선택 옵션 수와 행 건수는 별개이며 사라진 선택도 옵션 수에 포함한다.

| 설정 | 교체 범위와 바인딩 |
| --- | --- |
| trigger.render | 실제 여는 요소. button에 getTriggerProps를 연결하거나 element:custom으로 HTMLElement의 button 역할·Enter/Space를 사용한다. |
| option.render | 배지·아이콘·라벨 콘텐츠. 기본 체크박스는 유지한다. |
| panel.render | 검색·선택 컨트롤과 section/ul/li 등 내부 태그. 실제 요소에 도우미를 연결하며 팝업 위치·외부 닫기 경계는 유지한다. |
| trigger.props/option.props/panel.props | className/style 또는 payload 콜백. 항목 wrapper는 getOptionContainerProps, 선택 컨트롤은 getOptionProps로 연결한다. |

CominsValueFilterTriggerRenderParams, CominsValueFilterOptionRenderParams, CominsValueFilterPanelRenderParams, CominsValueFilterActions가 React 계약이다. 패널은 query/options/visibleOptions, 선택 요약, setQuery/setOptionSelected/setVisibleSelected/clear/close와 renderOption을 제공한다. 커스텀 패널은 renderOption을 명시적으로 호출하며 option.render를 별도로 자동 삽입하지 않는다. 트리거의 값 목록 요약은 패널이 개방된 동안 제공하고 닫힌 열의 전체 옵션을 미리 수집하지 않는다. 복원된 기존 조건 규칙은 기존 editor를 사용하고 값 목록 panel/option render와 선택 요약을 제공하지 않는다. Clear 후 기본 mode로 돌아간다.

기본은 native checkbox 도우미를 사용한다. getOptionProps(option, { element: "custom" })은 checkbox 역할/aria-checked/Space·클릭 동작을 제공한다. getSelectAllProps도 native indeterminate/custom mixed를 지원한다. 사용자 이벤트와 ref를 합성하고 preventDefault면 내부 동작을 취소한다. 제어 값·역할·필수 ARIA는 보호한다. label/wrapper에 추가 toggle을 붙이지 않는다. 도우미·ref가 실제 DOM까지 연결되어야 키보드·포커스를 보장한다. Hook은 render 콜백이 아닌 반환된 컴포넌트 내부에서 사용한다.

render 반환 undefined는 기본 콘텐츠, null/false/빈 문자열은 해당 영역 없음, 예외는 오류 경계로 전달한다. 빈 trigger는 외부 controlled 개방이 필요하며 빈 panel도 owned dialog를 유지한다. Escape/Close는 살아 있는 trigger로 복귀하고 외부 pointer/Tab 이탈은 외부 포커스를 뺏지 않는다. non-modal dialog로 Tab을 가두지 않는다. 제거 시 ref/listener를 정리하며 ownerDocument를 따른다. comins-column-filter namespace/theme과 data-active/data-selected/data-readonly/data-present를 유지한다. panel.props는 내부 wrapper에 적용하고 위치를 담당하는 팝업 style을 덮어쓰지 않는다.

중립 소비자는 comins-table/core의 getCominsColumnFilterOptions, setCominsColumnFilterValues, normalizeCominsColumnFilterModel, getCominsFilteredRowIndexes를 사용한다. Core는 중립 columns/source rows, root 함수는 React 열을 받는다. CominsColumnFilterOptionsInput/CominsColumnFilterOptionsResult/CominsColumnFilterValuesAction은 순수 계산·불변 제안 타입이다. 지원하지 않는 대상 또는 활성 기존 조건의 옵션 결과는 null이며 선택 action은 model을 유지한다. Clear만 대상 규칙을 제거한다. Core로 React/DOM/render 설정을 전달하지 않는다.

배포된 0.2.1에는 신규 API가 없다. Tree/Viewport/Infinite/Lazy/서버 필터링 및 일반 행 드래그의 기존 제한을 유지한다. 옵션 목록 가상화는 제공하지 않으므로 고유 값이 많으면 비용이 커질 수 있다. Playground의 10,000행 측정 예제는 값을 자르거나 무제한 성능을 보장하지 않는다.
