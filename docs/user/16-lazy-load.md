# Lazy Load

Lazy Load delegates request timing to Comins Table while the application owns rows and remote state.

```tsx
const [rows, setRows] = useState<PersonRow[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);

const loadRows = useCallback(async ({ offset, limit, reason, signal }) => {
  reason === "scroll" ? setLoadingMore(true) : setLoading(true);

  try {
    const response = await fetch(`/api/rows?offset=${offset}&limit=${limit}`, { signal });
    const result = await response.json();
    setRows((current) => reason === "scroll" ? [...current, ...result.rows] : result.rows);
    setTotal(result.total);
  } finally {
    reason === "scroll" ? setLoadingMore(false) : setLoading(false);
  }
}, []);

<CominsTable
  columns={columns}
  data={rows}
  hasMoreRows={rows.length < total}
  lazyLoad
  lazyLoadBatchSize={30}
  lazyLoadMode="append"
  lazyLoadThreshold={180}
  loading={loading}
  loadingMore={loadingMore}
  onLazyLoad={loadRows}
/>
```

`onLazyLoad` receives `offset`, `limit`, `reason`, and `AbortSignal` and returns `void | Promise<void>`. The callback fetches data and updates the controlled `data` array; Comins Table never stores callback results.

The first request uses `reason: "initial"`. Bottom-threshold requests use `reason: "scroll"` and `data.length` as the offset. A refresh control should clear the row array, set loading state, and call the same application loader with offset `0` and `reason: "refresh"`.

`hasMoreRows`, `loading`, and `loadingMore` are controlled. They stop exhausted or duplicate scroll requests and select skeleton, overlay, or bottom-loading presentation. The current `lazyLoadMode` is `"append"`.

Abort the active application fetch when its supplied signal aborts, on refresh, or on unmount. The application must prevent stale responses from replacing newer controlled rows and owns error, retry, and empty-result policy.
