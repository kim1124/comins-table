# Viewport Datasource

![Distant Viewport loading with a bounded cache and query reset](../assets/comins-table-viewport-datasource.gif)

[English guides](README.md) · [한국어](../ko/25-viewport-datasource.md) · [Playground](http://127.0.0.1:4002/performance/viewport-datasource)

Viewport loading fetches the current scroll region without downloading earlier pages or allocating an array for the entire dataset. The application must know the total count and support stable, arbitrary index ranges. It owns networking, authentication, sorting, filtering and persistence. The Table determines which region is needed.

Use `useCominsViewport<TData>` with `rowCount`, a string or numeric `queryKey`, and `getRows`. The hook owns React state in the consuming component and returns `tableProps` containing controlled `data`, `viewportDatasource`, `onViewportRequest` and `onChangeData`. Keep columns and fetch configuration stable when their meaning has not changed.

The hook connects request results and edits to the Table, so most consumers do not need to manage the snapshot or reducer directly. Here, a snapshot is one object containing the total count, loaded blocks, and request state; a reducer helper returns the next object after an event. `tableProps` sets `virtualized: true` automatically.

<!-- comins-doc-example: fragment -->
```tsx
const viewport = useCominsViewport<Person>({
  rowCount,
  queryKey: searchRevision,
  getRows: async ({ startIndex, endIndex, signal }) => {
    const response = await fetch(
      `/api/people?offset=${startIndex}&limit=${endIndex - startIndex}`,
      { signal },
    );
    if (!response.ok) throw new Error("Unable to load rows");
    return response.json();
  },
});

<CominsTable
  {...viewport.tableProps}
  columns={columns}
  getRowId={(row) => row.id}
  getRowHeight={() => "auto"}
  estimatedRowHeight={56}
/>
```

## Requests and cache

Ranges are `[startIndex, endIndex)`. `getRows` returns a Row array with exactly that many business Rows, including a shorter final block. If the API returns an envelope such as `{ rows, total }`, extract `rows` in the callback and supply the known count through `rowCount`. Missing/null Rows and incomplete responses are errors. `AbortSignal` cancels obsolete requests; responses from earlier dataset revisions or request tokens are ignored. Failed regions show an explicit retry control. There is no automatic infinite retry or built-in HTTP/WebSocket client.

Defaults are `blockSize: 100`, `cacheSize: 12`, `maxConcurrentRequests: 2`, and `heightCacheSize: 64` blocks. Invalid positive-integer options use their defaults. The current screen and active requests can increase the effective cache requirement beyond a smaller configured limit. Heights use a separate sparse cache; evicted height history returns to the estimate on later visits. Total scroll height and thumb size are estimates until relevant Rows are measured. Whole-dataset arrays are not created.

Change `queryKey` when the search, sort, data source or index order changes. A count change also resets the dataset. Reset cancels requests and clears cached data, heights, selection and scroll position. Count and order must remain stable within one dataset revision. Fetch the count before enabling Viewport when it is initially unknown.

## Selection and editing

`getRowId` is required and must be globally stable and unique. Callback `row.dataIndex`, `row.index` and Row/Cell event `index` are absolute dataset positions. Skeletons never invoke business ID, Renderer, formatter, selection or edit callbacks. Row selection survives cache eviction by ID; `setSelectedRow(s)` accepts absolute indexes and skips unloaded Rows. Cell ranges require a contiguous loaded region. Clipboard operations do not implicitly download missing Rows or partially paste across gaps. Row insertion/movement is unavailable.

Loaded Cell edits and paste update the controlled snapshot. The hook's optional `onEdit(changes)` receives absolute-index patches. The application owns server saving and persistence of unsaved edits outside the fetch cache; reapply them in `getRows` results or confirm them on the server. A pending older response cannot overwrite a newer edit in a retained block. A newly fetched block after eviction can reflect server values unless the application preserves its edits. `onChangeData` is not a save confirmation.

## Supported combinations

Use external query controls for server sorting/filtering. Built-in Header sorting, sort Ref operations, Column Filtering and automatic Summary aggregation are disabled. Viewport supports fixed/automatic heights, Cell Renderers, pinning, column resizing and loaded-row editing. It cannot combine with Tree, Row Grouping, Row Detail, row drag, append loading or pagination. Export helpers still operate only on Rows the application explicitly supplies. Live server push is outside this mode.

## Advanced controlled integration

Advanced controlled integrations can use `CominsViewportTableProps<TData>`, `CominsViewportData<TData>`, `createCominsViewportData` and `reduceCominsViewportData` directly. The snapshot contains revision, count, blocks and bounded request state. A block carries an absolute start index and its Rows. Reducer events are `request`, `success`, `error`, `cancel`, `retain`, `patch` and `reset`. Acknowledge data and request completion together; Promise completion alone does not replace a controlled success/error update. Apply events with functional state updates to preserve independently arriving blocks. `CominsViewportOptions`, `CominsViewportDatasource`, `CominsViewportRequest` and `CominsViewportPatch` describe the hook and callback contracts.

## Playground verification

Toggle automatic height, slow responses, or failed requests. After enabling failed requests, change the query to show retry controls; disable failures and retry to resume loading. Row Drag is unavailable and its handles remain hidden, even if ordinary Row dragging is enabled elsewhere. Server-side reorder results require a new `queryKey`.
