# Tree Grid

Tree Grid는 기존 컬럼 모델을 유지하면서 제어형 중첩 Row를 출력한다. 실제 업무 Row는 `item`에 넣으며, `{ field: "name" }` 같은 기존 컬럼과 cell formatter는 계속 `item` 객체를 대상으로 동작한다.

```tsx
const [data, setData] = useState([
  {
    item: { id: "engineering", name: "Engineering", age: 60, role: "Owner" },
    expand: false,
    children: [
      {
        item: { id: "platform", name: "Platform Team", age: 32, role: "Editor" },
      },
    ],
  },
]);

<CominsTable
  columns={columns}
  data={data}
  getRowId={(item) => item.id}
  onChangeData={setData}
  summary={{ columns: { age: "sum" } }}
  tree
  virtualized
/>;
```

## 제어형 data 계약

- `data`는 `{ item, expand?, children? }` node 배열이다.
- `item`은 column, formatter, renderer, row callback, `getRowId`가 받는 업무 Row다.
- `expand`는 해당 node의 직접 children을 visible pre-order row 목록에 포함할지 결정한다. 기본값은 접힘이다.
- `children`은 재귀적인 node 배열이다.
- `getRowId(item)`은 현재 접혀 있는 descendant를 포함한 모든 depth에서 전역적으로 유일하고 안정적인 id를 반환해야 한다.
- 펼침 버튼과 cell 수정은 호출자가 소유한 node를 변경하지 않고, 새 tree를 `onChangeData`로 전달한다.

Tree 정렬은 sibling 집합별 재귀 정렬이다. 부모는 항상 자신이 보이는 descendant보다 앞에 유지된다. Summary Row는 펼침 상태와 관계없이 leaf `item`만 집계하며, 부모 값은 중복 집계를 막기 위해 제외한다.

## Tree Grid V1 제한

Tree Grid V1은 현재의 고정 `rowHeight` virtualized layout을 사용한다. hierarchy-aware datasource 또는 이동 계약이 필요하므로 pagination, lazy loading, infinite scrolling, row drag, row 단위 copy/paste는 의도적으로 지원하지 않는다. Cell과 range clipboard 동작은 visible `item` row 범위에서 계속 사용할 수 있다.

Tree expand는 Flat Row Expand와 다른 기능이다. 향후 Row Expand는 하나의 flat source row 아래에 detail 영역을 출력하되, flat 정렬, pagination, lazy loading, infinite scrolling, row 이동을 그대로 유지해야 한다. 따라서 variable-height layout은 별도로 설계한다. 향후 Row Grouping도 flat row 값을 기준으로 그룹을 파생하고 별도의 group expansion state를 사용한다.

`npm run dev` 실행 후 `/examples/tree-grid`에서 동작 예제를 확인할 수 있다.
