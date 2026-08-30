# Row Grouping Explicit Groups 및 Drag 구현 계획

- 작성일: 2026-08-27
- 상태: 구현 및 검증 완료
- 대상 브랜치: `codex-row-grouping`
- 기준 커밋: `1fb22603db6db4a7c77e4d43c11a225f47b7e30f`
- 기준 `main`: `5e0bb185475ec62e316989e88cf8af5e3e1936d4`
- 공통 정책: Comins Contract v1.7
- 대상 패키지: `comins-table` 0.1.6의 Unreleased Row Grouping

## 1. 목표

현재 Row 값에서 다단계 Group을 파생하는 synthetic tree 계약을, application-owned 단일 Depth Group 모델로 교체한다.

다음 동작을 하나의 controlled 계약으로 제공한다.

1. `groups` 배열이 빈 Group을 포함한 실제 Group 모델과 순서를 소유한다.
2. Group Drag는 `groups` 배열을 재배치하고 `onChangeGroups`로 next model을 전달한다.
3. 기존 Row Drag는 Group 내부 Row 순서 변경과 다른 Group으로의 Row 이동을 지원한다.
4. Group Row는 전체 visible Column을 span하는 하나의 native Cell로 렌더링한다.
5. Group Row의 내부 content는 application이 custom render할 수 있다.
6. Group 펼침/접힘은 controlled state와 Ref의 전체 동작을 함께 제공한다.
7. Header 정렬은 Group 순서를 변경하지 않고 각 Group 내부 Row에만 기존 Row 정렬 정책을 적용한다.
8. Group Row는 일반 Row와 구분되는 기본 배경색을 유지한다.

## 2. 조사 근거

계획 작성 시 다음 현재 저장소 표면을 직접 확인했다.

- `AGENTS.md`와 local canonical `COMINS_CONTRACT.md`의 Contract v1.7
- `src/grouping.ts`의 criteria normalization, opaque path ID, tree membership, aggregation, sibling Group 정렬, leaf 정렬, projection
- `src/index.tsx`의 grouped prop discrimination, controlled expansion, Ref API, Row pointer drag, virtual slot, Group Row 렌더링
- `src/core.ts`의 `moveCominsRow`와 기존 application-owned `onChangeData` 흐름
- `styles.css`의 일반 Row parity와 현재 `.comins-table__group-cell` 배경색
- `test/grouping.test.ts`, `test/table-interaction.test.tsx`, `test/typecheck/row-grouping-api.tsx`, `test/playwright/specs/row-grouping.spec.ts`
- `example/src/features/RowGroupingFeature.tsx`, Korean/English Row Grouping 문서, `CHANGELOG.md`, 작업 보고 관례
- 이전 Row Grouping 설계와 구현 플랜은 현재 구조 파악에만 사용하며, 본 문서의 확정 요구와 충돌하는 항목은 본 문서가 우선한다.

외부 제품 비교와 웹 조사는 사용하지 않았다. 필요한 API, 성능 및 동작 근거를 현재 저장소에서 확인할 수 있었다.

## 3. 확정 범위

### 3.1 포함

- application-owned `groups` 배열과 stable Group ID
- 단일 Depth Group
- 빈 Group 유지
- application-owned Group 추가, 수정, 삭제
- Group 배열 순서를 실제 모델 순서로 사용
- Group Drag의 before/after 위치 이동
- Group Drag와 application JavaScript가 공유하는 pure move helper
- 기존 Row Drag의 Group 내부 이동
- Row Drag의 다른 Group 이동
- 비어 있거나 접힌 Group Row를 Row drop target으로 사용
- controlled Group expanded IDs
- Group 전체 펼침/접힘 Ref API
- 하나의 `<th scope="rowgroup">`와 visible Column 기준 `colSpan`
- Group content custom renderer
- library-owned disclosure와 Group Drag handle
- 기본 Group label, Row count와 aggregate content
- built-in `count`, `sum`, `avg`, `min`, `max` aggregation
- Group 순서를 고정한 Group 내부 Row 정렬
- 일반 Row와 구분되는 Group Row 배경색
- fixed-height Group Row virtualization
- 기존 grouped leaf selection, Clipboard, Row Detail, focus와 scroll-anchor 의미 유지
- Korean/English docs, Playground, type/unit/component/browser/performance 검증

### 3.2 제외

