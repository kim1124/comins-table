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
