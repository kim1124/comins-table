# Row Grouping

Comins Table은 application-owned flat `data`를 client에서 그룹화합니다. Synthetic Group Row는 hierarchy와 aggregate 값만 나타내며 `TData`, business Row ID 또는 일반 Row/Cell callback payload로 노출되지 않습니다.

단일·다중 기준, hidden criterion, Row Detail, 집계와 100000개 leaf 가상화 예제는 [`/examples/row-grouping`](http://127.0.0.1:4002/examples/row-grouping)에서 확인합니다.

## Controlled 설정

```tsx
const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  multiSort
  rowGrouping={{
    aggregations: { amount: "sum", id: "count" },
    criteria: ["region", "team"],
    expandedGroupIds,
    onChangeExpandedGroupIds: setExpandedGroupIds,
  }}
  virtualized
/>;
```

`rowGrouping` prop에는 `CominsRowGroupingConfig<TData>`를 전달합니다. `criteria` 배열에는 Column ID 또는 `CominsRowGroupingCriterion`을 전달합니다. 존재하지 않는 Column과 첫 valid 항목 이후의 중복 Column은 제거합니다. Source Column이 hidden이어도 criterion은 유효하며, 별도로 숨기지 않은 source Column은 그대로 표시합니다.

Raw field를 다른 grouping key로 변환할 때 `getKey`를 사용합니다. `CominsRowGroupKey`는 string, finite number, boolean, valid `Date`, `null`을 지원합니다. `null`과 `undefined`는 `(empty)` Group, invalid Date, non-finite number, object, array, function, symbol은 `(unsupported)` Group으로 합칩니다. Object field를 그룹화하려면 `getKey`에서 supported key를 반환해야 합니다.

Group ID는 typed criterion path에서 생성되는 opaque deterministic string입니다. Label, sort와 expansion 변경으로 바뀌지 않습니다. `onChangeExpandedGroupIds`가 전달한 ID는 해석하지 않고 `expandedGroupIds`에 다시 전달합니다.

`expandedGroupIds`가 유일한 expansion source of truth입니다. `onChangeExpandedGroupIds`가 없으면 disclosure button은 disabled read-only 상태입니다.

## 집계와 정렬

`rowGrouping.aggregations`는 output Column ID에 `count`, `sum`, `avg`, `min`, `max`를 지정합니다.

- `count`는 empty 값을 포함한 모든 descendant leaf를 셉니다.
- Numeric reducer는 finite number만 사용합니다.
- finite number가 없으면 `sum`, `avg`, `min`, `max`는 빈 값입니다.
- 집계는 raw field를 읽으며 Cell renderer나 formatter를 호출하지 않습니다.
- Group expansion은 집계 입력을 변경하지 않습니다.

정렬은 hierarchy-first입니다. Active grouping Column의 sort rule은 해당 depth의 sibling Group만 정렬하고 leaf sort에서는 소비됩니다. 나머지 rule은 lowest-level Group의 leaf를 기존 Column comparator와 stable source-order tie로 정렬합니다. Grouping sort rule이 없으면 sibling Group은 첫 source occurrence 순서를 유지합니다.

## Leaf 전용 상호작용

Group Row는 current visible Column마다 Cell 하나를 렌더링합니다. 첫 visible Cell은 disclosure, indentation, criterion label과 group label이 있는 `<th scope="row">`이며, 나머지 Cell은 configured aggregate를 표시합니다. Group Row는 Cell renderer, formatter, tooltip, 일반 Row/Cell callback, selection, Clipboard, Row Detail 또는 drag를 실행하지 않습니다.

Visible leaf callback은 기존 의미를 유지합니다.

- `row.data`: original `TData`
- `row.dataIndex`: source `data` index
- `row.id`: business Row ID
- `row.index`: visible leaf index. Group Row는 index를 증가시키지 않습니다.

`expandedRowIds`, `onChangeExpandedRowIds`, `renderRowDetail`은 visible business leaf만 대상으로 합니다. Group collapse 후에도 selected Row ID와 expanded Detail ID는 dormant 상태로 유지합니다. 숨겨진 Cell/range는 한 번 clear합니다. 외부 controlled collapse로 focus된 leaf가 제거되고 focus가 Table에 속해 있었다면 가장 가까운 collapsed ancestor disclosure로 focus를 이동합니다.

Cell range highlight, copy와 paste는 현재 grouped leaf 순서를 따르며 synthetic Group Row를 포함하지 않습니다.

## 가상화와 금지 조합

Fixed-height Group/leaf Row는 arithmetic virtualization path를 공유합니다. Expanded fixed/automatic Row Detail은 owner data slot에만 높이를 추가하고 해당 projection을 mixed-height index로 전환합니다. Group slot에는 business Row ID와 source data index가 없습니다.

Row Grouping은 client-side flat-table 기능이며 다음과 결합할 수 없습니다.

- `pagination`
- `infiniteScroll`, `hasMoreRows`, `loadingMore`, `onLoadMore`
- `lazyLoad`, `onLazyLoad`
- `tree`
- `rowProps.draggable`
- imperative `setMoveTargetRow`

Public TypeScript prop이 금지 조합을 거부하며 untyped caller에 대해서도 runtime path를 inert 상태로 유지합니다. Column Pinning, Visual Fill Handle UI, server-side grouping, pivot, custom reducer, aggregate sort와 group selection은 이번 Row Grouping 범위가 아닙니다.