- 다중 Depth Group 및 Group tree
- Group 자동 생성, Group key path encoding, Group Column 기반 sibling 정렬
- Group별로 서로 다른 sort model을 갖는 기능
- Group Row selection, tri-state selection 또는 Clipboard payload
- Group Row 자체의 Row/Cell renderer pipeline 재사용
- custom renderer가 outer `<tr>`, `<th>`, disclosure 또는 Group Drag pointer lifecycle을 교체하는 기능
- variable-height 또는 multiline Group Row
- built-in Group CRUD dialog, context menu 또는 삭제 정책
- non-empty Group 삭제 시 Row의 자동 삭제 또는 자동 재배정
- server-side grouping, pagination, infinite/lazy loading, Tree Grid 결합
- Pivot, custom aggregate reducer, aggregate sorting
- package version 변경, release, publish, push 또는 PR 생성

## 4. 공개 API 목표

### 4.1 Explicit Group 모델

`TGroup`에는 library가 강제하는 `index` 또는 `order` 필드를 추가하지 않는다. `groups` 배열의 요소 순서가 유일한 Group 순서 source of truth다.

```ts
export type CominsRowGroupDropPosition = "after" | "before";

export type CominsRowGroupMoveDetails = {
  fromIndex: number;
  groupId: CominsRowId;
  reason: "move";
  targetGroupId: CominsRowId;
  toIndex: number;
};

export type CominsSetRowGroupIdParams<TData> = {
  fromGroupId: CominsRowId;
  row: TData;
  rowId: CominsRowId;
  toGroupId: CominsRowId;
};

export type CominsRowGroupRenderParams<TData, TGroup> = {
  aggregateValues: Readonly<Record<string, number | null>>;
  expanded: boolean;
  group: TGroup;
  groupId: CominsRowId;
  groupIndex: number;
  isEmpty: boolean;
  rowCount: number;
};

export type CominsRowGroupingConfig<TData, TGroup> = {
  aggregations?: Readonly<Partial<Record<string, CominsRowGroupAggregation>>>;
  expandedGroupIds?: readonly CominsRowId[];
  getGroupId: (group: TGroup) => CominsRowId;
  getGroupLabel?: (group: TGroup) => React.ReactNode;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groupDraggable?: boolean;
  groups: readonly TGroup[];
  onChangeExpandedGroupIds?: (groupIds: CominsRowId[]) => void;
  onChangeGroups?: (
    groups: TGroup[],
    details: CominsRowGroupMoveDetails,
  ) => void;
  renderGroupContent?: (
    params: CominsRowGroupRenderParams<TData, TGroup>,
  ) => React.ReactNode;
  setRowGroupId?: (
    params: CominsSetRowGroupIdParams<TData>,
  ) => TData;
};
```

`getGroupLabel`을 생략하면 `String(groupId)`를 기본 label로 사용한다. Group ID는 Group의 identity이며 application이 Group의 name이나 위치를 변경해도 바꾸지 않는다.

`groupIndex`는 다음 의미로 고정한다.

- normalized `groups` 배열 기준 0-based index
- expanded/collapsed 상태와 무관
- empty Group도 index 보유
- virtual slot index 또는 visible leaf index와 무관
- renderer 호출 시점의 현재 controlled model 위치

동일 Group ID가 중복되면 첫 번째 항목만 유효한 Group으로 사용한다. `getRowGroupId`가 반환한 ID는 현재 valid Group ID 중 하나여야 한다. Group을 삭제하는 application은 먼저 소속 Row를 다른 Group으로 이동하거나 함께 처리하여 참조 무결성을 유지한다. Table은 Group 삭제를 이유로 Row를 자동 변경하거나 삭제하지 않는다.

### 4.2 Table generic과 prop discrimination

Root API가 JSX의 nested `rowGrouping`에서 `TGroup`을 추론하도록 다음 형태를 목표로 한다.

```ts
export type CominsTableProps<TData, TGroup = unknown> = (
  | CominsGroupedTableProps<TData, TGroup>
  | CominsUngroupedTableProps<TData>
) & CominsRowDetailProps<TData>;

export const CominsTable = forwardRef(CominsTableAdapter) as <
  TData,
  TGroup = unknown,
>(
  props: (
    | CominsTableProps<TData, TGroup>
    | CominsTreeTableProps<TData>
  ) & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement;
```

