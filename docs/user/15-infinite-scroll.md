# Infinite Scroll

Infinite Scroll은 body viewport가 하단 threshold에 가까워졌을 때 다음 row batch를 요청해 append하는 UX다.
Playground 예제는 원격 API에서 `offset` / `limit` batch를 가져오는 append-mode `lazyLoad` 흐름을 사용한다.

```tsx
function InfiniteUsersTable() {
  const loadRows = async ({ offset, limit, signal }) => {
    const params = new URLSearchParams({
      delay: "500",
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
  };

  return (
    <CominsTable
      columns={columns}
      data={[]}
      getRowId={(row) => row.id}
      lazyLoad
      lazyLoadBatchSize={40}
      lazyLoadThreshold={140}
      onLazyLoad={loadRows}
      pagination={{ pageIndex: 0, pageSize: 240 }}
      virtualized
    />
  );
}
```

## Props

| Prop | 의미 |
| --- | --- |
| `lazyLoad` | append-mode Lazy Load를 활성화한다. |
| `lazyLoadBatchSize` | 한 번에 요청할 row 수다. |
| `lazyLoadThreshold` | body viewport 하단에서 몇 px 이내에 들어왔을 때 다음 batch를 요청할지 지정한다. |
| `onLazyLoad` | `{ offset, limit, reason, signal }`을 받아 datasource 요청을 수행하고 `{ rows, total }`을 반환한다. |

append 요청 중에는 기존 row를 유지한 채 body 하단에 loading row가 표시된다. 초기 전체 로딩과 빈 데이터 표시는 `loading`, `loadingComponent`, `emptyComponent`, `skeletonRowCount`를 사용한다.

## Virtualization With Infinite Scroll

append-mode `lazyLoad`는 `virtualized`와 함께 사용할 수 있다. 이때 화면에 보이는 row만 DOM으로 유지하고, row batch는 datasource 응답 기준으로 증가시킨다.

Virtualized infinite scroll에서는 `pagination={{ pageIndex: 0, pageSize: expectedTotal }}`처럼 append 대상 전체를 한 page로 노출하는 방식이 가장 단순하다. 서버 페이지 번호, cursor, offset은 `onLazyLoad`의 datasource 계층에서 관리한다.

## Dedupe Contract

테이블은 pending lazy request가 있는 동안 같은 scroll event에서 `onLazyLoad`를 중복 호출하지 않는다. 다음 row batch가 append되고 threshold에 다시 도달하면 다음 load 요청이 가능해진다.

## Direct Controlled Mode

직접 controlled mode가 필요하면 `infiniteScroll`, `infiniteScrollThreshold`, `hasMoreRows`, `loadingMore`, `onLoadMore`를 사용할 수 있다.
이 방식에서는 테이블이 threshold 감지만 수행하고, 다음 rows append는 소비자 state에서 처리한다.

```tsx
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  hasMoreRows={rows.length < total}
  infiniteScroll
  infiniteScrollThreshold={160}
  loadingMore={loadingMore}
  onLoadMore={appendRows}
  pagination={{ pageIndex: 0, pageSize: rows.length }}
  virtualized
/>;
```

네트워크 지연, 요청 실패, retry 정책은 application data layer에서 처리한다.
