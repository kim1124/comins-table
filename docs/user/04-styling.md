# Styling

Import `comins-table/styles.css` to use the default shell, table layout, themes, and built-in component skin.

```tsx
import "comins-table/styles.css";
```

The root class is `comins-table`. The default CSS exposes tokens such as `--comins-table-row-height`, `--comins-table-header-height`, `--comins-table-cell-height`, and `--comins-table-accent`.

```tsx
<CominsTable
  columns={columns}
  data={data}
  theme={{
    className: "comins-table-theme--mint",
    style: {
      "--comins-table-row-height": "40px",
    } as React.CSSProperties,
  }}
/>
```

When changing virtualized row height, keep `rowHeight` aligned with `--comins-table-row-height`. Styling can use `theme.className`, `theme.style`, row `className`, cell `props`, and header or cell renderer output.

The shipped themes are `comins-table-theme--basic`, `comins-table-theme--dark`, `comins-table-theme--skyblue`, `comins-table-theme--mint`, `comins-table-theme--gray`, and `comins-table-theme--orange`.
