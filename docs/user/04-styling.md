# Styling

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/04-styling.md) · [Sizing](http://127.0.0.1:4002/examples/size) · [Theme](http://127.0.0.1:4002/examples/theme)

Import `comins-table/styles.css` to use the default shell, table layout, themes, and built-in component skin.

```tsx
import "comins-table/styles.css";
```

The root class is `comins-table`. The default CSS exposes tokens such as `--comins-table-row-height`, `--comins-table-header-height`, `--comins-table-cell-height`, `--comins-table-group-row-background`, `--comins-table-group-row-color`, and `--comins-table-accent`.

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

When changing virtualized row height, keep `rowHeight` aligned with `--comins-table-row-height`. Styling can use `theme.className`, `theme.style`, Row and Group Row `className`/`style`, Cell `props`, and Header or Cell renderer output.

The shipped themes are `comins-table-theme--basic`, `comins-table-theme--dark`, `comins-table-theme--skyblue`, `comins-table-theme--mint`, `comins-table-theme--gray`, and `comins-table-theme--orange`.