Type fixture에서 다음을 증명한다.

- `groups`와 Group callbacks에서 `TGroup` 자동 추론
- 기존 ungrouped `<CominsTable<Row>>` 호출 호환
- grouped Row Drag를 위한 `rowProps.draggable` 허용
- Tree, pagination, infinite/lazy loading 금지 유지
- `groupDraggable`과 `onChangeGroups`의 올바른 callback type
- `setRowGroupId`가 `TData`를 반환해야 함
- custom renderer payload의 `group`, `groupIndex`, aggregation type
- Ref의 Group expansion methods

현재 Row Grouping은 Unreleased 상태이므로 `criteria`, `getKey`, nested Group path ID와 다중 Depth API에 대한 compatibility alias는 추가하지 않는다.

### 4.3 Group 이동 helper

UI Group Drag와 application JavaScript 이동은 동일한 root-exported pure helper를 사용한다.

```ts
export function moveCominsRowGroup<TGroup>(input: {
  getGroupId: (group: TGroup) => CominsRowId;
  groups: readonly TGroup[];
  position: CominsRowGroupDropPosition;
  sourceGroupId: CominsRowId;
  targetGroupId: CominsRowId;
}): TGroup[];
```

helper는 source와 target ID를 latest array에서 다시 찾아 immutable splice를 수행한다. ID가 없거나 source와 target이 같거나 결과 위치가 같으면 원본과 동일한 순서의 배열을 반환하며 Table은 `onChangeGroups`를 호출하지 않는다.

### 4.4 Ref API

Tree 전용 `expand`와 `fold`의 의미를 변경하지 않고 Group 전용 method를 추가한다.

```ts
export type CominsTableRef<TData = unknown> = {
  // existing methods
  expandGroups: (groupIds?: readonly CominsRowId[]) => void;
  foldGroups: (groupIds?: readonly CominsRowId[]) => void;
};
```

- `expandGroups()`는 현재 valid Group ID 전체를 `onChangeExpandedGroupIds`에 전달한다.
- `foldGroups()`는 빈 배열을 전달하여 전체 Group을 접는다.
- ID 배열을 전달하면 해당 ID만 추가하거나 제거한다.
- 빈 ID 배열은 no-op이다.
- unknown ID는 무시한다.
- callback이 없으면 controlled read-only 상태이므로 no-op이다.
- Tree `expand`/`fold`와 Group ID namespace를 섞지 않는다.

## 5. Controlled 모델과 CRUD 경계

### 5.1 Group 순서

```ts
const [groups, setGroups] = useState<Group[]>(initialGroups);
```

`groups[0]`, `groups[1]` 순서가 저장, 렌더링, Group Drag의 canonical 순서다. Table 내부에 별도 `groupOrder`, `index`, `firstSourceIndex` state를 만들지 않는다.

Group Drag 성공 시에만 다음 callback을 발생시킨다.

```ts
onChangeGroups(nextGroups, {
  reason: "move",
  groupId: sourceGroupId,
  targetGroupId,
  fromIndex,
  toIndex,
});
```

application이 callback에서 `setGroups(nextGroups)`를 반영한 후 화면 순서가 변경된다. Table은 optimistic internal Group 순서를 별도로 유지하지 않는다.

### 5.2 Group CRUD

Group 추가, 수정, 삭제 UI와 business rule은 application이 소유한다.

- 추가: application이 원하는 index에 새 Group을 splice한다.
- 수정: stable ID를 유지하며 해당 Group 객체를 교체한다.
- 삭제: application이 Row 재배정 또는 삭제를 먼저 처리한 후 Group을 제거한다.
- empty Group: `groups`에 존재하는 한 항상 Group Row로 표시한다.
- custom renderer의 button/menu는 application CRUD handler를 직접 호출한다.

Core는 CRUD dialog나 destructive confirmation을 제공하지 않는다. `onChangeGroups`는 Table-originated Group Drag만 보고한다.

## 6. Membership, aggregation, ordering과 projection

### 6.1 단일-pass membership

`src/grouping.ts`는 다음 memoizable layer로 단순화한다.

1. Group normalization: `groups`, `getGroupId`, `getGroupLabel`
2. Membership/aggregation: `data`, Row IDs, `getRowGroupId`, aggregation config
3. Row ordering: 전체 `sortModel`을 각 Group bucket 내부에 적용
4. Visible projection: canonical Group 순서와 controlled expanded IDs

