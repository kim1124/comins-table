# Lazy Load

`lazyLoad`는 DataTable이 네트워크 구현을 직접 소유하지 않고, `onLazyLoad` callback으로 datasource 요청만 위임하는 append-mode API다.

```tsx
async function loadRows({ offset, limit, reason, signal }) {
  const params = new URLSearchParams({
    delay: "700",
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  const response = await fetch(`https://dummyjson.com/users?${params}`, { signal });
  const result = await response.json();

  return {
    rows: result.users.map(toPersonRow),
    total: result.total,
  };
}

<KmsfDataTable
  columns={columns}
  data={[]}
  emptyComponent={<span>표시할 데이터가 없습니다.</span>}
  getRowId={(row) => row.id}
  lazyLoad
  lazyLoadBatchSize={30}
  lazyLoadMode="append"
  lazyLoadThreshold={140}
  onLazyLoad={loadRows}
  pagination={{ pageIndex: 0, pageSize: 90 }}
  skeletonRowCount={5}
  virtualized
/>;
```

## Props

| Prop | 의미 |
| --- | --- |
| `lazyLoad` | append-mode datasource loading을 활성화한다. |
| `lazyLoadBatchSize` | 한 번에 요청할 row 수다. 기본값은 `30`이다. |
| `lazyLoadMode` | 현재 지원 mode는 `"append"`다. |
| `lazyLoadThreshold` | body viewport 하단에서 몇 px 이내에 들어왔을 때 append 요청을 보낼지 지정한다. |
| `onLazyLoad` | `{ offset, limit, reason, signal }`을 받아 `{ rows, total }`을 반환하는 async datasource callback이다. |

`reason`은 `"initial"`, `"scroll"`, `"refresh"` 중 하나다. 현재 built-in 자동 trigger는 initial과 scroll append이며, refresh UI는 소비자가 버튼이나 route state로 구성한다.

## Loading And Empty Integration

초기 lazy request 중 row가 없으면 기존 `loading` skeleton과 같은 형태가 출력된다. datasource가 빈 배열과 `total: 0`을 반환하면 `emptyComponent`가 출력된다.

기존 row가 있는 상태에서 소비자가 `loading={true}`를 전달하면 row는 유지되고 overlay spinner가 표시된다. append 요청 중에는 하단 loading row가 표시된다.

## Abort Contract

`onLazyLoad`는 `AbortSignal`을 받는다. route 이동, unmount, superseded request 상황에서 signal이 abort되면 stale 결과는 table rows에 반영되지 않는다.

자동화 테스트에서는 외부 API를 직접 호출하지 말고 Playwright route mock으로 응답을 고정한다.
