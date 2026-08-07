# Row Expand

Row Expand는 flat owner business Row 바로 다음에 controlled full-width Detail
영역을 추가한다. 애플리케이션이 expanded ID와 Detail content를 소유하며, Comins
Table의 sorting, pagination, loading, movement, selection, clipboard, callback은
owner Row만 대상으로 유지된다.

`npm run dev` 실행 후 `/examples/row-expand`에서 fixed, automatic, viewport보다
큰 Detail, read-only controlled, non-expandable 예제를 확인할 수 있다.

## Public Types

```ts
export type CominsRowDetailParams<TData> = {
  row: CominsEventRow<TData>;
};

export type CominsRowDetailHeight = number | "auto";

export type CominsRowDetailProps<TData> = {
  estimatedRowDetailHeight?: number;
  expandedRowIds?: readonly CominsRowId[];
  getRowDetailHeight?: (
    params: CominsRowDetailParams<TData>,
  ) => CominsRowDetailHeight;
  isRowExpandable?: (params: CominsRowDetailParams<TData>) => boolean;
  onChangeExpandedRowIds?: (rowIds: CominsRowId[]) => void;
  renderRowDetail?: (
    params: CominsRowDetailParams<TData>,
  ) => React.ReactNode;
};
```

`renderRowDetail`이 flat Row Expand를 활성화한다. 이 prop이 없으면 나머지 Detail
prop도 동작하지 않는다.

## Controlled State

```tsx
const [expandedRowIds, setExpandedRowIds] = useState<readonly string[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  expandedRowIds={expandedRowIds}
  getRowId={(row) => row.id}
  onChangeExpandedRowIds={setExpandedRowIds}
  renderRowDetail={({ row }) => <Detail row={row.data} />}
/>;
```

`expandedRowIds` 기본값은 빈 배열이다. disclosure를 조작하면
`onChangeExpandedRowIds`가 중복을 제거한 다음 owner ID 배열을 전달하며,
애플리케이션은 그 값을 다시 prop으로 전달한다. 기본 expandable Row에서 callback을
생략하면 read-only controlled disclosure는 전달된 상태를 표시하지만 disabled
상태가 된다. ID가 유효하면 Detail은 mount 상태를 유지한다.

owner가 filter, pagination, loading 또는 일시적 data 변경으로 보이지 않아도 ID는
dormant 상태로 보존된다. 다음 callback 입력에도 포함되고 owner가 다시 나타나면
다시 유효해진다. 현재 flat data에 owner가 존재하고 `isRowExpandable`이 `false`를
반환하지 않을 때만 ID가 유효하다. 이는 read-only control과 별도 계약이다.
non-expandable Row는 callback과 controlled ID가 있어도 disclosure와 Detail을 모두
렌더링하지 않는다.

## Detail Height

`getRowDetailHeight`는 finite positive CSS pixel 또는 `"auto"`를 받는다. finite
positive 숫자만 fixed이며 해당 Detail은 그 inline height를 유지한다. 값이 없거나,
잘못된 숫자이거나, `"auto"`이면 automatic measurement를 사용하므로 렌더링된
Detail에는 inline height가 없다.

```tsx
<CominsTable
  estimatedRowDetailHeight={300}
  getRowDetailHeight={({ row }) => (row.id === "large" ? 480 : "auto")}
  renderRowDetail={({ row }) => <Detail row={row.data} />}
/>
```

automatic Detail에 같은 width의 측정값이 없으면 finite positive
`estimatedRowDetailHeight`를 먼저 사용하고, 그렇지 않으면 현재 resolved `rowHeight`를
estimate로 사용한다. 측정값은 owner ID와 width를 기준으로 cache한다. width가
달라지면 그 estimate로 돌아가고 shared `ResizeObserver`가 새 border-box height를
보고하면 갱신한다. Fixed Detail은 observe하지 않으며
`estimatedRowDetailHeight`도 사용하지 않는다.

## Semantic DOM And Focus

유효한 Detail은 owner의 semantic sibling이다.

```html
<tr data-comins-row-data-index="0">...</tr>
<tr data-detail-for="row-id">
  <td colspan="current visible Column count">
    <div role="region" aria-labelledby="owner-disclosure-id">...</div>
  </td>
</tr>
```

owner disclosure는 `aria-expanded`를 제공한다. `aria-controls`는 controlled
region이 mount된 동안에만 존재한다. region은 disclosure로 label된다. accessible
name은 정확히 `Expand <row-id> details` 또는 `Collapse <row-id> details`다.
native Enter와 Space activation은 유지하지만 disclosure keydown은 owner Cell/Row의
keyboard 및 clipboard 처리로 전달하지 않는다. Detail의 interactive content는
일반 tab 순서에 포함된다. focus가 Detail 내부에 있을 때 controlled collapse로
unmount되면 owner disclosure로 focus가 돌아간다.

Detail cell은 Column hide, restore, reorder 이후의 effective visible Column
개수만큼 span한다. 하나의 non-sticky full-width cell이며 body와 함께 horizontal
scroll된다.

## Compatibility

| Surface | Row Expand 동작 |
| --- | --- |
| Sorting | Owner와 Detail이 함께 이동하고 controlled ID는 바뀌지 않는다. |
| Pagination | 다른 page의 ID는 dormant 상태로 보존된다. |
| Infinite Scroll과 Lazy Load | offset, limit, threshold, count는 owner business Row만 사용한다. |
| Row movement | owner Slot이 한 단위로 이동하며 Detail은 target이 아니다. |
| Row, Cell, range selection | Detail에는 Row 또는 Cell address가 없으며 range에 포함되지 않는다. |
| Copy와 paste | Detail content는 clipboard source나 target이 아니다. |
| Context menu와 double-click | Owner callback은 Detail content와 disclosure event를 무시한다. |
| Loading, empty, filler, Summary, infinite-loading Row | Structural Row에는 disclosure와 Detail이 없다. |
| Tree Grid | 지원하지 않으며 runtime wrapper가 untyped flat Detail prop을 제거한다. |

## Virtualization And Performance

Data Row와 접힌 Detail owner는 고정 높이 산술 경로를 유지한다. 유효하게 펼쳐진
Detail로 인해 data Slot이 rowHeight보다 높아지는 경우에만 private height index가
활성화된다.

owner와 선택적 Detail은 하나의 private virtual Slot이다. 따라서 viewport보다 큰
Detail도 outer body viewport가 해당 영역을 통과하는 동안 mount 상태를 유지하며,
Detail content가 business Row로 취급되지 않는다.

bounded panel, large list 또는 nested application widget에는 finite fixed height를
우선 사용하고 큰 inner content에는 별도 scroll이나 virtualization을 적용한다.
실제로 측정 높이가 필요한 bounded content에만 `"auto"`를 사용한다. 하나의 shared
`ResizeObserver`가 mount된 automatic Detail block만 observe하며 fixed Detail은
측정 allocation을 만들지 않는다.

## Unsupported Boundaries

- Tree Grid Row Detail은 지원하지 않는다.
- owner data Row 전체의 general automatic height는 지원하지 않는다.
  `rowHeight`가 계속 owner Row 계약이다.
- Nested managed Detail은 지원하지 않는다. 하나의 Detail 안에 일반 application
  content를 렌더링할 수 있지만 Comins Table은 두 번째 Detail hierarchy를 관리하지
  않는다.