Membership은 Group마다 전체 `data`를 `filter`하지 않는다. 먼저 ID Map과 Group별 source-index bucket을 만들고 전체 Row를 한 번만 순회한다.

```text
groups → Map<GroupId, GroupRuntime>
data   → Map<GroupId, sourceIndex[]>
```

예상 복잡도는 다음과 같다.

- Group normalization: `O(G)`
- Membership과 aggregation: `O(N + G)`
- Group 내부 Row 정렬: `O(sum(nᵢ log nᵢ))`, 최악 `O(N log N)`
- Projection: `O(G + visible leaves)`
- 저장 공간: `O(N + G)`

이는 기존 flat 전체 정렬의 최악 복잡도를 넘지 않는다. 빈 Group은 빈 bucket만 가지므로 Row 정렬 비용이 없다.

### 6.2 Group 정렬 금지

Header click은 `sortModel`을 기존 방식으로 변경하지만 Group runtime 배열에는 comparator를 적용하지 않는다.

- `orderedRootGroupIds`를 Group Column 값으로 정렬하는 기존 분기 제거
- `firstSourceIndex` 기반 Group tie-break 제거
- 모든 Group Row는 항상 normalized `groups` 배열 순서 유지
- 전체 `sortModel`은 각 Group의 leaf Row에만 적용
- Group Drag는 sort model을 변경하거나 clear하지 않음
- Row Drag와 active Row sort의 관계는 기존 Row Drag 정책 유지

Group ID나 label과 같은 값이 ordinary Row Column에도 존재하면 해당 Column 정렬은 Group 내부 Row에만 적용된다. 같은 Group에서 값이 동일하면 기존 source-order tie를 유지한다.

### 6.3 Aggregation

기존 built-in reducer 의미를 유지하되 Group 단위는 explicit bucket으로 변경한다.

- `count`: Group에 속한 모든 Row 수
- `sum`, `avg`, `min`, `max`: finite number만 사용
- empty Group: `count = 0`, numeric aggregate output은 `null`
- expansion 상태는 aggregation input에 영향 없음
- custom renderer에는 finalized `aggregateValues`만 전달하고 reducer state 또는 Row 배열은 노출하지 않음

### 6.4 Projection 의미

Projection은 canonical Group 순서대로 항상 Group slot을 하나씩 포함한다. 해당 ID가 expanded인 경우에만 정렬된 member Row slot을 뒤에 추가한다.

```text
Group A
  sorted Row A-1
  sorted Row A-2
Group B (empty)
Group C (collapsed)
```

- Group slot에는 `TData`, business Row ID 또는 source data index를 부여하지 않는다.
- data slot의 `dataIndex`는 원본 `data` index다.
- visible leaf `row.index`는 expanded projection 안의 leaf 순서다.
- empty/collapsed Group도 Group Drag target과 disclosure focus owner로 유지한다.

## 7. Rendering과 interaction

### 7.1 하나의 Group Cell

Group Row는 다음 semantic shell을 library가 소유한다.

```tsx
<tr data-comins-group-row="true">
  <th
    className="comins-table__td comins-table__group-cell"
    colSpan={Math.max(1, visibleColumns.length)}
    scope="rowgroup"
  >
    {/* library-owned drag/disclosure controls */}
    {/* default content or renderGroupContent result */}
  </th>
</tr>
```

- effective visible Column 수가 변경되면 `colSpan`도 즉시 변경한다.
- per-Column `<td>`와 Group aggregate Cell 렌더링을 제거한다.
- 기본 content는 Group label, Row count와 configured aggregate 값을 한 Cell 안에 표시한다.
- `renderGroupContent`가 있으면 기본 content만 교체한다.
- outer row/cell, ARIA, disclosure, drag handle, drop indicator와 virtualization height는 교체하지 않는다.
- normal Column `cell.renderer`, formatter, tooltip 또는 component pipeline은 Group Row에서 호출하지 않는다.
- custom content의 button/menu event는 disclosure나 Drag를 실행하지 않는다. Drag는 전용 handle에서만 시작한다.

### 7.2 Group Row 배경

현재 `.comins-table__group-cell`의 theme-aware `color-mix` 배경을 단일 `<th>`에 유지한다. 일반 odd/even Row background보다 시각적으로 구분되어야 하며 custom content가 기본 배경을 덮지 않는 한 전체 Group Row에 적용한다.

