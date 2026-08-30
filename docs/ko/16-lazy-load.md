# Lazy Load

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/16-lazy-load.md) · [Playground](http://127.0.0.1:4002/performance/lazy-load)

`lazyLoad`는 request 시점을 Comins Table에 위임하고, application이 Row 배열과 원격 상태를 소유하는 controlled API다.

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
  lazyLoadThreshold={140}
  loading={loading}
  loadingMore={loadingMore}
  onLazyLoad={loadRows}
  pagination={{ pageIndex: 0, pageSize: 90 }}
  skeletonRowCount={5}
  virtualized
/>;
```

## Props

| Prop | 의미 |
| --- | --- |
| `lazyLoad` | append-mode request trigger를 활성화한다. |
| `lazyLoadBatchSize` | 한 번에 요청할 Row 수다. 기본값은 `30`이다. |
| `lazyLoadMode` | 현재 지원 mode는 `"append"`다. |
| `lazyLoadThreshold` | body viewport 하단에서 몇 px 이내에 들어왔을 때 scroll 요청을 보낼지 지정한다. |
| `onLazyLoad` | `{ offset, limit, reason, signal }`을 받고 application state를 갱신하는 `void | Promise<void>` callback이다. |
| `data` | application이 소유하고 Table이 렌더링하는 controlled Row 배열이다. |
| `hasMoreRows` | `false`이면 추가 scroll 요청을 중단한다. |
| `loading` | Row가 없으면 skeleton, 기존 Row가 있으면 overlay를 표시한다. |
| `loadingMore` | 중복 scroll 요청을 막고 하단 loading Row를 표시한다. |

`reason`은 `"initial"`, `"scroll"`, `"refresh"` 중 하나다. Table의 자동 trigger는 initial과 scroll이며, scroll offset은 현재 `data.length`다. Refresh 버튼은 Row 배열을 먼저 비우고 application loader를 `offset: 0`, `reason: "refresh"`로 직접 호출한다.

Comins Table은 callback 반환값을 저장하지 않는다. Callback이 fetch 결과를 replace/append하고 `total` 기반 `hasMoreRows`, `loading`, `loadingMore`를 갱신해야 한다.

## Abort 및 오류 계약

전달된 `AbortSignal`, refresh, unmount 시 application fetch를 취소한다. 늦게 도착한 응답이 더 최신 controlled Row를 덮어쓰지 않도록 application이 stale request를 차단한다. 오류, retry와 빈 결과 UI도 application이 소유한다.
