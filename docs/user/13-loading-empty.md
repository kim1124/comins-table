# Loading And Empty State

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/13-loading-empty.md) · [Playground](http://127.0.0.1:4002/examples/loading)

Starting with 0.2.2, `.render` is the standard UI customization entry point. Legacy properties remain supported throughout 0.x, with removal targeted for 1.0.0. See the [migration rules](27-migration-0.2.2.md).

Use `loading` for initial loading and refetch states. The application owns the fetch lifecycle and maps its response into controlled `data`.

<!-- comins-doc-example: fragment -->
```tsx
const [rows, setRows] = useState<PersonRow[]>([]);
const [loadingMode, setLoadingMode] = useState<"initial" | "ready" | "refetch">("initial");

async function loadRows(mode: "initial" | "ready" | "refetch", empty = false) {
  setLoadingMode(mode);
  if (mode === "initial") setRows([]);

  try {
    const response = await fetch(`/api/users?limit=30&skip=${empty ? 10000 : 0}`);
    const result = await response.json();
    setRows(result.users.map(toPersonRow));
  } finally {
    setLoadingMode("ready");
  }
}

<CominsTable
  columns={columns}
  data={rows}
  loading={loadingMode === "initial" || loadingMode === "refetch"}
  loadingContent={{ render: () => (<span>Refreshing...</span>) }}
  emptyContent={{ render: () => (<span>No rows</span>) }}
  skeletonRowCount={5}
  persistHeaderWhenEmpty
/>
```

When `loading` is true and no rows exist, the table renders skeleton rows. When rows already exist, it keeps the current rows visible and renders an overlay. When loading is false and there are no visible rows, `emptyContent.render` is rendered.

The Playground uses the same DummyJSON `/users` datasource as its Infinite Scroll example. Initial and ready requests use the first page; the Empty control maps a real out-of-range response. A production application may use any endpoint and should abort superseded requests and ignore stale responses.

Client-side Column Filtering may use the ordinary `loading` and `loadingContent.render` presentation for an already controlled dataset. It cannot be combined with Infinite Scroll, Lazy Load, `loadingMore`, or their request callbacks; remote filtering remains application-owned.