Theme별 browser test에서 Group Row와 인접 일반 Row의 computed background color가 다름을 검증한다.

### 7.3 Group Drag

- `groupDraggable`이 true이고 `onChangeGroups`가 있을 때만 handle 활성화
- source와 target은 index가 아니라 stable Group ID로 저장
- pointer가 target Group Row의 위/아래 절반 중 어디에 있는지로 `before`/`after` 결정
- 비어 있거나 접힌 Group도 동일한 target
- full-colSpan drop marker 제공
- pointerup에서 latest controlled `groups`로 source/target index 재계산
- pure `moveCominsRowGroup` 결과와 실제 순서가 다를 때만 callback
- cancel, blur, unmount에서 전역 pointer listener와 visual state 정리
- custom content pointer event는 handle drag를 시작하지 않음

### 7.4 Row Drag

Grouped Table에서 기존 `rowProps.draggable` 금지를 제거하고 현재 Row handle UI와 `moveCominsRow` 정책을 재사용한다.

- 같은 Group의 leaf Row target: 기존 data reorder
- 다른 Group의 leaf Row target: `setRowGroupId`로 source Row의 membership을 변경하고 target 위치로 data reorder
- Group Row target: target Group의 마지막 member 위치에 append
- empty Group target: membership 변경 후 해당 Group의 첫 Row로 배치
- collapsed Group target: membership 변경 후 Row는 collapsed 상태에 따라 숨겨지고 focus는 target disclosure로 복구
- Group 이동 시 business Row ID는 유지
- successful drop은 `onChangeData`를 한 번만 호출
- cross-Group drop은 `setRowGroupId`와 `onChangeData`가 모두 있을 때만 valid
- `setRowGroupId`가 없으면 같은 Group reorder만 허용하고 다른 Group drop marker는 invalid 상태로 표시
- Group Drag는 Group handle, Row Drag는 Row handle에서만 시작하며 pointer state를 공유하지 않음

Row의 Group membership은 application-owned `TData`에 반영된다. Table 내부에 별도 Row-to-Group override Map을 만들지 않는다.

### 7.5 Expansion과 focus

- disclosure click은 전체 next `expandedGroupIds`를 callback으로 전달
- `expandGroups`/`foldGroups`와 disclosure는 동일한 normalization helper 사용
- empty Group도 expand ID를 가질 수 있지만 visible Row 수는 변하지 않음
- 외부 collapse가 focused Row를 숨기면 owner Group disclosure로 focus 이동
- Row를 collapsed Group으로 drop하여 source Row가 사라지면 target Group disclosure로 focus 이동
- Group 순서 변경과 expansion 변경 전후 virtual scroll anchor는 stable Group ID를 사용

## 8. 단계별 구현 작업

각 단계는 실패하는 focused test를 먼저 추가하고 최소 구현으로 통과시킨다. 관련 없는 리팩터링과 일괄 포맷은 수행하지 않는다.

### Task 1. Public type과 explicit Group pure model

**변경 파일**

- `src/grouping.ts`
- `src/index.tsx`
- `test/public-api.test.tsx`
- `test/typecheck/row-grouping-api.tsx`
- `test/grouping.test.ts`

**작업**

1. 기존 criteria/key/path public type을 explicit Group public type으로 교체한다.
2. `CominsTableProps<TData, TGroup>`와 forwardRef generic inference를 추가한다.
3. stable ID normalization, duplicate first-wins, empty Group runtime을 구현한다.
4. `moveCominsRowGroup` helper와 move details를 구현하고 root에서 export한다.
5. grouped `rowProps.draggable` type 금지를 제거하되 loading/Tree/pagination 금지는 유지한다.

**focused 검증**

```bash
npm run lint
npm run test:run -- test/grouping.test.ts
```

### Task 2. Membership, aggregation과 Group 내부 정렬

**변경 파일**

- `src/grouping.ts`
- `src/index.tsx`
- `test/grouping.test.ts`
- `test/table-interaction.test.tsx`

**작업**

1. Group ID Map과 Row membership bucket을 한 번의 Row 순회로 구축한다.
2. empty Group을 포함하여 aggregate state를 계산한다.
3. Group 정렬 분기와 multi-depth child traversal을 제거한다.
4. 동일한 전체 `sortModel`을 각 Group bucket에 독립 적용한다.
5. Group 순서, sorted leaf source index와 expanded projection memo dependency를 분리한다.

