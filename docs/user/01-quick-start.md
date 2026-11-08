# Quick Start

<!-- comins-restriction: ssr-hydration -->

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/01-quick-start.md) · [Playground](http://127.0.0.1:4002/docs/getting-started)

Install Comins Table with React and React DOM.

```bash
npm install comins-table react react-dom
```

Import the component and the optional default stylesheet.

<!-- comins-doc-example: compile=quick-start -->
```tsx
import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";

type PersonRow = {
  age: number;
  id: string;
  name: string;
  role: string;
};

const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
  { field: "role", label: "Role" },
];

export function PeopleTable() {
  const [data, setData] = useState<PersonRow[]>([
    { age: 31, id: "p-1", name: "Alpha", role: "Admin" },
  ]);

  return (
    <CominsTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
    />
  );
}
```

`CominsTable` is controlled. Your application owns `data`; table-side edits call `onChangeData`, and your state update renders the next table state.

## Server rendering and hydration

React 18/19 can render the initial Table HTML with `renderToString` and hydrate it with `hydrateRoot`. Import the packaged CSS on the client. This supports conventional React SSR; Next.js App Router, React Server Components and streaming SSR integrations are not validated.

<!-- comins-doc-example: fragment -->
```tsx
// Server: App includes the Table and the application's initial data.
import { renderToString } from "react-dom/server";
const html = renderToString(<App />, { identifierPrefix: "table-page-" });
```

<!-- comins-doc-example: fragment -->
```tsx
// Client: use the same App, initial data and identifierPrefix.
import { hydrateRoot } from "react-dom/client";
import "comins-table/styles.css";
hydrateRoot(document.getElementById("root")!, <App />, {
  identifierPrefix: "table-page-",
  onRecoverableError: console.error,
});
```

- Keep initial `data`, columns, state, loading flags, dimensions and renderer output identical on the server and client. Restore the application's initial data before hydration. Use stable Row IDs. Do not read browser-only values, current time or randomness while rendering; custom renderers and formatters must also be server-safe.
- Use the same `identifierPrefix` for each server/client root pair, and distinct prefixes for independent roots. Multiple Tables within one root receive distinct IDs automatically.
- The server performs no DOM measurement or Lazy Load requests. A virtualized Table renders its initial estimated window, not all 100,000 Rows. Auto-height and viewport-dependent geometry settle after hydration; use consistent height estimates and CSS/`rowHeight` values to reduce shifts.
- Empty and loading content is present in server HTML. Selection, editing, filters, tooltip/portal interactions and requests require client JavaScript. Server rendering does not fire event or request callbacks or fetch the Rows for you. Render-time functions such as `getRowId`, `getRowHeight`, renderers, formatters and props resolvers do execute on the server.
- Validation covers DOM-free Node rendering, HTML with JavaScript disabled, hydration with DOM reuse, sorting and unmount in React 18.3.1/19.3.0 on Chromium. It does not establish support for other frameworks or browsers.
