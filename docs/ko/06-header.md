# Header

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/06-header.md) · [Header](http://127.0.0.1:4002/examples/header) · [Header Group](http://127.0.0.1:4002/examples/column-groups)

Header는 표시/숨김, DOM props, label, column boundary resize, column move, keyboard sort, `aria-sort`, animated sort indicator, layout save/load를 제공한다. Layout save/load는 ref method로 처리한다.

```tsx
const tableRef = useRef<CominsTableRef<Row>>(null);

<CominsTable
  ref={tableRef}
  columns={[
    {
      field: "name",
      header: { props: { className: "name-header", title: "Full name" } },
      label: "Full Name",
      sort: true,
    },
    { field: "age", label: "Age", sort: true },
  ]}
  data={data}
  getRowId={(row) => row.id}
  onChangeColumnLayout={(layout) => setLayout(layout)}
  onChangeSort={(sort) => setSort(sort)}
  showHeader={showHeader}
/>

const saved = tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(saved);
tableRef.current?.setSortState({ columnId: "age", direction: "desc" });
tableRef.current?.clearSort();
```

## Multi-column Sort

기본값은 기존 단일 정렬이다. `multiSort`를 명시하면 `Shift` 조작으로 우선순위가 있는 복수 정렬 조건을 만들 수 있고 `onChangeSortModel`로 전체 모델을 확인할 수 있다.

```tsx
const [sortModel, setSortModel] = useState<CominsSortModel>([]);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={data}
  multiSort
  onChangeSortModel={setSortModel}
/>

tableRef.current?.setSortModel([
  { columnId: "department", direction: "asc" },
  { columnId: "salary", direction: "desc" },
]);
```

동작 기준:

- 일반 click 또는 `Enter`/`Space`는 기존 단일 `none -> asc -> desc -> none` cycle을 유지한다.
- `Shift`와 click 또는 `Enter`/`Space`를 함께 사용하면 새 `asc` 조건 추가, 기존 조건 방향 변경, `desc` 조건 제거를 수행한다.
- Header 숫자 badge는 1부터 시작하는 비교 우선순위다. 중간 조건을 제거하면 이후 우선순위가 자동으로 당겨진다.
- `getSortModel()`/`setSortModel(model)`은 전체 모델을 조회·복원한다. 기존 `getSortState()`/`setSortState(rule)`은 단일 호환 API이며 `setSortState`는 전체 모델을 하나의 조건으로 교체한다.
- `clearSort()`는 전체 조건을 제거한다. `onChangeSort`는 첫 번째 조건을, `onChangeSortModel`은 전체 모델 변경을 관찰한다.
- 숨겨진 sortable Column의 조건은 유지하고, 제거되거나 `sort: false`가 된 Column의 조건은 모델에서 제거한다.
- 2 Depth Parent Header는 정렬되지 않으며 sortable child Column은 동일하게 복수 정렬에 참여한다.
- Tree Grid는 parent와 descendant를 평탄화하지 않고 각 sibling 집합에 같은 복합 comparator를 적용한다.

Multi-column Sort 중에는 첫 번째 조건에만 `aria-sort="ascending" | "descending"`를 적용한다. ARIA는 복수 정렬 우선순위를 직접 표현하지 않으므로 2순위 이후 Header에는 접근 가능한 priority 설명을 함께 제공한다.

## 2 Depth Header

2 Depth Header는 기존 flat `columns`를 유지하고, 별도 `columnGroups`로 부모 header를 정의한다.

```tsx
<CominsTable
  columns={[
    { id: "name", field: "name", label: "이름", sort: true },
    { id: "age", field: "age", label: "나이", sort: true },
    { id: "role", field: "role", label: "역할" },
  ]}
  columnGroups={[
    {
      id: "profile",
      label: "프로필",
      children: ["name", "age"],
    },
  ]}
  data={data}
/>
```

동작 기준:

- 최대 2 Depth만 지원한다. Group 안에 group을 넣는 N-depth 구조는 지원하지 않는다.
- Parent header는 `field`, `sort`, Cell/Header component slot을 갖지 않는다.
- Parent resize는 child column width 비율을 유지하면서 child widths를 함께 변경한다.
- Child `minWidth`/`maxWidth`에 걸리면 clamp 후 남은 width delta를 다른 child column에 재분배한다.
- Parent move는 child columns를 하나의 block으로 이동한다.
- Child column을 다른 group으로 이동하거나 group 밖으로 이동하는 동작은 지원하지 않는다.
- Parent group hide/show는 header만 숨기는 것이 아니라 child columns 자체의 effective visibility를 변경한다.
- Parent group을 다시 표시해도 child column의 개별 hidden 상태는 유지된다.
- Group 없는 column은 parent row에서 `rowSpan=2`로 표시된다.
- Header 전체 hide/show(`showHeader`)는 2 Depth와 별개이며 전체 header area를 표시하거나 제거한다.
- 2 Depth parent header cell은 child header 상단 border와 선이 겹치지 않도록 하단 border를 출력하지 않는다.

Header custom UI는 `header.renderer` 또는 `header.components`로 렌더링한다. `renderer`가 있으면 label과 components를 모두 대체한다.

```tsx
{
  field: "name",
  label: "Name",
  header: {
    renderer: ({ column }) => <span>{column.label}</span>,
  },
}
```

```tsx
{
  field: "role",
  label: "Role",
  header: {
    components: [
      {
        type: "select",
        direction: "right",
        options: [
          { label: "Owner", value: "Owner" },
          { label: "Viewer", value: "Viewer" },
        ],
        props: { value: "Owner" },
        onValueChange: ({ value }) => setHeaderFilter(value),
      },
    ],
  },
}
```

Header components는 배열 순서대로 렌더링되며 `direction`으로 label 왼쪽 또는 오른쪽에 붙인다. 기본값은 `direction: "left"`, `align: "center"`다. Built-in component 이벤트는 Header sort, resize, move 이벤트로 전파되지 않는다. `input`은 Cell input과 동일하게 `Enter` 또는 `Blur` 시점에만 변경 값을 commit한다.

Phase 2 Header components는 `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, `menu`를 지원한다. `menu`는 Header 전용이며 `document.body` portal과 fixed position으로 버튼 바로 아래에 popover를 표시한다. `popup`은 built-in으로 제공하지 않는다.

```tsx
{
  field: "status",
  label: "상태",
  header: {
    components: [
      {
        type: "menu",
        direction: "right",
        items: [
          { label: "상태 확인", value: "status-check" },
          { type: "divider" },
          { label: "도움말", type: "label" },
        ],
        onBeforeChange: ({ open }) => open,
        onOpenChange: ({ open }) => setMenuOpen(open),
        onSelect: ({ value }) => handleHeaderMenu(value),
      },
    ],
  },
}
```

동작 기준:

- 컬럼과 컬럼 경계는 resize 영역이며 cursor는 `col-resize`다.
- Resize line은 평소에는 숨겨지고, 컬럼 경계에 hover하거나 resize 중일 때만 표시된다.
- 최초 resize width는 현재 렌더링된 `TH`의 실제 너비를 기준으로 계산한다.
- TH body 영역은 column move 후보 영역이며 cursor는 `grab`이다.
- 마우스 왼쪽 버튼을 누른 상태에서 수평 이동이 수직 이동보다 크고 6픽셀에 도달하면 column move mode가 즉시 활성화되며 cursor는 `grabbing`이다.
- 6픽셀 미만에서 Pointer Up하면 일반 click과 sort 동작을 유지한다. 수직 이동 의도가 확인되면 대기 중인 column move와 sort를 모두 취소한다.
- Column move mode에서는 원본 Header를 현재 Header 배경보다 더 어두운 점선 source placeholder로 표시하고, plain Column 또는 Group 이름을 계속 보이게 하며 이동 중인 header ghost와 drop marker를 함께 표시한다. 이 presentation-only source label은 custom Header renderer를 호출하지 않는다.
- 기본적으로 Header 좌측에 24px 이동 Handle과 15px 장식용 Radix SVG icon(`aria-hidden="true"`)을 표시하며 Handle은 즉시 이동 mode를 활성화한다. Header 전체의 기존 6픽셀 gesture도 유지한다. `showColumnMoveHandle={false}`이면 Handle만 숨긴다.
- Column 또는 Group에 `lockPosition: true`를 지정하면 해당 위치를 고정한다. 잠긴 Header는 Handle을 표시하지 않고 직접 이동할 수 없으며, 다른 Header도 잠긴 위치를 가로지르거나 밀어낼 수 없다.
- 같은 depth와 parent의 유효한 target은 파란색 2px 테두리, marker, 저투명도 배경으로 표시한다. depth, parent 또는 position lock을 위반한 target은 같은 형태의 붉은색 표시와 `not-allowed` cursor를 사용한다. Header content 자체의 opacity는 변경하지 않는다.
- 유효한 이동을 반영하면 Header, 현재 렌더링된 Body Cell과 Summary Cell이 새 수평 위치로 짧게 이동한다. `prefers-reduced-motion: reduce`에서는 transition을 적용하지 않는다.
- built-in Header control을 유지하기 위한 기본 최소 Column 너비는 88px다. Label은 말줄임될 수 있고, 더 넓은 custom Header content는 별도 `minWidth`를 지정한다.
- 유효한 target 위에서 Pointer Up한 경우에만 이동을 반영한다. Pointer cancel, `Escape`, window blur는 layout 변경 없이 취소한다.
- non-mouse pointer 입력은 1초 long-press 호환 동작을 유지한다.
- Parent group도 동일한 동작을 사용하며 child columns를 하나의 block으로 이동한다.
- Sort cycle은 `none -> asc -> desc -> none`이다.
- Sort 가능한 Header는 focus 가능하며 `Enter` 또는 `Space`로 sort cycle을 실행한다.
- Sort 가능한 Header는 `aria-sort="none" | "ascending" | "descending"` 상태를 노출한다.
- 정렬 표시는 `asc`, `desc`, 미정렬 상태별 장식용 Radix SVG icon(`aria-hidden="true"`)을 사용한다. Header의 기존 click 및 `Enter`/`Space` keyboard cycle과 `aria-sort` 노출 계약은 유지한다.
- Header menu 버튼 클릭은 sort, resize, column move를 발생시키지 않는다.
- Header menu는 바깥 클릭, `Escape`, item 선택 시 닫히며 `onBeforeChange`가 `false`를 반환하면 open/close를 취소한다.
- Multi-column Sort는 `multiSort`를 명시한 경우 `Shift` 조작으로 활성화되며 각 Header에 우선순위 badge를 표시한다.

## Column Filter

`columns[].filter`를 설정하고 controlled `columnFiltering` state를 전달하면 Header 우측의 sort metadata 뒤와 resize 앞에 Filter control을 렌더링한다. Semantic button과 fixed popover는 pointer, click, double-click, keyboard event를 Header sort, resize, move에서 격리한다. Application이 전체 Filter model과 현재 열린 Column ID를 모두 소유한다.

지원 operator, read-only 동작, 정렬, Summary와 Row Grouping 결합은 [Column Filtering guide](https://github.com/kim1124/comins-table/blob/main/docs/ko/21-column-filtering.md)와 [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering)에서 확인한다.

Playground 검증 기준:

- `헤더` 예제는 resize와 move를 같은 pointer 흐름에서 검증한다.
- Header 숨김/표시 예제는 전체 Header area toggle과 컬럼별 Checkbox Select Box를 함께 제공한다. Select Box에서 선택 해제된 column id는 `columns` prop에서 제외되어 해당 컬럼 전체가 숨겨진다.
- Header 설정 저장/불러오기 예제는 column layout과 Select Box의 표시 column id를 함께 저장한다. 불러오기 시 column order/width와 숨김/표시 상태가 같이 복원된다.
- 2 Depth group 표시/숨김은 parent Group별 Checkbox로 검증한다. Parent를 끄면 child 전체가 숨겨지고 다시 켜면 끄기 전 child 선택이 복원된다.
- 컬럼 동적 표시 예제는 child Column MultiSelect와 parent Group Checkbox를 조합한다. 최종 표시 Column은 선택된 child와 활성 parent의 교집합이며 1Depth와 2Depth 모두 같은 동작을 확인한다.
- Header sort 접근성은 mouse click, keyboard `Enter`/`Space`, `aria-sort`, sort indicator 상태를 함께 검증한다.
- Multi-column Sort 예제는 2 Depth child Column의 `Shift` click/keyboard 조작, priority badge, 전체 Sort Model JSON을 함께 검증한다.
- Resize는 width 변경, 최초 drag jump 없음, column move 미발생을 함께 확인한다.
- Move는 마우스 수평 6픽셀 활성화, source placeholder, 이동 ghost, drop marker, 의도한 column order 변경을 함께 확인한다.
- 2 Depth Header는 parent resize 비율 유지, parent block move, child group 밖 이동 미지원, ungrouped `rowSpan=2`, header/body leaf cell geometry alignment를 함께 확인한다.
- Virtualized mode에서는 header/body가 다른 table이어도 resize 후 column left/width가 같아야 한다.
- 사용자가 header 위치, resize, sort 표시 문제를 지적한 경우 Playwright assertion 외에 screenshot 또는 DOM geometry evidence를 report에 남긴다.

[`/api/ref`](http://127.0.0.1:4002/api/ref) live 예제는 Flat Table에서 `setSortModel`, `clearSort`, `getColumnLayout`, `setColumnLayout`을 실행한다. Layout method는 현재 Column 순서, 표시 상태, width를 저장하고 복원한다.
