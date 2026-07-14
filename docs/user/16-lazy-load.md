# Lazy Load

Lazy Load delegates async data loading to `onLazyLoad`.

```tsx
<CominsTable
  columns={columns}
  data={data}
  lazyLoad
  lazyLoadBatchSize={30}
  lazyLoadMode="append"
  lazyLoadThreshold={180}
  onLazyLoad={async ({ offset, limit, reason, signal }) => {
    const response = await fetch(`/api/rows?offset=${offset}&limit=${limit}`, { signal });
    return response.json();
  }}
/>
```

`onLazyLoad` receives `offset`, `limit`, `reason`, and `AbortSignal`. Return `{ rows, total }` to append a batch and let the table decide whether more data can be requested.

The first public release supports append-mode lazy loading through `lazyLoadMode: "append"`.
