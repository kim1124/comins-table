# Infinite Scroll

Infinite Scroll은 body viewport가 하단 threshold에 가까워졌을 때 다음 row batch를 요청해 append하는 UX다.
Playground 예제는 소비자가 `rows`, 원격 요청, offset, 취소를 직접 소유하는 controlled 흐름을 사용한다.

```tsx
function InfiniteUsersTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const pendingRequestRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetchNextBatch({ offset: 0, limit: 40, signal: controller.signal }).then((result) => {
      setRows(result.rows);
      setTotal(result.total);
    });

    return () => controller.abort();
  }, []);

  const appendRows = async () => {
    if (pendingRequestRef.current || rows.length >= total) return;

    pendingRequestRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchNextBatch({ offset: rows.length, limit: 40 });
      setRows((current) => [...current, ...result.rows]);
      setTotal(result.total);
    } finally {
      pendingRequestRef.current = false;
      setLoadingMore(false);
    }
  };

  return (
    <CominsTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      hasMoreRows={rows.length < total}
      infiniteScroll
      infiniteScrollThreshold={140}
      loadingMore={loadingMore}
      onLoadMore={() => void appendRows()}
      pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, 40) }}
      virtualized
    />
  );
}
```

## Props

| Prop | 의미 |
| --- | --- |
| `infiniteScroll` | controlled 하단 threshold 감지를 활성화한다. |
| `infiniteScrollThreshold` | body viewport 하단에서 몇 px 이내에 들어왔을 때 다음 batch를 요청할지 지정한다. |
| `hasMoreRows` | `false`가 되면 추가 요청을 중단한다. |
| `loadingMore` | 중복 요청을 막고 body 하단 loading row를 표시한다. |
| `onLoadMore` | threshold에 도달했을 때 소비자의 append callback을 호출한다. |

Promise를 시작하기 전에 동기식 ref guard를 설정해야 React가 `loadingMore`를 반영하기 전 반복 scroll event가 요청을 중복 생성하지 않는다. 갱신과 unmount 시에는 진행 중인 application 요청을 취소한다.

## Infinite Scroll과 Lazy Load

- Controlled Infinite Scroll은 application이 `rows`, offset, 취소, `hasMoreRows`, `loadingMore`를 소유하고 Table은 `onLoadMore`만 호출한다.
- Lazy Load는 Table이 `onLazyLoad`를 통해 `{ offset, limit, reason, signal }`을 전달하고 application이 controlled `data`, `hasMoreRows`, loading 상태를 갱신한다.

두 방식 모두 네트워크 실패와 retry 정책은 application data layer에서 처리한다.