**필수 테스트**

- Header asc/desc 이후에도 Group 순서 고정
- 각 Group 내부 Row만 기존 comparator와 stable tie로 정렬
- multi-sort를 각 Group에 동일 적용
- empty Group 위치와 aggregate 유지
- Group Drag 순서 이후 Row sort에도 Group 순서 유지
- Group마다 `data.filter`를 반복하지 않는 100,000 Row memory shape

### Task 3. Colspan Group Row와 custom renderer

**변경 파일**

- `src/index.tsx`
- `styles.css`
- `test/table-interaction.test.tsx`
- `test/public-api-boundary.test.ts`

**작업**

1. per-visible-Column Group Cell을 single `<th scope="rowgroup">`로 교체한다.
2. `colSpan`을 effective visible Column 수와 동기화한다.
3. library-owned controls와 content renderer 경계를 구현한다.
4. default label/count/aggregate content를 제공한다.
5. 기존 Group 배경색과 fixed row height를 보존한다.

**필수 테스트**

- Group Row마다 direct Cell 정확히 하나
- hidden Column 변경 후 `colSpan` 변경
- custom renderer payload와 content 출력
- custom button이 disclosure를 toggle하지 않음
- renderer가 normal Cell callback/formatter를 호출하지 않음
- Group Row와 ordinary Row computed background 구분

### Task 4. Controlled Group expansion과 Ref API

**변경 파일**

- `src/index.tsx`
- `test/table-interaction.test.tsx`
- `test/typecheck/row-grouping-api.tsx`
- `test/playwright/specs/ref-api.spec.ts`
- `test/playwright/specs/row-grouping.spec.ts`

**작업**

1. Group ID Set을 `CominsRowId` 기반으로 전환한다.
2. `expandGroups`와 `foldGroups`를 Ref에 추가한다.
3. all, selected IDs, unknown IDs, empty array, missing callback 의미를 구현한다.
4. disclosure, Ref, external collapse의 focus 및 anchor 경로를 통합한다.

### Task 5. Group Drag

**변경 파일**

- `src/index.tsx`
- `styles.css`
- `test/table-interaction.test.tsx`
- `test/playwright/specs/row-grouping.spec.ts`

**작업**

1. Group handle, source/target ID, before/after drop state를 추가한다.
2. empty/collapsed Group을 포함한 target resolution을 구현한다.
3. pointerup에서 pure helper를 호출하고 controlled callback을 한 번 발생시킨다.
4. no-op와 invalid drop은 callback을 발생시키지 않는다.
5. cancel, blur, unmount listener cleanup과 drop marker를 검증한다.

### Task 6. Group-aware Row Drag

**변경 파일**

- `src/core.ts`
- `src/index.tsx`
- `test/basic-core.test.ts`
- `test/table-interaction.test.tsx`
- `test/playwright/specs/row-grouping.spec.ts`

**작업**

1. 기존 Row move를 Group membership과 target placement를 함께 처리하는 pure transition으로 확장한다.
2. 같은 Group Row 이동은 기존 Row 객체와 membership을 유지한다.
3. cross-Group 이동은 `setRowGroupId` 반환 Row로 교체한 뒤 data 위치를 이동한다.
4. leaf target과 Group Row target을 구분한다.
5. empty/collapsed Group drop과 focus 복구를 구현한다.
6. Group Drag와 Row Drag의 pointer state 및 markers를 격리한다.

**필수 테스트**

- 같은 Group reorder와 `onChangeData` 1회
- 다른 Group leaf target 이동
- empty Group 이동
- collapsed Group 이동
- missing `setRowGroupId` invalid marker 및 no callback
- disabled Row는 기존 정책대로 drag 불가
- business Row ID, selection, Row Detail ID 보존

### Task 7. Playground와 public 문서 갱신

**변경 파일**

- `example/src/features/RowGroupingFeature.tsx`
- `example/src/docs/codeSamples.ts`
- `example/src/docs/dataTableOptionGuide.ts`
- `docs/user/20-row-grouping.md`
- `docs/ko/20-row-grouping.md`
- `README.md`
- `CHANGELOG.md`
- `test/user-docs.test.ts`
- `test/playwright/specs/user-playground-docs.spec.ts`

