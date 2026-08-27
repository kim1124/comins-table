# Row Grouping

Comins Table은 application-owned flat `data`를 application-owned 단일 Depth `groups` 모델 안에 렌더링합니다. 빈 Group을 포함한 `groups` 배열 순서가 실제 Group 순서이며 synthetic Group Row는 `TData`나 business Row ID가 되지 않습니다.

Explicit Group CRUD, Group/Row Drag, custom Group content/style, Row Detail, 집계, 정렬과 100000개 leaf 가상화 예제는 [`/examples/row-grouping`](http://127.0.0.1:4002/examples/row-grouping)에서 확인합니다.

## Controlled Group 모델

`CominsRowGroupingConfig<TData, TGroup>`은 application Row와 Group type을 유지합니다. Custom content는 `CominsRowGroupRenderParams<TData, TGroup>`를 받아 `group`, aggregate, expansion과 현재 `groupIndex`를 typed 상태로 사용합니다.

```tsx
type Group = { id: string; label: string };
type Row = { amount: number; groupId: string; id: string; name: string };

const [groups, setGroups] = useState<Group[]>([
  { id: "east", label: "East" },
  { id: "empty", label: "Empty" },
  { id: "west", label: "West" },
]);
const [rows, setRows] = useState<Row[]>(initialRows);
const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  rowGrouping={{
    aggregations: { amount: "sum", id: "count" },
    expandedGroupIds,
    getGroupId: (group) => group.id,
    getGroupLabel: (group) => group.label,
    getRowGroupId: (row) => row.groupId,
    groupDraggable: true,
    groups,
    onChangeExpandedGroupIds: setExpandedGroupIds,
    onChangeGroups: setGroups,
    setRowGroupId: ({ row, toGroupId }) => ({
      ...row,
      groupId: String(toGroupId),
    }),
  }}
  rowProps={{ draggable: true }}
  virtualized
/>;
```

`groups`가 유일한 Group 순서 source of truth입니다. Group 객체에 `index`나 `order` 위치를 중복 저장하지 않습니다. `getGroupId`는 이름 또는 위치를 변경해도 유지되는 stable string/number를 반환해야 합니다. 중복 ID는 첫 항목만 사용합니다.

`getRowGroupId`는 현재 `groups`에 존재하는 ID를 반환해야 합니다. Non-empty Group을 삭제하기 전에 application이 소속 Row를 재배정하거나 함께 삭제해야 합니다. Application CRUD가 Group을 제거해도 Comins Table은 Row를 자동 변경하지 않습니다.

Group 추가, 수정, 삭제 UI는 application이 소유합니다. Row가 없어도 Group 객체가 `groups`에 있으면 Group Row가 유지됩니다.

## Group 및 Row Drag

`groupDraggable`을 설정하고 `onChangeGroups`를 제공하면 library-owned Group Drag handle이 활성화됩니다. Drop 성공 시 `groups`를 재배치하고 stable ID, `fromIndex`, `toIndex`를 전달합니다. Application은 next 배열을 controlled state에 반영해야 합니다.

Pointer 없이 application JavaScript에서 같은 before/after 결과를 만들 때는 root에서 export하는 pure `moveCominsRowGroup` helper를 사용합니다.

Grouped `rowProps.draggable`은 기존 Row Drag handle을 사용합니다. 같은 Group drop은 `data` 순서만 바꿉니다. Cross-Group drop은 `setRowGroupId`도 호출하며 `setRowGroupId`와 `onChangeData`가 모두 있어야 유효합니다. Group Row에 drop하면 해당 Group 끝에 추가되므로 빈 Group과 접힌 Group도 target이 됩니다.

Application JavaScript는 root/core에서 export하는 `moveCominsRowToGroup` transition과 `CominsRowGroupMoveOptions<TData>`를 사용할 수 있습니다. 같은 leaf-target 배치는 `targetRowId`를 전달하고 `targetGroupId` 끝에 추가할 때는 생략합니다. Cross-Group 이동에는 `setRowGroupId`가 필요하며 target이 없거나 Group이 일치하지 않으면 membership setter를 호출하지 않고 원래 state를 반환합니다.

`setRowGroupId`는 `getRowId`가 반환하는 business Row ID를 유지해야 합니다. Membership 이동 중 ID를 변경하면 selection, Row Detail과 focus 복구 identity가 깨집니다.

Group Drag는 `data`를 변경하지 않으며 Row Drag는 `groups` 순서를 변경하지 않습니다.

## Expansion Ref 메서드

`expandedGroupIds`가 유일한 expansion source of truth입니다. `onChangeExpandedGroupIds`가 없으면 disclosure는 disabled read-only입니다.

```tsx
const tableRef = useRef<CominsTableRef<Row>>(null);

tableRef.current?.expandGroups();
tableRef.current?.foldGroups();
tableRef.current?.expandGroups(["east"]);
tableRef.current?.foldGroups(["west"]);
```

ID를 생략하면 현재 Group 전체가 대상입니다. 빈 ID 배열은 no-op이며 unknown ID는 무시합니다. Tree Grid는 별도 `expand`, `fold` 메서드를 계속 사용합니다.

## Group Row와 custom content

각 Group Row는 current visible Column 수와 동일한 `colSpan`을 가진 native `<th scope="rowgroup">` 하나로 구성합니다. 일반 Row와 구분되는 theme-aware 배경색과 leaf Row와 동일한 fixed `rowHeight`를 사용합니다.

Table은 outer Row/Cell, ARIA, disclosure, Group Drag handle, drop feedback, focus와 virtualization height를 소유합니다. `getGroupRowProps`는 outer Group Row에 typed `className`과 `style`을 추가하고, `renderGroupContent`는 내부의 기본 label/count/aggregate content만 교체합니다.

```tsx
rowGrouping={{
  // controlled Group fields omitted
  getGroupRowProps: ({ group, isEmpty }) => ({
    className: isEmpty ? "empty-group-row" : undefined,
    style: {
      "--comins-table-group-row-background": isEmpty ? "#e2e8f0" : "#d1d5db",
      "--comins-table-group-row-color": "#111827",
    } as React.CSSProperties,
  }),
  renderGroupContent: ({
    aggregateValues,
    expanded,
    group,
    groupIndex,
    isEmpty,
    rowCount,
  }) => (
    <GroupContent
      amount={aggregateValues.amount}
      expanded={expanded}
      group={group}
      index={groupIndex}
      isEmpty={isEmpty}
      rowCount={rowCount}
    />
  ),
}}
```

두 callback 모두 `aggregateValues`, `expanded`, `group`, `groupId`, `groupIndex`, `isEmpty`, `rowCount`를 받습니다. `groupIndex`는 현재 `groups` 배열의 0-based 위치이며 virtual slot이나 visible leaf index가 아닙니다. 기본 토큰은 `--comins-table-group-row-background`, `--comins-table-group-row-color`이며 Cell border나 decoration이 필요하면 custom class에서 stable `.comins-table__group-row > .comins-table__group-cell` 구조를 선택할 수 있습니다.

Custom content와 style은 fixed-height를 유지합니다. `getGroupRowProps.style.height`는 `rowHeight`를 덮어쓸 수 없으며 multiline/variable-height Group Row는 지원하지 않습니다.

Normal Column Cell renderer, formatter, component, tooltip, Row/Cell callback, selection, Clipboard와 Row Detail은 Group Row에서 실행하지 않습니다.

## 집계와 정렬

`rowGrouping.aggregations`는 output Column ID에 `count`, `sum`, `avg`, `min`, `max`를 지정합니다.

- `count`는 empty value를 포함한 모든 Group member를 셉니다.
- Numeric reducer는 finite number만 사용합니다.
- finite number가 없으면 `sum`, `avg`, `min`, `max`는 empty입니다.
- Empty Group의 `count`는 0입니다.
- Expansion은 집계 input을 변경하지 않습니다.

Header 정렬은 Group Row 순서를 변경하지 않습니다. 동일한 기존 `sortModel`과 Column comparator를 각 Group member Row에 독립 적용합니다. 따라서 Group Drag 순서는 오름차순, 내림차순, 다중 Row 정렬 중에도 유지됩니다.

Membership은 `O(N + G)` 단일 pass이며 Group별 정렬은 `O(sum(nᵢ log nᵢ))`, 최악의 경우 flat Row 정렬과 같은 `O(N log N)`입니다. Group마다 전체 data를 반복 filter하지 않습니다.

## Leaf interaction과 경계

Visible leaf callback은 기존 계약을 유지합니다.

- `row.data`: original `TData`
- `row.dataIndex`: source `data` index
- `row.id`: business Row ID
- `row.index`: visible leaf index이며 Group Row는 증가시키지 않음

접힌 Group의 selected Row ID와 expanded Detail ID는 dormant 상태로 유지합니다. Cell range, copy, paste는 현재 grouped leaf 순서를 따르며 Group Row를 포함하지 않습니다.

Column Pinning은 일반 leaf Cell과 Header에 계속 적용되며 하나의 spanning Group Cell 자체는 pinning하지 않습니다. Visual Fill Handle UI는 이번 release 범위 밖입니다. 기존 leaf-only selection과 Clipboard 동작은 유지합니다.

Row Grouping은 client-side flat-table 기능이며 pagination, infinite/lazy loading, Tree Grid와 결합할 수 없습니다. Fixed-height virtualization과 기존 `renderRowDetail` 계약을 통한 grouped leaf Row Detail은 지원합니다. 다중 Depth Group tree, Group selection, variable-height Group Row, server grouping, Pivot, custom reducer와 aggregate sorting은 이번 범위가 아닙니다.
