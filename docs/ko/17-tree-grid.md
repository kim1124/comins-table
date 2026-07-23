# Tree Grid

Tree Grid는 기존 컬럼 모델을 유지하면서 제어형 중첩 Row를 출력한다. 실제 업무 Row는 `item`에 넣으며, `{ field: "name" }` 같은 기존 컬럼과 cell formatter는 계속 `item` 객체를 대상으로 동작한다.

```tsx
const tableRef = useRef<CominsTableRef<PersonRow>>(null);
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

<>
  <button onClick={() => tableRef.current?.expand(["engineering"])}>펼치기</button>
  <button onClick={() => tableRef.current?.fold()}>전체 접기</button>
  <CominsTable
    ref={tableRef}
    columns={columns}
    data={data}
    defaultExpandAll={false}
    getRowId={(item) => item.id}
    onChangeData={setData}
    summary={{ columns: { age: "sum" } }}
    tree
    virtualized
  />
</>;
```

## 제어형 data 계약

- `data`는 `{ item, expand?, children? }` node 배열이다.
- `item`은 column, formatter, renderer, row callback, `getRowId`가 받는 업무 Row다.
- `defaultExpandAll`은 명시적 `expand` 값이 없는 node의 초기 fallback을 설정하며 기본값은 `true`다. node의 명시적 `expand`가 우선한다. mount 후 `defaultExpandAll` 변경은 controlled node 상태를 초기화하지 않는다.
- node의 `expand`는 해당 node의 직접 children을 visible pre-order row 목록에 포함할지 결정한다.
- `children`은 재귀적인 node 배열이다.
- `getRowId(item)`은 현재 접혀 있는 descendant를 포함한 모든 depth에서 전역적으로 유일하고 안정적인 id를 반환해야 한다.
- 펼침 버튼과 cell 수정은 호출자가 소유한 node를 변경하지 않고, 새 tree를 `onChangeData`로 전달한다.

Tree 정렬은 sibling 집합별 재귀 정렬이다. 부모는 항상 자신이 보이는 descendant보다 앞에 유지된다. `multiSort`를 설정하면 Flat Table과 동일한 `Shift` Header 조작으로 전체 우선순위 정렬 모델을 모든 sibling 집합에 적용한다. Summary Row는 펼침 상태와 관계없이 leaf `item`만 집계하며, 부모 값은 중복 집계를 막기 위해 제외한다.

## Ref 펼침 제어

`CominsTableRef`는 `expand(nodeIds?)`와 `fold(nodeIds?)`를 제공한다. readonly id 배열을 전달하면 여러 branch를 한 번의 controlled `onChangeData` 호출로 변경한다. 인수를 생략하면 모든 branch를 대상으로 하며 빈 배열은 아무 작업도 하지 않는다. 중복 id, 존재하지 않는 id, leaf id는 무시한다.

```tsx
tableRef.current?.expand(["engineering", "platform"]);
tableRef.current?.fold(["platform"]);
tableRef.current?.expand(); // 전체 branch 펼치기
tableRef.current?.fold(); // 전체 branch 접기
```

상위 node가 접힌 상태에서는 하위 node만 펼치는 요청을 차단한다. 접힌 상위와 하위를 함께 열어야 하면 같은 `expand` 호출의 배열에 두 id를 모두 포함한다. Flat Table에서 이 method를 호출하면 안전하게 아무 작업도 하지 않는다.

## Style, Component, Renderer

Tree Grid는 현재 Row 및 Cell 계약을 그대로 사용한다. hierarchy 기반 Row 스타일은 `rowProps.className`과 `rowProps.style`로 설정한다. `checkbox`, `select`, `toggle` 같은 기존 컬럼 `cell.components` 타입은 node의 `item`을 읽고 갱신한다. `cell.renderer`는 모든 Tree Node에 커스텀 React Component를 반환할 수 있으므로 별도 Component Row API를 추가하지 않는다.

Playground는 정확히 `10000`개 node로 구성된 고정 row-height virtualized Tree를 제공한다. Virtualization은 현재 window만 렌더링하며 hierarchy flatten과 ref 펼침은 controlled Tree 전체를 대상으로 동작한다.

## Tree Grid V1 제한

Tree Grid V1은 현재의 고정 `rowHeight` virtualized layout을 사용한다. hierarchy-aware datasource 또는 이동 계약이 필요하므로 pagination, lazy loading, infinite scrolling, row drag, row 단위 copy/paste는 의도적으로 지원하지 않는다. Cell과 range clipboard 동작은 visible `item` row 범위에서 계속 사용할 수 있다.

Tree expand는 Flat Row Expand와 다른 기능이다. 향후 Row Expand는 하나의 flat source row 아래에 detail 영역을 출력하되, flat 정렬, pagination, lazy loading, infinite scrolling, row 이동을 그대로 유지해야 한다. 따라서 variable-height layout은 별도로 설계한다. 향후 Row Grouping도 flat row 값을 기준으로 그룹을 파생하고 별도의 group expansion state를 사용한다.

`npm run dev` 실행 후 `/examples/tree-grid`에서 동작 예제를 확인할 수 있다.