**Playground 시나리오**

- explicit Group CRUD와 empty Group
- Group Drag 결과를 보여주는 controlled model JSON
- 같은 Group 및 cross-Group Row Drag
- single-cell `colSpan` Group Row
- custom renderer의 badge, count, aggregate와 CRUD button
- expand/fold all Ref controls
- Group 순서 고정과 각 Group 내부 Header 정렬
- 100,000 Row virtualization/performance fixture

Korean/English 문서는 API, 정렬, Drag, renderer, controlled ownership, invalid combination을 동일하게 설명한다. 기존 criteria와 nested grouping 예제는 제거한다.

### Task 8. 최종 검증과 작업 보고

**focused 검증**

```bash
npm run lint
npm run test:run -- test/grouping.test.ts test/basic-core.test.ts test/clipboard-core.test.ts test/range-selection-core.test.ts test/table-interaction.test.tsx test/virtual-layout.test.ts
npm run test:run -- test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/row-grouping.spec.ts test/playwright/specs/ref-api.spec.ts --workers=1
npm run test:perf -- test/playwright/specs/row-grouping.spec.ts --workers=1
```

**전체 gate**

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
git diff --check
```

의미 있는 구현 후 `reports/2026-08-27.md`에 변경 파일, 명령, 결과, 실패 분류와 잔여 리스크를 기록한다. 기존 physical-scrollbar 성능 gate가 재현되면 clean `main` A/B 근거 없이 Row Grouping 회귀로 분류하거나 assertion을 완화하지 않는다.

## 9. 완료 기준

- public type에서 explicit `groups`와 `TGroup`이 정상 추론된다.
- 빈 Group이 Row 유무와 관계없이 controlled 위치에 렌더링된다.
- Group Drag가 실제 `groups` 배열 변경 callback을 발생시킨다.
- application JavaScript가 exported helper로 같은 Group 이동 결과를 만들 수 있다.
- Row Drag가 같은 Group과 다른 Group에서 application-owned `data`를 변경한다.
- Group Row는 하나의 colspan Cell이며 custom content를 지원한다.
- disclosure와 Group Drag handle은 library가 계속 소유한다.
- Ref로 전체 또는 일부 Group을 펼치고 접을 수 있다.
- Header 정렬이 Group 위치를 바꾸지 않고 각 Group 내부 Row에만 적용된다.
- Group Row 배경색이 ordinary Row와 시각적으로 구분된다.
- leaf callback, selection, Clipboard, Row Detail, virtualization 의미가 회귀하지 않는다.
- Korean/English 문서와 Playground가 실제 API와 일치한다.
- 선택한 focused test, `npm run verify`, 전체 non-perf E2E와 전체 performance gate 결과가 보고된다.

## 10. 잔여 리스크와 구현 중 확인 사항

- `CominsTable<TData, TGroup>` generic inference는 React `forwardRef` union에서 회귀 가능성이 있으므로 type fixture를 첫 단계에 둔다.
- `colSpan` Group Cell은 future Column Pinning과 직접 결합할 수 없다. Column Pinning을 다시 열 때 pinned zone별 shell 계약을 별도로 설계해야 한다.
- cross-Group Row drop 시 application의 `setRowGroupId`가 business Row ID를 바꾸면 selection/Detail 안정성이 깨질 수 있으므로 문서와 runtime 검증에서 ID 유지 전제를 명시한다.
- Group 삭제 후 남은 Row가 unknown Group ID를 참조하는 상태는 application model 오류다. Table은 데이터를 자동 수정하지 않으며 문서와 개발 검증으로 참조 무결성 책임을 명시한다.
- custom renderer가 fixed `rowHeight`를 넘는 content를 반환해도 Group Row는 늘어나지 않는다. overflow 처리와 multiline 지원은 후속 범위다.
- 실제 100,000 Row 성능은 알고리즘 복잡도만으로 완료 처리하지 않고 focused performance spec과 전체 performance gate로 확인한다.

## 11. 승인 경계

이 계획의 구현은 현재 저장소의 로컬 코드, 테스트, Playground, 문서와 작업 보고 변경까지만 포함한다. dependency 추가, package version 변경, 원격 push, PR, merge, tag, GitHub Release와 npm publish는 별도 명시 승인 전 수행하지 않는다.
