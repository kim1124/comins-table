# Infinite Scroll

Enable controlled append loading with `infiniteScroll`.

```tsx
<CominsTable
  columns={columns}
  data={data}
  hasMoreRows={hasMoreRows}
  infiniteScroll
  infiniteScrollThreshold={160}
  loadingMore={loadingMore}
  onLoadMore={loadNextPage}
/>
```

When the body viewport gets close to the bottom, Comins Table calls `onLoadMore`. The application fetches more rows, appends them to `data`, updates `hasMoreRows`, and clears `loadingMore`.

`infiniteScrollThreshold` is measured in pixels from the bottom of the table body viewport.

Set a synchronous request guard before starting the Promise. This prevents repeated scroll events from racing React state propagation before `loadingMore` is rendered. Abort an active application request when refreshing or unmounting.

Infinite Scroll and Lazy Load have different ownership:

- Controlled Infinite Scroll keeps `rows`, offsets, cancellation, `hasMoreRows`, and `loadingMore` in application state. Comins Table only emits `onLoadMore`.
- Lazy Load lets Comins Table request `{ offset, limit, reason, signal }` batches through `onLazyLoad` and append the returned Rows.

Network failure and retry policy remain application-owned in both modes.
